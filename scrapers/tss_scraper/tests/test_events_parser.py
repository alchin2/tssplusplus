from tools.events_parser import parse_days, parse_sched

LECTURE_WITH_FINAL = (
    "M, W, F 08:00 AM - 08:50 AM In Person @ Peterson Hall Room 110\n"
    "Final Examination 12/07/2026 08:00 AM - 10:59 AM In Person"
)

DISCUSSION_NO_FINAL = "W 04:00 PM - 04:50 PM In Person @ Mandeville Center Room B-104"


def test_parses_lecture_with_final_exam():
    result = parse_sched(LECTURE_WITH_FINAL)

    assert result["days"] == ["M", "W", "F"]
    assert result["start_time"] == "08:00 AM"
    assert result["end_time"] == "08:50 AM"
    assert result["modality"] == "In Person"
    assert result["location"] == "Peterson Hall Room 110"
    assert result["raw"] == LECTURE_WITH_FINAL

    final_exam = result["final_exam"]
    assert final_exam is not None
    assert final_exam["date"] == "2026-12-07"
    assert final_exam["start_time"] == "08:00 AM"
    assert final_exam["end_time"] == "10:59 AM"
    assert final_exam["modality"] == "In Person"
    assert final_exam["location"] is None


def test_parses_discussion_with_no_final_exam():
    result = parse_sched(DISCUSSION_NO_FINAL)

    assert result["days"] == ["W"]
    assert result["start_time"] == "04:00 PM"
    assert result["end_time"] == "04:50 PM"
    assert result["modality"] == "In Person"
    assert result["location"] == "Mandeville Center Room B-104"
    assert result["final_exam"] is None
    assert result["raw"] == DISCUSSION_NO_FINAL


def test_parses_concatenated_days_without_commas():
    result = parse_sched("TuTh 09:00 AM - 10:20 AM In Person @ Center Hall Room 101")
    assert result["days"] == ["Tu", "Th"]


def test_parses_meeting_with_no_location():
    result = parse_sched("M, W 01:00 PM - 01:50 PM Remote Synchronous")
    assert result["days"] == ["M", "W"]
    assert result["modality"] == "Remote Synchronous"
    assert result["location"] is None


def test_empty_sched_returns_all_none_but_no_crash():
    result = parse_sched("")
    assert result["days"] == []
    assert result["start_time"] is None
    assert result["final_exam"] is None
    assert result["raw"] == ""


def test_none_sched_does_not_crash():
    result = parse_sched(None)
    assert result["raw"] == ""
    assert result["start_time"] is None


def test_unrecognized_meeting_line_falls_back_gracefully():
    garbage = "To Be Arranged"
    result = parse_sched(garbage)

    assert result["days"] == []
    assert result["start_time"] is None
    assert result["modality"] is None
    assert result["location"] is None
    assert result["final_exam"] is None
    assert result["raw"] == garbage


def test_final_exam_with_explicit_location():
    sched = (
        "Tu 02:00 PM - 02:50 PM In Person @ Center Hall Room 101\n"
        "Final Examination 12/09/2026 03:00 PM - 05:59 PM In Person @ Center Hall Room 101"
    )
    result = parse_sched(sched)
    assert result["final_exam"]["location"] == "Center Hall Room 101"


def test_parse_days_direct():
    assert parse_days("M, W, F") == ["M", "W", "F"]
    assert parse_days("MWF") == ["M", "W", "F"]
    assert parse_days("TuTh") == ["Tu", "Th"]
    assert parse_days("Sa") == ["Sa"]
    assert parse_days("Su, M") == ["Su", "M"]
