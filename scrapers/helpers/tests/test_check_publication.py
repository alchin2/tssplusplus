from datetime import date

from check_publication import newly_published_quarter, parse_publication_dates

# Mirrors Blink's real layout: two year tables, a decoy row, dates
# footnoted with "*", and TBA/n-a cells that must be skipped.
PUBLICATION_HTML = """
<table>
  <tr><th>Future quarter build</th><th>Fall 2025</th><th>Winter 2026</th><th>Spring 2026</th><th>Summer 2026</th></tr>
  <tr><td>A.Scheduling Office sends notice</td><td>2/14/2025</td><td>6/18/2025</td><td>9/4/2025</td><td>n/a</td></tr>
  <tr><td>E.Schedule of Classes is available online</td><td>5/20/2025</td><td>11/5/2025</td><td>2/6/2026</td><td>3/19/2026</td></tr>
</table>
<table>
  <tr><th>Future quarter build</th><th>Fall 2026</th><th>Winter 2027</th><th>Spring 2027</th><th>Summer 2027</th></tr>
  <tr><td>A.Scheduling Office sends notice</td><td>3/11/2026</td><td>7/1/2026*</td><td>9/3/2026</td><td>n/a</td></tr>
  <tr><td>E.Schedule of Classes is available online</td><td>7/10/2026*</td><td>11/5/2026*</td><td>TBA</td><td>TBA</td></tr>
</table>
"""


def test_parse_collects_dates_across_both_tables():
    dates = parse_publication_dates(PUBLICATION_HTML)
    assert dates["Fall 2025"] == date(2025, 5, 20)
    assert dates["Spring 2026"] == date(2026, 2, 6)
    assert dates["Fall 2026"] == date(2026, 7, 10)  # trailing "*" stripped
    assert dates["Winter 2027"] == date(2026, 11, 5)


def test_parse_skips_tba_cells():
    dates = parse_publication_dates(PUBLICATION_HTML)
    assert "Spring 2027" not in dates
    assert "Summer 2027" not in dates


def test_parse_ignores_non_target_rows():
    # The "A. ..." row also has dates; only the "available online" row counts.
    dates = parse_publication_dates(PUBLICATION_HTML)
    assert dates["Fall 2025"] == date(2025, 5, 20)  # not 2/14/2025 from row A


def test_parse_no_matching_row_returns_empty():
    assert parse_publication_dates("<table><tr><th>x</th></tr></table>") == {}


DATES = {"Fall 2026": date(2026, 7, 10), "Winter 2027": date(2026, 11, 5)}


def test_day_after_publication_returns_quarter():
    assert newly_published_quarter(DATES, date(2026, 7, 11)) == "Fall 2026"


def test_publication_day_itself_is_not_a_match():
    assert newly_published_quarter(DATES, date(2026, 7, 10)) is None


def test_two_days_after_is_not_a_match():
    assert newly_published_quarter(DATES, date(2026, 7, 12)) is None


def test_matches_the_right_quarter_among_several():
    assert newly_published_quarter(DATES, date(2026, 11, 6)) == "Winter 2027"


def test_no_quarter_published_yesterday_returns_none():
    assert newly_published_quarter(DATES, date(2026, 1, 1)) is None


def test_empty_dates_returns_none():
    assert newly_published_quarter({}, date(2026, 7, 11)) is None
