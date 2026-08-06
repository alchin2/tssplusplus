from unittest.mock import patch

from app.prereqs import build_prereq_tree

CATALOG = {
    "CSE100": {
        "name": "Advanced Data Structures",
        "code": "CSE 100",
        "prerequisites": [
            {
                "type": "AND",
                "items": [
                    {"type": "COURSE", "course_id": "CSE 12"},
                    {"type": "COURSE", "course_id": "MATH 20C"},
                ],
            }
        ],
    },
    "MATH20C": {
        "name": "Calculus III",
        "code": "MATH 20C",
        "prerequisites": [{"type": "AND", "items": [{"type": "COURSE", "course_id": "MATH 20B"}]}],
    },
    "MATH20B": {
        "name": "Calculus II",
        "code": "MATH 20B",
        "prerequisites": [],
    },
    "CSE101": {
        "name": "Algorithm Design",
        "code": "CSE 101",
        "prerequisites": [
            {
                "type": "AND",
                "items": [
                    {
                        "type": "OR",
                        "items": [
                            {"type": "COURSE", "course_id": "CSE 21"},
                            {"type": "COURSE", "course_id": "MATH 15A"},
                        ],
                    }
                ],
            }
        ],
    },
    "COURSEA": {
        "name": "Course A",
        "code": "COURSE A",
        "prerequisites": [{"type": "AND", "items": [{"type": "COURSE", "course_id": "COURSE B"}]}],
    },
    "COURSEB": {
        "name": "Course B",
        "code": "COURSE B",
        "prerequisites": [{"type": "AND", "items": [{"type": "COURSE", "course_id": "COURSE A"}]}],
    },
}


def _fake_lookup(normalized_code: str) -> dict | None:
    return CATALOG.get(normalized_code)


def _build(code: str):
    with patch("app.prereqs.find_by_normalized_code", side_effect=_fake_lookup):
        return build_prereq_tree(CATALOG[code.replace(" ", "")])


def test_root_and_nested_and_resolve_full_names_and_types():
    tree = _build("CSE100")

    assert tree.type == "ROOT"
    assert tree.code == "CSE 100"
    assert tree.name == "Advanced Data Structures"
    # CSE 12 isn't in the fake catalog, so it stays as the space-less
    # normalized lookup key; MATH 20C resolves to its pretty catalog code.
    assert [c.code for c in tree.children] == ["CSE12", "MATH 20C"]

    math20c = tree.children[1]
    assert math20c.type == "CHILD"
    assert math20c.name == "Calculus III"
    assert [c.code for c in math20c.children] == ["MATH 20B"]

    # MATH 20B is a real, resolved leaf with no further prereqs.
    math20b = math20c.children[0]
    assert math20b.name == "Calculus II"
    assert math20b.children == []


def test_unresolved_course_gets_null_name_and_no_children():
    tree = _build("CSE100")
    cse12 = tree.children[0]

    assert cse12.code == "CSE12"
    assert cse12.name is None
    assert cse12.children == []


def test_or_group_becomes_child_node_with_alternatives():
    tree = _build("CSE101")

    assert len(tree.children) == 1
    or_node = tree.children[0]
    assert or_node.code == "OR"
    assert or_node.name is None
    # Neither alternative is in the fake catalog, so both stay space-less.
    assert [c.code for c in or_node.children] == ["CSE21", "MATH15A"]
    assert all(c.name is None for c in or_node.children)


def test_cycle_guard_stops_recursion_and_still_resolves_name():
    tree = _build("COURSEA")

    assert tree.code == "COURSE A"
    course_b = tree.children[0]
    assert course_b.code == "COURSE B"
    assert course_b.name == "Course B"

    # COURSE B's own prereq (COURSE A) would recurse back to the root --
    # the visited-set guard cuts it off as a childless leaf instead of
    # looping forever, but it still gets its name resolved.
    cycle_leaf = course_b.children[0]
    assert cycle_leaf.code == "COURSE A"
    assert cycle_leaf.name == "Course A"
    assert cycle_leaf.children == []
