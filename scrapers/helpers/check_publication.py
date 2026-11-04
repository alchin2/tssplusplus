"""
Checks whether a new quarter's Schedule of Classes has gone live and
still needs scraping, so a GitHub Actions cron can rebuild the catalog
the day after each term opens instead of on a hardcoded date.

Parses the "E. Schedule of Classes is available online" row of UCSD's
Blink publication schedule -- one date per quarter column, across the
two year tables -- and reports run=true (plus the quarter label) to
$GITHUB_OUTPUT when a quarter went online between 1 and CATCH_UP_DAYS
days ago (America/Los_Angeles) and isn't yet listed in SCRAPED_FILE.

The window (rather than "exactly yesterday") absorbs GitHub's scheduled
run delays, which routinely push a cron hours late; SCRAPED_FILE keeps a
quarter from being scraped again on every day of that window.

Running it:
  python3 check_publication.py                          # check
  python3 check_publication.py --mark-scraped "Winter 2027"  # record a finished scrape
"""

import argparse
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

PUBLICATION_URL = "https://blink.ucsd.edu/instructors/courses/schedule-of-classes/publication.html"
PACIFIC = ZoneInfo("America/Los_Angeles")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
# One quarter label per line, appended once that quarter's scrape succeeds.
SCRAPED_FILE = PROJECT_ROOT / "data" / "scraped_quarters.txt"

# Blink quarter column season -> the term code prefix the scrapers, backend
# and frontend use (TSS_TERM, e.g. "Winter 2027" -> "wi27").
SEASON_PREFIXES = {"fall": "fa", "winter": "wi", "spring": "sp", "summer": "su"}

# How many days after going online a quarter is still picked up, so a
# late or failed run (e.g. a dead cookie) is retried on following days.
CATCH_UP_DAYS = 7

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


def pending_quarter(dates: dict[str, date], today: date, scraped: set[str]) -> str | None:
    """Returns the most recently published quarter that went online 1 to
    CATCH_UP_DAYS days before today and isn't in scraped, or None."""
    pending = [
        (published, quarter)
        for quarter, published in dates.items()
        if quarter not in scraped
        and published + timedelta(days=1) <= today <= published + timedelta(days=CATCH_UP_DAYS)
    ]
    return max(pending)[1] if pending else None


def quarter_term(quarter: str) -> str | None:
    """"Winter 2027" -> "wi27", or None if the label isn't "<Season> <Year>"."""
    parts = quarter.split()
    if len(parts) != 2 or parts[0].lower() not in SEASON_PREFIXES or not parts[1].isdigit():
        return None
    return f"{SEASON_PREFIXES[parts[0].lower()]}{parts[1][-2:]}"


def read_scraped(path: Path = SCRAPED_FILE) -> set[str]:
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def mark_scraped(quarter: str, path: Path = SCRAPED_FILE) -> None:
    if quarter in read_scraped(path):
        return
    with open(path, "a", encoding="utf-8") as f:
        f.write(f"{quarter}\n")


def fetch_publication_html() -> str:
    resp = requests.get(PUBLICATION_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def write_github_output(run: bool, quarter: str | None, term: str | None) -> None:
    out = os.environ.get("GITHUB_OUTPUT")
    if not out:
        return
    with open(out, "a", encoding="utf-8") as f:
        f.write(f"run={'true' if run else 'false'}\n")
        if quarter:
            f.write(f"quarter={quarter}\n")
        if term:
            f.write(f"term={term}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mark-scraped", metavar="QUARTER",
                        help=f"record QUARTER as scraped in {SCRAPED_FILE.relative_to(PROJECT_ROOT)} and exit")
    args = parser.parse_args()

    if args.mark_scraped:
        mark_scraped(args.mark_scraped)
        print(f"Marked {args.mark_scraped} as scraped.")
        return

    dates = parse_publication_dates(fetch_publication_html())
    if not dates:
        sys.exit("Could not find any 'Schedule of Classes is available online' dates -- Blink layout may have changed.")

    today = datetime.now(PACIFIC).date()
    print(f"Today (America/Los_Angeles): {today.isoformat()}")
    print("Schedule of Classes availability dates:")
    for quarter, published in dates.items():
        print(f"  {quarter}: {published.isoformat()}")

    scraped = read_scraped()
    quarter = pending_quarter(dates, today, scraped)
    term = quarter_term(quarter) if quarter else None
    if quarter and not term:
        sys.exit(f"Can't derive a term code from Blink's quarter label {quarter!r} -- update SEASON_PREFIXES.")
    if quarter:
        print(f"{quarter} ({term}) went online {dates[quarter].isoformat()} and hasn't been scraped -- running the catalog pipeline.")
    else:
        print(f"No unscraped quarter went online in the last {CATCH_UP_DAYS} days -- nothing to do.")

    write_github_output(quarter is not None, quarter, term)


if __name__ == "__main__":
    main()
