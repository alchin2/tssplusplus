from unittest.mock import MagicMock, patch

import tools.sections as sections_module
from tools.sections import (
    PAGE_SIZE,
    build_course_document,
    fetch_events,
    group_events_into_sections,
    scrape_course_sections,
)

# The exact row pasted into the task brief, from MATH-010B (ModuleID='2494').
LECTURE_ROW = {
    "AcYear": "2026",
    "AcPeriod": "2",
    "ModuleID": "2494",
    "EventID": "E 00001532",
    "EventObjid": "1532",
    "BeginDate": "2026-09-25",
    "EndDate": "2026-12-07",
    "TeachingMethod": "LE",
    "TeachingMethod_Text": "Lecture",
    "EventKey": "001",
    "InstructorName": "Michael Holst",
    "InstructorEmail": "mailto: MHOLST@UCSD.EDU",
    "LocationText": "UC San Diego",
    "Status": "Scheduled",
    "EventAbbr": "001-000-LE",
    "Limit": "128",
    "Sched": (
        "M, W, F 08:00 AM - 08:50 AM In Person @ Peterson Hall Room 110\n"
        "Final Examination 12/07/2026 08:00 AM - 10:59 AM In Person"
    ),
    "EventPkgObjid": "152356",
    "EventPkgDisplayID": "SE00152356",
    "EventPkgText": "MATH-010B (P-001-001)",
    "EventPkgLimit": "16",
    "EventPkgSeatsAvailable": "16",
    "EventPkgNumOnWaitl": 0,
}

# Same package (P-001-001 / EventPkgObjid 152356) paired with its
# discussion event instead of the lecture -- per the task brief, one
# package spans multiple rows, one per paired event.
DISCUSSION_ROW = {
    **LECTURE_ROW,
    "EventID": "E 00001535",
    "EventObjid": "1535",
    "TeachingMethod": "DI",
    "TeachingMethod_Text": "Discussion",
    "EventKey": "002",
    "InstructorName": "Jane TA",
    "InstructorEmail": "mailto: JTA@UCSD.EDU",
    "EventAbbr": "002-000-DI",
    "Limit": "20",
    "Sched": "W 04:00 PM - 04:50 PM In Person @ Mandeville Center Room B-104",
}

# A second, distinct section (different package) for the same course.
OTHER_SECTION_ROW = {
    **LECTURE_ROW,
    "EventID": "E 00001540",
    "EventObjid": "1540",
    "EventKey": "001",
    "EventAbbr": "001-000-LE",
    "EventPkgObjid": "152400",
    "EventPkgDisplayID": "SE00152400",
    "EventPkgText": "MATH-010B (P-002-001)",
    "EventPkgLimit": "16",
    "EventPkgSeatsAvailable": "3",
    "EventPkgNumOnWaitl": 2,
}


def make_response(records):
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = {"value": records}
    return resp


# --- group_events_into_sections -------------------------------------------


def test_groups_math_010b_rows_into_two_sections():
    sections = group_events_into_sections([LECTURE_ROW, DISCUSSION_ROW, OTHER_SECTION_ROW])

    assert len(sections) == 2

    p001 = next(s for s in sections if s["event_pkg_objid"] == "152356")
    assert p001["section_code"] == "P-001-001"
    assert p001["section_label"] == "MATH-010B (P-001-001)"
    assert p001["event_pkg_display_id"] == "SE00152356"
    assert p001["limit"] == 16
    assert p001["seats_available"] == 16
    assert p001["num_on_waitlist"] == 0
    assert len(p001["meetings"]) == 2

    p002 = next(s for s in sections if s["event_pkg_objid"] == "152400")
    assert p002["section_code"] == "P-002-001"
    assert p002["seats_available"] == 3
    assert p002["num_on_waitlist"] == 2
    assert len(p002["meetings"]) == 1


def test_section_meetings_carry_parsed_sched_and_instructor_info():
    sections = group_events_into_sections([LECTURE_ROW, DISCUSSION_ROW])
    meetings = sections[0]["meetings"]

    lecture = next(m for m in meetings if m["teaching_method"] == "LE")
    assert lecture["teaching_method_text"] == "Lecture"
    assert lecture["instructor_name"] == "Michael Holst"
    assert lecture["instructor_email"] == "MHOLST@UCSD.EDU"
    assert lecture["days"] == ["M", "W", "F"]
    assert lecture["start_time"] == "08:00 AM"
    assert lecture["location"] == "Peterson Hall Room 110"
    assert lecture["final_exam"]["date"] == "2026-12-07"
    assert lecture["room_limit"] == 128

    discussion = next(m for m in meetings if m["teaching_method"] == "DI")
    assert discussion["instructor_name"] == "Jane TA"
    assert discussion["days"] == ["W"]
    assert discussion["location"] == "Mandeville Center Room B-104"
    assert discussion["final_exam"] is None


def test_group_events_into_sections_empty_input():
    assert group_events_into_sections([]) == []


# --- build_course_document --------------------------------------------------


def test_build_course_document_includes_raw_and_sections():
    rows = [LECTURE_ROW, DISCUSSION_ROW]
    doc = build_course_document("2494", "2026", "2", rows, subject="MATH", code="010B", title="Calculus")

    assert doc["module_id"] == "2494"
    assert doc["peryr"] == "2026"
    assert doc["perid"] == "2"
    assert doc["subject"] == "MATH"
    assert doc["code"] == "010B"
    assert doc["title"] == "Calculus"
    assert doc["raw"] == rows
    assert len(doc["sections"]) == 1


# --- fetch_events (pagination) ----------------------------------------------


@patch("tools.sections.get")
def test_fetch_events_issues_correct_request(mock_get, monkeypatch):
    monkeypatch.setattr(sections_module.time, "sleep", lambda s: None)
    mock_get.return_value = make_response([LECTURE_ROW])

    session = object()
    result = fetch_events(session, "2026", "2", "2494")

    assert result == [LECTURE_ROW]
    key = "AcademicYear='2026',AcademicPeriod='2',ModuleID='2494'"
    mock_get.assert_called_once_with(
        session,
        f"YUCSD_CON_MODULE({key})/_sections",
        {"$top": PAGE_SIZE, "$skip": 0},
    )


@patch("tools.sections.get")
def test_fetch_events_walks_multiple_pages(mock_get, monkeypatch):
    monkeypatch.setattr(sections_module.time, "sleep", lambda s: None)
    page1 = [dict(LECTURE_ROW, EventObjid=str(i)) for i in range(PAGE_SIZE)]
    page2 = [DISCUSSION_ROW]
    mock_get.side_effect = [make_response(page1), make_response(page2)]

    result = fetch_events(object(), "2026", "2", "2494")

    assert result == page1 + page2
    assert mock_get.call_count == 2
    skips = [c.args[2]["$skip"] for c in mock_get.call_args_list]
    assert skips == [0, PAGE_SIZE]


@patch("tools.sections.get")
def test_fetch_events_stops_on_empty_page(mock_get, monkeypatch):
    monkeypatch.setattr(sections_module.time, "sleep", lambda s: None)
    mock_get.side_effect = [make_response([]), ]

    result = fetch_events(object(), "2026", "2", "9999")

    assert result == []
    mock_get.assert_called_once()


# --- scrape_course_sections (fetch + build) ---------------------------------


@patch("tools.sections.get")
def test_scrape_course_sections_fetches_and_groups(mock_get, monkeypatch):
    monkeypatch.setattr(sections_module.time, "sleep", lambda s: None)
    mock_get.return_value = make_response([LECTURE_ROW, DISCUSSION_ROW])

    doc = scrape_course_sections(object(), "2026", "2", "2494", subject="MATH", code="010B")

    assert doc["module_id"] == "2494"
    assert len(doc["sections"]) == 1
    assert len(doc["raw"]) == 2
