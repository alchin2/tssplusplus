"""
Full transitive prerequisite tree for one course, ported from
ClassGraph's data/helpers/ast.py + astclass.py
(https://github.com/nehalc200/classgraph/tree/main/data/helpers, see
designdoc.md's Prerequisite viewer section): each catalog course's own
2-level AND/OR/COURSE prereq tree (already stored per course in
data/catalog/<CODE>.json) is resolved recursively, walking into every
referenced course's own prerequisites in turn.

ClassGraph's per-course/per-department recursion-depth caps
(RECURSION_CONFIG in its ast.py) don't carry over: those existed
because ClassGraph precomputed full department-wide trees ahead of
time and needed to bound output size. This builds one course's graph
per request instead, so the only guard needed is the `visited` set
below, which prevents infinite recursion on a real cycle (a course
whose prereqs transitively depend on itself) without capping
legitimate depth.
"""

from app.catalog import find_by_normalized_code, normalize_code
from app.schemas import PrereqGraphNode


def _prereq_items(prerequisites: list[dict]) -> list[dict]:
    """catalog_scraper's json_parser.build_prereq_tree always wraps a
    course's prereqs in a single top-level AND node (a 0-or-1-element
    list) -- unwrap it to the flat list of COURSE/OR items, so AND is
    implicit across the list, same shape ClassGraph's find_children
    expects."""
    if not prerequisites:
        return []
    node = prerequisites[0]
    return node.get("items", []) if node.get("type") == "AND" else prerequisites


def _resolve_course_node(course_id: str, visited: set[str]) -> PrereqGraphNode:
    """One COURSE leaf/subtree. `visited` holds every course already on
    this path from the root -- if `course_id` is already in it, this is
    a cycle, so it's emitted as a leaf instead of being expanded again
    (mirrors ClassGraph's find_children: `if course_id in visited:
    clist.append(ChildNode(course_id, [])); continue`)."""
    course = find_by_normalized_code(course_id)
    # Display the catalog's pretty code ("CSE 12") when resolved, not
    # the space-less normalized lookup key -- only unresolved codes
    # (no catalog match) fall back to the raw normalized form.
    code = course["code"] if course else course_id
    name = course["name"] if course else None

    if course_id in visited:
        return PrereqGraphNode(code=code, type="CHILD", name=name, children=[])

    items = _prereq_items(course["prerequisites"]) if course else []
    if not items:
        return PrereqGraphNode(code=code, type="CHILD", name=name, children=[])

    children = _build_children(items, visited | {course_id})
    return PrereqGraphNode(code=code, type="CHILD", name=name, children=children)


def _build_children(items: list[dict], visited: set[str]) -> list[PrereqGraphNode]:
    children = []
    for item in items:
        item_type = item.get("type")

        if item_type == "COURSE":
            course_id = normalize_code(item.get("course_id"))
            children.append(_resolve_course_node(course_id, visited))

        elif item_type == "OR":
            # An OR group is its own CHILD node (code="OR") whose
            # children are the alternatives -- matches ClassGraph's
            # `clist.append(ChildNode("OR", sublist))`.
            or_children = [
                _resolve_course_node(normalize_code(opt.get("course_id")), visited)
                for opt in item.get("items", [])
                if opt.get("type") == "COURSE"
            ]
            children.append(PrereqGraphNode(code="OR", type="CHILD", children=or_children))

    return children


def build_prereq_tree(course: dict) -> PrereqGraphNode:
    """Builds the full transitive prerequisite tree for one catalog
    course dict (as returned by app.catalog), rooted at that course."""
    root_code = normalize_code(course["code"])
    items = _prereq_items(course.get("prerequisites", []))
    children = _build_children(items, visited={root_code})
    return PrereqGraphNode(code=course["code"], type="ROOT", name=course["name"], children=children)
