from tools.json_parser import build_prereq_tree, is_major_code

# Short helpers for the AND/OR/COURSE dict shape build_prereq_tree returns.
def COURSE(code):
    return {"type": "COURSE", "course_id": code}


def OR(*codes):
    return {"type": "OR", "items": [COURSE(c) for c in codes]}


def AND(*items):
    return {"type": "AND", "items": list(items)}


# --- basic parsing -----------------------------------------------------------

def test_single_course():
    assert build_prereq_tree("CSE 12") == AND(COURSE("CSE12"))


def test_and_of_courses():
    assert build_prereq_tree("CSE 12 and CSE 15L") == AND(COURSE("CSE12"), COURSE("CSE15L"))


def test_or_binds_tighter_than_and():
    # "A and B or C" -> A and (B or C)
    tree = build_prereq_tree("MATH 20A and MATH 20B or MATH 10B")
    assert tree == AND(COURSE("MATH20A"), OR("MATH20B", "MATH10B"))


def test_shared_department_carries_across_numbers():
    # "MATH 20A or 20B" -> the dept is filled in for the bare number.
    assert build_prereq_tree("MATH 20A or 20B") == AND(OR("MATH20A", "MATH20B"))


def test_range_expands_to_individual_courses():
    # A "20A-B-C" range expands to its three course codes; with no explicit
    # operator between them they land in a single group (an OR).
    assert build_prereq_tree("MATH 20A-B-C") == AND(OR("MATH20A", "MATH20B", "MATH20C"))


def test_none_and_empty_return_none():
    assert build_prereq_tree("none") is None
    assert build_prereq_tree("") is None


def test_semicolon_cuts_trailing_notes():
    tree = build_prereq_tree("CSE 8B or CSE 11; restricted to undergraduates.")
    assert tree == AND(OR("CSE8B", "CSE11"))


# --- GPA / score decimals must not leak courses ------------------------------

def test_gpa_of_decimal_is_stripped():
    # "GPA of 3.0" once produced a stray "0" that glued onto "Diego" -> DIEGO0.
    raw = (
        "lower-division standing, completion of thirty units of UC San Diego "
        "undergraduate study, a minimum UC San Diego GPA of 3.0, and a completed "
        "and approved Learning Agreement for Special Studies."
    )
    assert build_prereq_tree(raw) is None


def test_number_first_gpa_is_stripped():
    # "2.5 GPA" once produced WITH2/WITH5 from "...with 2.5 GPA".
    assert build_prereq_tree("upper-division standing, with 2.5 GPA (overall).") is None


def test_real_prereq_kept_when_gpa_note_follows():
    tree = build_prereq_tree("CHEM 6B or 6BH. Restricted to the following major codes: CH25.")
    assert tree == AND(OR("CHEM6B", "CHEM6BH"))


# --- enrollment-restriction / major-code clauses -----------------------------

def test_restricted_with_major_code_only():
    raw = "restricted to bioengineering graduate students with major code BE75. (F)"
    assert build_prereq_tree(raw) is None


def test_open_to_clause_is_cut():
    raw = "PHYS 4A and 2CL. Open to major codes PY26, PY28, PY29."
    assert build_prereq_tree(raw) == AND(COURSE("PHYS4A"), COURSE("PHYS2CL"))


def test_must_be_enrolled_in_program_is_cut():
    assert build_prereq_tree("must be enrolled in MPH program (PB75, PB87, PB90).") is None


def test_leading_major_code_phrase_is_dropped():
    assert build_prereq_tree("ED25 major and upper-division standing.") is None


# --- major-code filter (2 letters + 2 digits, unknown department) ------------

def test_is_major_code_distinguishes_real_departments():
    assert is_major_code("BE75") is True   # BE is not a real course subject
    assert is_major_code("ED78") is True
    assert is_major_code("PH40") is False  # PH is a real department
    assert is_major_code("SE87") is False  # SE is a real department
    assert is_major_code("CSE12") is False  # 3 letters -> not the major shape


def test_cross_listed_course_is_kept():
    # LTSP is a real subject that just isn't scraped into its own file.
    assert build_prereq_tree("LTSP 50A or LTSP 50B, or consent of instructor.") == AND(
        OR("LTSP50A", "LTSP50B")
    )


# --- prose false positives ---------------------------------------------------

def test_self_reference_is_dropped():
    # A course is never its own prerequisite.
    tree = build_prereq_tree("BISP 198 must be completed with approval.", course_code="BISP 198")
    assert tree is None


def test_the_is_not_a_department():
    # "...the 198 will be completed" must not parse as course "THE 198".
    assert build_prereq_tree("Paperwork must be submitted before the 198 begins.") is None
