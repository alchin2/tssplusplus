from datetime import date

from check_pass_window import active_pass, parse_pass_windows

# Mirrors Blink's real layout: an <h2> quarter heading, three pass blocks
# (proving the scan isn't hardcoded to two), a "Second Pass" heading split
# across <strong> tags with an &nbsp;, and a rowspan sub-row with a merged
# "Booking Window" cell (only 4 <td>s) that shifts columns.
ENROLLMENT_HTML = """
<h2><strong>Fall Quarter 2026</strong></h2>
<h3><strong>First Pass (continuing students):</strong></h3>
<table>
  <tr><th>Booking Window</th><th>Code</th><th>Start Date</th><th>Start Time</th><th>End Date (10:59PM)</th></tr>
  <tr><td>Priority</td><td>PRI</td><td>July 22, 2026</td><td>10:00AM</td><td>August 14, 2026</td></tr>
  <tr><td>SE3B</td><td>July 29, 2026</td><td>2:00PM</td><td>August 14, 2026</td></tr>
</table>
<h3><strong>Second Pass&#160;</strong><strong>(continuing students)</strong><strong>:</strong></h3>
<table>
  <tr><th>Booking Window</th><th>Code</th><th>Start Date</th><th>Start Time</th><th>End Date (10:59PM)</th></tr>
  <tr><td>Priority</td><td>PRI</td><td>August 17, 2026</td><td>10:00AM</td><td>August 26, 2026</td></tr>
  <tr><td>First-Year(continuing)</td><td>FRE</td><td>August 21, 2026</td><td>2:00PM</td><td>August 26, 2026</td></tr>
</table>
<h3><strong>Third Pass (continuing students):</strong></h3>
<table>
  <tr><th>Booking Window</th><th>Code</th><th>Start Date</th><th>Start Time</th><th>End Date (10:59PM)</th></tr>
  <tr><td>Priority</td><td>PRI</td><td>September 1, 2026</td><td>10:00AM</td><td>September 5, 2026</td></tr>
</table>
"""


def test_parses_every_pass_block_generically():
    windows = parse_pass_windows(ENROLLMENT_HTML)
    names = [w[0] for w in windows]
    assert names == [
        "First Pass (continuing students)",
        "Second Pass (continuing students)",  # reassembled from split <strong>s
        "Third Pass (continuing students)",
    ]


def test_window_is_min_start_to_max_end_per_block():
    windows = dict((name, (start, end)) for name, start, end in parse_pass_windows(ENROLLMENT_HTML))
    assert windows["First Pass (continuing students)"] == (date(2026, 7, 22), date(2026, 8, 14))
    assert windows["Second Pass (continuing students)"] == (date(2026, 8, 17), date(2026, 8, 26))
    assert windows["Third Pass (continuing students)"] == (date(2026, 9, 1), date(2026, 9, 5))


def test_no_pass_headings_returns_empty():
    assert parse_pass_windows("<h3>Something else</h3><table><tr><td>x</td></tr></table>") == []


WINDOWS = [
    ("First Pass", date(2026, 7, 22), date(2026, 8, 14)),
    ("Second Pass", date(2026, 8, 17), date(2026, 8, 26)),
]


def test_today_inside_first_pass():
    assert active_pass(WINDOWS, date(2026, 8, 10))[0] == "First Pass"


def test_today_inside_second_pass():
    assert active_pass(WINDOWS, date(2026, 8, 20))[0] == "Second Pass"


def test_start_and_end_are_inclusive():
    assert active_pass(WINDOWS, date(2026, 7, 22))[0] == "First Pass"
    assert active_pass(WINDOWS, date(2026, 8, 14))[0] == "First Pass"
    assert active_pass(WINDOWS, date(2026, 8, 26))[0] == "Second Pass"


def test_gap_between_passes_is_inactive():
    assert active_pass(WINDOWS, date(2026, 8, 15)) is None
    assert active_pass(WINDOWS, date(2026, 8, 16)) is None


def test_before_and_after_all_passes_is_inactive():
    assert active_pass(WINDOWS, date(2026, 7, 21)) is None
    assert active_pass(WINDOWS, date(2026, 8, 27)) is None


def test_empty_windows_is_inactive():
    assert active_pass([], date(2026, 8, 20)) is None
