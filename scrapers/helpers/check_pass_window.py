"""
Checks whether today falls inside any active UCSD enrollment pass, so a
GitHub Actions cron can re-scrape live section/seat data nightly only
while continuing students are actually booking.

Scans UCSD's Blink enrollment start page for every "<Ordinal> Pass
(continuing students)" heading -- First, Second, and any future pass --
and reads the booking table beneath each one. A pass runs from the
earliest Start Date to the latest End Date in its own table; the passes
don't merge (there's a gap between them), so each block is measured on
its own. Reports run=true (plus the pass name) to $GITHUB_OUTPUT when
today (America/Los_Angeles) is inside any block's window.

Running it:
  python3 check_pass_window.py
"""

import os
import re
import sys
from datetime import date, datetime
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

ENROLLMENT_URL = "https://blink.ucsd.edu/instructors/courses/enrollment/start.html"
PACIFIC = ZoneInfo("America/Los_Angeles")

# Matches "First Pass (continuing students)", "Second Pass (continuing
# students)", etc. -- generic on the ordinal so a future "Third Pass"
# is picked up without a code change. \s absorbs the &nbsp; Blink puts
# between "Pass" and the parenthetical.
PASS_HEADING_RE = re.compile(r"\w+\s+Pass\s*\(continuing students\)", re.I)
HEADING_TAG_RE = re.compile(r"^h[1-6]$")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}


def _parse_date(text: str) -> date | None:
    try:
        return datetime.strptime(text.strip(), "%B %d, %Y").date()
    except ValueError:
        return None


def _table_dates(table) -> list[date]:
    return [d for cell in table.find_all(["td", "th"]) if (d := _parse_date(cell.get_text()))]


def parse_pass_windows(html: str) -> list[tuple[str, date, date]]:
    """Returns (pass name, start, end) for each pass block, where start is
    the earliest and end the latest date in that block's booking table.

    Every date cell in a block is a Start Date or an End Date, and each
    row's start precedes its end, so the block's earliest cell is its
    earliest start and its latest cell its latest end. Taking min/max over
    all cells sidesteps the merged "Booking Window" cells that otherwise
    shift columns row to row."""
    soup = BeautifulSoup(html, "html.parser")
    windows: list[tuple[str, date, date]] = []

    for heading in soup.find_all(HEADING_TAG_RE):
        match = PASS_HEADING_RE.search(" ".join(heading.get_text().split()))
        if not match:
            continue
        table = heading.find_next("table")
        if table is None:
            continue
        dates = _table_dates(table)
        if dates:
            windows.append((match.group(0), min(dates), max(dates)))

    return windows


def active_pass(windows: list[tuple[str, date, date]], today: date) -> tuple[str, date, date] | None:
    """Returns the first pass window containing today (inclusive), or None."""
    for name, start, end in windows:
        if start <= today <= end:
            return name, start, end
    return None


def fetch_enrollment_html() -> str:
    resp = requests.get(ENROLLMENT_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def write_github_output(run: bool, pass_name: str | None) -> None:
    out = os.environ.get("GITHUB_OUTPUT")
    if not out:
        return
    with open(out, "a", encoding="utf-8") as f:
        f.write(f"run={'true' if run else 'false'}\n")
        if pass_name:
            f.write(f"pass={pass_name}\n")


def main() -> None:
    windows = parse_pass_windows(fetch_enrollment_html())
    if not windows:
        sys.exit("Could not find any enrollment pass windows -- Blink layout may have changed.")

    today = datetime.now(PACIFIC).date()
    print(f"Today (America/Los_Angeles): {today.isoformat()}")
    print("Enrollment pass windows:")
    for name, start, end in windows:
        print(f"  {name}: {start.isoformat()} -> {end.isoformat()}")

    active = active_pass(windows, today)
    if active:
        print(f"Today is inside {active[0]} -- running the section scrape.")
    else:
        print("Today is outside every enrollment pass -- nothing to do.")

    write_github_output(active is not None, active[0] if active else None)


if __name__ == "__main__":
    main()
