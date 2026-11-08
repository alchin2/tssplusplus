import re

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.errors import PyMongoError

from app.catalog import find_by_normalized_code, normalize_code, offered_module_id, search_courses
from app.db import get_courses_collection
from app.offered import get_code_to_module_id_index, get_offered_index
from app.prereqs import build_prereq_tree
from app.schemas import CourseDetail, CourseSummary, Meeting, PrereqGraphNode, Section
from app.terms import selected_term

router = APIRouter(prefix="/api/courses", tags=["courses"])

# Section code is the parenthesized suffix of EventPkgText, e.g.
# "MATH-010B (P-001-001)" -> "P-001-001". Mirrors tss_scraper's
# tools/sections.py SECTION_CODE_RE.
_SECTION_CODE_RE = re.compile(r"\(([^()]+)\)\s*$")

# TSS's own detail page for one event package -- where a student books
# that section. Reverse-engineered from the Fiori hash TSS navigates to;
# the zero/empty-GUID segments are constant across courses and sections.
_TSS_BOOK_URL = (
    "https://tss.ucsd.edu/fiori#ZUSModule-display?TileType=MYMOD&/Detail/EventPackage/SM/"
    "{module_id}/00000000/0/0/0/00000000-0000-0000-0000-000000000000/{pkg_objid}/{peryr}/{perid}/"
)


@router.get("", response_model=list[CourseSummary])
def list_courses(
    dept: str | None = Query(None, description="Department code, e.g. CSE"),
    offered: bool | None = Query(None, description="Filter to courses offered in the term"),
    q: str | None = Query(None, description="Search term matched against course code/name"),
    term: str = Depends(selected_term),
):
    """GET /api/courses?term=fa26&dept=CSE&offered=true&q=<query> --
    search/filter over the catalog, returning a lightweight course list
    with offered/module_id relative to the term."""
    code_to_module_id = get_code_to_module_id_index(term)
    courses = search_courses(code_to_module_id, dept=dept, offered=offered, q=q)
    summaries = []
    for c in courses:
        module_id = offered_module_id(c, code_to_module_id)
        summaries.append(CourseSummary(
            module_id=module_id,
            code=c["code"],
            name=c["name"],
            dept=c["dept"],
            offered_this_qtr=module_id is not None,
        ))
    return summaries


def _to_int(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _tss_book_url(module_id: str, peryr: str | None, perid: str | None, pkg_objid: str | None) -> str | None:
    """Deep link to the section's TSS booking page, or None when any id
    it needs is missing (e.g. a document scraped without peryr/perid)."""
    if not (peryr and perid and pkg_objid):
        return None
    return _TSS_BOOK_URL.format(module_id=module_id, pkg_objid=pkg_objid, peryr=peryr, perid=perid)


def _group_sections(raw_rows: list[dict], module_id: str, peryr: str | None, perid: str | None) -> list[Section]:
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
                book_url=_tss_book_url(module_id, peryr, perid, pkg_objid),
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


def _resolve_catalog_course(module_id: str, term: str) -> dict:
    """module_id's only link to a catalog code: look it up in the term's
    offered-courses CSV (module_id -> code), then find that code's
    catalog entry."""
    offered_entry = get_offered_index(term).get(module_id)
    if offered_entry is None:
        raise HTTPException(status_code=404, detail=f"No course offered in {term} with module_id={module_id}")

    catalog_course = find_by_normalized_code(normalize_code(offered_entry["code"]))
    if catalog_course is None:
        raise HTTPException(status_code=404, detail=f"module_id={module_id} has no matching catalog entry")

    return catalog_course


@router.get("/{module_id}", response_model=CourseDetail)
def get_course_detail(module_id: str, term: str = Depends(selected_term)):
    """GET /api/courses/{module_id}?term=fa26 -- full detail: catalog
    fields (joined via the term's offered-courses CSV, module_id's only
    link to a catalog code) + the term's live sections/meetings from
    Mongo."""
    catalog_course = _resolve_catalog_course(module_id, term)

    try:
        mongo_doc = get_courses_collection(term).find_one({"module_id": module_id})
    except PyMongoError as exc:
        # Mongo unreachable/misconfigured (e.g. Atlas TLS handshake or
        # server-selection timeout) -- surface a clean 503 rather than a
        # raw 500, since live sections can't be served without it.
        raise HTTPException(
            status_code=503, detail="Section data is temporarily unavailable (database unreachable)"
        ) from exc
    sections = (
        _group_sections(mongo_doc["raw"], module_id, mongo_doc.get("peryr"), mongo_doc.get("perid"))
        if mongo_doc and mongo_doc.get("raw")
        else []
    )

    return CourseDetail(
        module_id=module_id,
        code=catalog_course["code"],
        name=catalog_course["name"],
        dept=catalog_course["dept"],
        offered_this_qtr=True,  # resolved via the term's offered CSV
        description=catalog_course.get("description"),
        raw_prereq=catalog_course.get("raw_prereq"),
        prerequisites=catalog_course.get("prerequisites", []),
        sections=sections,
    )


@router.get("/{module_id}/prereqs", response_model=PrereqGraphNode)
def get_course_prereqs(module_id: str, term: str = Depends(selected_term)):
    """GET /api/courses/{module_id}/prereqs?term=fa26 -- full transitive
    prerequisite graph (see app/prereqs.py). Built fresh from the local
    catalog on every request -- cheap enough (no Mongo round trip) that
    caching isn't worth the staleness risk."""
    catalog_course = _resolve_catalog_course(module_id, term)
    return build_prereq_tree(catalog_course)

