"""
Checks whether a new quarter's Schedule of Classes went live yesterday,
so a GitHub Actions cron can rebuild the catalog the day after each term
opens instead of on a hardcoded date.

Parses the "E. Schedule of Classes is available online" row of UCSD's
Blink publication schedule -- one date per quarter column, across the
two year tables -- and reports run=true (plus the quarter label) to
$GITHUB_OUTPUT when today (America/Los_Angeles) is the day after any of
those dates.

Running it:
  python3 check_publication.py
"""

import os
import sys
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

PUBLICATION_URL = "https://blink.ucsd.edu/instructors/courses/schedule-of-classes/publication.html"
PACIFIC = ZoneInfo("America/Los_Angeles")

# The row we want, identified by its label cell rather than position --
# Blink prefixes it "E." with no space ("E.Schedule of Classes...").
AVAILABLE_ONLINE_LABEL = "schedule of classes is available online"

# Blink footnotes some dates with a trailing "*" and leaves unscheduled
# quarters as "TBA"/"n/a".
NON_DATES = {"", "tba", "n/a"}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}


def _cell_text(cell) -> str:
    return " ".join(cell.get_text().split())


def _parse_date(text: str) -> date | None:
    cleaned = text.strip().rstrip("*").strip()
    if cleaned.lower() in NON_DATES:
        return None
    try:
        return datetime.strptime(cleaned, "%m/%d/%Y").date()
    except ValueError:
        return None


def parse_publication_dates(html: str) -> dict[str, date]:
    """Maps each quarter column (e.g. "Fall 2026") to the date its
    Schedule of Classes goes online, scanning every table on the page and
    skipping TBA/unparseable cells."""
    soup = BeautifulSoup(html, "html.parser")
    dates: dict[str, date] = {}

    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if not rows:
            continue
        quarters = [_cell_text(c) for c in rows[0].find_all(["th", "td"])][1:]

        for row in rows[1:]:
            cells = row.find_all(["th", "td"])
            if not cells or AVAILABLE_ONLINE_LABEL not in _cell_text(cells[0]).lower():
                continue
            for quarter, cell in zip(quarters, [_cell_text(c) for c in cells[1:]]):
                parsed = _parse_date(cell)
                if parsed:
                    dates[quarter] = parsed

    return dates


def newly_published_quarter(dates: dict[str, date], today: date) -> str | None:
    """Returns the quarter whose Schedule of Classes went online yesterday
    (today == published + 1 day), or None."""
    for quarter, published in dates.items():
        if today == published + timedelta(days=1):
            return quarter
    return None


def fetch_publication_html() -> str:
    resp = requests.get(PUBLICATION_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def write_github_output(run: bool, quarter: str | None) -> None:
    out = os.environ.get("GITHUB_OUTPUT")
    if not out:
        return
    with open(out, "a", encoding="utf-8") as f:
        f.write(f"run={'true' if run else 'false'}\n")
        if quarter:
            f.write(f"quarter={quarter}\n")


def main() -> None:
    dates = parse_publication_dates(fetch_publication_html())
    if not dates:
        sys.exit("Could not find any 'Schedule of Classes is available online' dates -- Blink layout may have changed.")

    today = datetime.now(PACIFIC).date()
    print(f"Today (America/Los_Angeles): {today.isoformat()}")
    print("Schedule of Classes availability dates:")
    for quarter, published in dates.items():
        print(f"  {quarter}: {published.isoformat()}")

    quarter = newly_published_quarter(dates, today)
    if quarter:
        print(f"{quarter} went online yesterday -- running the catalog pipeline.")
    else:
        print("No quarter went online yesterday -- nothing to do.")

    write_github_output(quarter is not None, quarter)


if __name__ == "__main__":
    main()
