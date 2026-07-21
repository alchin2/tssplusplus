"""
Sections/meetings scraper: for one course (identified by its Smobjid,
used directly as ModuleID -- confirmed, see events_parser.py's docstring
and the task notes this was built against), fetches the flat
YUCSD_CON_EVENTS rows from YUCSD_CON_MODULE(...)/_sections and groups
them into real enrollable sections.

The API returns one row per (event, package) pairing -- an "event" is a
single meeting pattern (a lecture time slot, a discussion time slot),
identified by EventObjid, while a "package" (EventPkgObjid) is the real
enrollable section, and can appear paired with more than one event (e.g.
a lecture + its discussion). Grouping by EventPkgObjid reconstructs the
section: each row in a group becomes one of that section's meetings.
"""

import re
import time

import requests

from tools.events_parser import parse_sched
from tools.session import get

PAGE_SIZE = 100
REQUEST_DELAY_SEC = 0.3

# Section code is the parenthesized suffix of EventPkgText, e.g.
# "MATH-010B (P-001-001)" -> "P-001-001".
SECTION_CODE_RE = re.compile(r"\(([^()]+)\)\s*$")


def fetch_events(session: requests.Session, peryr: str, perid: str, module_id: str) -> list[dict]:
    """Paginates YUCSD_CON_MODULE(...)/_sections for one course, returning
    the flat YUCSD_CON_EVENTS rows exactly as the API returns them."""
    key = f"AcademicYear='{peryr}',AcademicPeriod='{perid}',ModuleID='{module_id}'"
    records = []
    skip = 0
    while True:
        resp = get(
            session,
            f"YUCSD_CON_MODULE({key})/_sections",
            {"$top": PAGE_SIZE, "$skip": skip},
        )
        resp.raise_for_status()
        page = resp.json().get("value", [])
        if not page:
            break

        records.extend(page)

        if len(page) < PAGE_SIZE:
            break

        skip += PAGE_SIZE
        time.sleep(REQUEST_DELAY_SEC)

    return records


def _to_int(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _build_meeting(row: dict) -> dict:
    email = (row.get("InstructorEmail") or "").replace("mailto:", "").strip() or None
    meeting = parse_sched(row.get("Sched"))
    meeting.update(
        {
            "event_objid": row.get("EventObjid"),
            "event_id": row.get("EventID"),
            "teaching_method": row.get("TeachingMethod"),
            "teaching_method_text": row.get("TeachingMethod_Text"),
            "instructor_name": row.get("InstructorName"),
            "instructor_email": email,
            "status": row.get("Status"),
            "begin_date": row.get("BeginDate"),
            "end_date": row.get("EndDate"),
            "room_limit": _to_int(row.get("Limit")),
        }
    )
    return meeting


def _build_section(pkg_objid: str | None, rows: list[dict]) -> dict:
    first = rows[0]
    section_text = first.get("EventPkgText") or ""
    code_match = SECTION_CODE_RE.search(section_text)
    return {
        "event_pkg_objid": pkg_objid,
        "event_pkg_display_id": first.get("EventPkgDisplayID"),
        "section_label": first.get("EventPkgText"),
        "section_code": code_match.group(1) if code_match else None,
        "limit": _to_int(first.get("EventPkgLimit")),
        "seats_available": _to_int(first.get("EventPkgSeatsAvailable")),
        "num_on_waitlist": _to_int(first.get("EventPkgNumOnWaitl")),
        "meetings": [_build_meeting(row) for row in rows],
    }


def group_events_into_sections(rows: list[dict]) -> list[dict]:
    """Groups flat YUCSD_CON_EVENTS rows by EventPkgObjid into one
    section record per real enrollable section, each carrying the list
    of event rows (meetings) paired with that package."""
    groups: dict[str | None, list[dict]] = {}
    for row in rows:
        groups.setdefault(row.get("EventPkgObjid"), []).append(row)

    return [_build_section(pkg_objid, group_rows) for pkg_objid, group_rows in groups.items()]


def build_course_document(
    module_id: str,
    peryr: str,
    perid: str,
    rows: list[dict],
    subject: str | None = None,
    code: str | None = None,
    title: str | None = None,
) -> dict:
    """Builds the one-document-per-course-per-term shape: grouped
    sections/meetings plus the untouched raw rows, so a grouping or
    parsing mistake can be fixed by reprocessing `raw` instead of
    re-scraping."""
    return {
        "module_id": module_id,
        "peryr": peryr,
        "perid": perid,
        "subject": subject,
        "code": code,
        "title": title,
        "sections": group_events_into_sections(rows),
        "raw": rows,
    }


def scrape_course_sections(
    session: requests.Session,
    peryr: str,
    perid: str,
    module_id: str,
    subject: str | None = None,
    code: str | None = None,
    title: str | None = None,
) -> dict:
    """Fetches and builds the full course document for one course."""
    rows = fetch_events(session, peryr, perid, module_id)
    return build_course_document(module_id, peryr, perid, rows, subject=subject, code=code, title=title)
