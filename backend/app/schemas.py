from __future__ import annotations

from pydantic import BaseModel


class PrereqNode(BaseModel):
    """Mirrors catalog_scraper's 2-level prerequisite AST shape:
    {type: "AND"|"OR"|"COURSE", items: [...], course_id: "..."}."""

    type: str
    items: list["PrereqNode"] | None = None
    course_id: str | None = None


class PrereqGraphNode(BaseModel):
    """GET /api/courses/{module_id}/prereqs -- the resolved, transitive
    tree, ported from ClassGraph's RootNode/ChildNode (see
    app/prereqs.py). `type` is "ROOT" for the single root node and
    "CHILD" for everything else, including OR-group containers (an OR
    group is a CHILD node with code=="OR" and its alternatives as
    children) -- matching ClassGraph's to_dict() shape exactly. `name`
    is the catalog title, joined in server-side so the frontend graph
    doesn't need a lookup per node; null for an OR node and for a code
    that doesn't resolve to a catalog course."""

    code: str
    type: str
    name: str | None = None
    children: list["PrereqGraphNode"] = []


class Meta(BaseModel):
    """GET /api/meta -- term + catalog-wide facts the frontend needs
    up front (department dropdown, home-page counts)."""

    term: str
    depts: list[str]
    course_count: int
    offered_count: int


class CourseSummary(BaseModel):
    """GET /api/courses list item -- lightweight, per the design doc.
    module_id is present only for courses offered this term (it comes
    from the offered-courses CSV); null otherwise."""

    module_id: str | None = None
    code: str
    name: str
    dept: str
    offered_this_qtr: bool


class Meeting(BaseModel):
    event_objid: str | None = None
    teaching_method: str | None = None
    teaching_method_text: str | None = None
    instructor_name: str | None = None
    instructor_email: str | None = None
    location: str | None = None
    sched: str | None = None
    begin_date: str | None = None
    end_date: str | None = None


class Section(BaseModel):
    event_pkg_objid: str | None = None
    section_code: str | None = None
    section_label: str | None = None
    limit: int | None = None
    seats_available: int | None = None
    num_on_waitlist: int | None = None
    meetings: list[Meeting] = []


class CourseDetail(BaseModel):
    """GET /api/courses/{module_id} -- catalog fields + live
    sections/meetings, per the design doc."""

    module_id: str
    code: str
    name: str
    dept: str
    offered_this_qtr: bool
    description: str | None = None
    raw_prereq: str | None = None
    prerequisites: list[PrereqNode] = []
    sections: list[Section] = []


class Building(BaseModel):
    """GET /api/buildings entry -- one per building name found in scraped
    meeting locations (see scrapers/build_buildings.py). abbr/name/lat/lng
    come from UCSD's public GIS Building Points layer."""

    abbr: str | None = None
    name: str | None = None
    lat: float | None = None
    lng: float | None = None


class RouteResult(BaseModel):
    """GET /api/route -- a walking route through an ordered list of stops.
    geometry is (lat, lng) pairs in Leaflet's order (already flipped from
    ORS's GeoJSON lng/lat)."""

    geometry: list[list[float]]
    distance_m: float | None = None
    duration_s: float | None = None
