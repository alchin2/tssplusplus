import re

from fastapi import APIRouter, HTTPException, Query
from pymongo.errors import PyMongoError

from app.catalog import find_by_normalized_code, normalize_code, search_courses
from app.db import get_courses_collection
from app.offered import get_code_to_module_id_index, get_offered_index
from app.prereqs import build_prereq_tree
from app.schemas import CourseDetail, CourseSummary, Meeting, PrereqGraphNode, Section

router = APIRouter(prefix="/api/courses", tags=["courses"])

# Section code is the parenthesized suffix of EventPkgText, e.g.
# "MATH-010B (P-001-001)" -> "P-001-001". Mirrors tss_scraper's
# tools/sections.py SECTION_CODE_RE.
_SECTION_CODE_RE = re.compile(r"\(([^()]+)\)\s*$")


@router.get("", response_model=list[CourseSummary])
def list_courses(
    dept: str | None = Query(None, description="Department code, e.g. CSE"),
    offered: bool | None = Query(None, description="Filter to courses offered this quarter"),
    q: str | None = Query(None, description="Search term matched against course code/name"),
):
    """GET /api/courses?dept=CSE&offered=true&q=<query> -- search/filter
    over the catalog, returning a lightweight course list."""
    courses = search_courses(dept=dept, offered=offered, q=q)
    code_to_module_id = get_code_to_module_id_index()
    return [
        CourseSummary(
            module_id=code_to_module_id.get(normalize_code(c["code"])),
            code=c["code"],
            name=c["name"],
            dept=c["dept"],
            offered_this_qtr=c["offered_this_qtr"],
        )
        for c in courses
    ]


def _to_int(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _group_sections(raw_rows: list[dict]) -> list[Section]:
    """Groups flat YUCSD_CON_EVENTS rows by EventPkgObjid into real
    enrollable sections, one Meeting per row in the group. Same
    grouping key as tools/sections.py's group_events_into_sections."""
    groups: dict[str | None, list[dict]] = {}
    for row in raw_rows:
        groups.setdefault(row.get("EventPkgObjid"), []).append(row)

    sections = []
    for pkg_objid, rows in groups.items():
        first = rows[0]
        section_text = first.get("EventPkgText") or ""
        code_match = _SECTION_CODE_RE.search(section_text)
        sections.append(
            Section(
                event_pkg_objid=pkg_objid,
                section_code=code_match.group(1) if code_match else None,
                section_label=first.get("EventPkgText"),
                limit=_to_int(first.get("EventPkgLimit")),
                seats_available=_to_int(first.get("EventPkgSeatsAvailable")),
                num_on_waitlist=_to_int(first.get("EventPkgNumOnWaitl")),
                meetings=[
                    Meeting(
                        event_objid=row.get("EventObjid"),
                        teaching_method=row.get("TeachingMethod"),
                        teaching_method_text=row.get("TeachingMethod_Text"),
                        instructor_name=row.get("InstructorName"),
                        instructor_email=(row.get("InstructorEmail") or "").replace("mailto:", "").strip() or None,
                        location=row.get("LocationText"),
                        sched=row.get("Sched"),
                        begin_date=row.get("BeginDate"),
                        end_date=row.get("EndDate"),
                    )
                    for row in rows
                ],
            )
        )
    return sections


def _resolve_catalog_course(module_id: str) -> dict:
    """module_id's only link to a catalog code: look it up in the
    offered-courses CSV (module_id -> code), then find that code's
    catalog entry."""
    offered_entry = get_offered_index().get(module_id)
    if offered_entry is None:
        raise HTTPException(status_code=404, detail=f"No course offered this term with module_id={module_id}")

    catalog_course = find_by_normalized_code(normalize_code(offered_entry["code"]))
    if catalog_course is None:
        raise HTTPException(status_code=404, detail=f"module_id={module_id} has no matching catalog entry")

    return catalog_course


@router.get("/{module_id}", response_model=CourseDetail)
def get_course_detail(module_id: str):
    """GET /api/courses/{module_id} -- full detail: catalog fields
    (joined via the offered-courses CSV, module_id's only link to a
    catalog code) + live sections/meetings from Mongo."""
    catalog_course = _resolve_catalog_course(module_id)

    try:
        mongo_doc = get_courses_collection().find_one({"module_id": module_id})
    except PyMongoError as exc:
        # Mongo unreachable/misconfigured (e.g. Atlas TLS handshake or
        # server-selection timeout) -- surface a clean 503 rather than a
        # raw 500, since live sections can't be served without it.
        raise HTTPException(
            status_code=503, detail="Section data is temporarily unavailable (database unreachable)"
        ) from exc
    sections = _group_sections(mongo_doc["raw"]) if mongo_doc and mongo_doc.get("raw") else []

    return CourseDetail(
        module_id=module_id,
        code=catalog_course["code"],
        name=catalog_course["name"],
        dept=catalog_course["dept"],
        offered_this_qtr=catalog_course["offered_this_qtr"],
        description=catalog_course.get("description"),
        raw_prereq=catalog_course.get("raw_prereq"),
        prerequisites=catalog_course.get("prerequisites", []),
        sections=sections,
    )


@router.get("/{module_id}/prereqs", response_model=PrereqGraphNode)
def get_course_prereqs(module_id: str):
    """GET /api/courses/{module_id}/prereqs -- full transitive
    prerequisite graph (see app/prereqs.py). Built fresh from the local
    catalog on every request -- cheap enough (no Mongo round trip) that
    caching isn't worth the staleness risk."""
    catalog_course = _resolve_catalog_course(module_id)
    return build_prereq_tree(catalog_course)

