from tools.course_scraper import parse_course_code, split_heading


def test_plain_code_is_unchanged():
    assert parse_course_code("CSE 12") == "CSE 12"


def test_labeled_prefix_moves_to_front():
    assert parse_course_code("Linguistics/Spanish (LISP) 1A") == "LISP 1A"
    assert parse_course_code("Linguistics/American Sign Language (LISL) 1AX") == "LISL 1AX"


def test_labeled_prefix_without_slash():
    assert parse_course_code("Linguistics (LIDS) 19") == "LIDS 19"


def test_labeled_prefix_keeps_number_list():
    assert parse_course_code("Linguistics/Spanish (LISP) 5A, 5B, 5C") == "LISP 5A, 5B, 5C"


def test_parentheses_not_followed_by_a_number_are_left_alone():
    # A heading whose title ran into the code part (missing period).
    code = "COMM 1M CSI: Communication and the Law (4)"
    assert parse_course_code(code) == code
    assert parse_course_code("Foo (BAR) Seminar") == "Foo (BAR) Seminar"


def test_split_heading_at_the_period():
    assert split_heading("CSE 12. Basic Data Structures (4)") == ("CSE 12", "Basic Data Structures")
    assert split_heading("Linguistics/Spanish (LISP) 1A. Beginning Spanish (2.5)") == ("LISP 1A", "Beginning Spanish")


def test_split_heading_missing_the_period_after_the_code():
    assert split_heading("SOCI 123 Japanese Culture Inside/Out: A Transnational Perspective (4)") == (
        "SOCI 123", "Japanese Culture Inside/Out: A Transnational Perspective"
    )
    assert split_heading("GPCO 468: Evaluating Technological Innovation (4)") == (
        "GPCO 468", "Evaluating Technological Innovation"
    )
    assert split_heading("HIUS 178/278 The Atlantic World, 1400–1800 (4)") == (
        "HIUS 178/278", "The Atlantic World, 1400–1800"
    )
