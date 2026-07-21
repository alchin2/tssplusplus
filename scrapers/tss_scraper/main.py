"""
TSS scraper CLI.

Default: reads data/offered/<term>.csv (built by --titles-only) and
scrapes every listed course's real sections+meetings for the term (via
sections.py, grouping YUCSD_CON_EVENTS rows by package), upserting one
document per course into MongoDB.

--titles-only: fetches course titles via YUCSD_I_SM_TITLE and writes
module_id/code/name to data/offered/<term>.csv, skipping sections
entirely. Run this first (and re-run it to refresh the list) -- the
default mode reads this file instead of re-fetching titles every run.

Setup:
  1. Log into https://tss.ucsd.edu/fiori in Chrome as normal.
  2. DevTools (F12) -> Network -> Fetch/XHR -> reload the page once.
  3. Click any request to tss.ucsd.edu, copy the "cookie" request
     header's full value into a new file called cookie.txt, next to
     this script. Don't share that file with anyone -- it's your login.
  4. pip install -r requirements.txt
  5. python3 main.py

Sessions expire. If you start getting a clear "session expired" error,
redo steps 1-3.
"""

import argparse
import csv
import re
import sys
import time
from pathlib import Path

import requests

from tools.sections import REQUEST_DELAY_SEC, scrape_course_sections
from tools.session import build_session
from tools.storage import ensure_indexes, get_collection, upsert_course_document
from tools.titles import fetch_titles

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OFFERED_DIR = PROJECT_ROOT / "data" / "offered"

# '2' = Fall, confirmed via keydate -- extend as other Perid values are
# confirmed. Falls back to a plain "p<perid>" prefix instead of guessing
# a season for anything unconfirmed.
PERID_TERM_ABBR = {"2": "fa"}

# Splits a title record's "Short" field (e.g. "MATH-010B") into a
# subject prefix and the remaining course code, best-effort -- used for
# the document's subject/code metadata, not as a correctness-critical
# key (module_id already is).
SUBJECT_CODE_RE = re.compile(r"^([A-Z]{2,6})[\s-]*(.*)$")

# UCSD Extension (Extended Studies) offerings show up two ways in the
# Short code: prefixed right after the dept code, e.g. "MATH-X400.18",
# "EDS-XSD324A" (confirmed against a real fa26 scrape -- 595 courses
# matched this shape and were legitimately excluded), or suffixed with
# a trailing X, e.g. "LIAB-001AX", "COMM-110X" (same Extension-style
# naming, not independently confirmed against a live scrape).
EXCLUDED_PREFIX_RE = re.compile(r"^[A-Z]{2,6}-X")
EXCLUDED_SUFFIX_RE = re.compile(r"X$")


def is_excluded_code(short: str | None) -> bool:
    if not short:
        return False
    code = short.strip().upper()
    excluded = bool(EXCLUDED_PREFIX_RE.match(code)) or bool(EXCLUDED_SUFFIX_RE.search(code))
    if excluded:
        print(f"  skipping UCSD Extension course: {code}")
    return excluded


def filter_titles(titles: list[dict]) -> list[dict]:
    """Drops titles whose code matches DEPT-X### (e.g. "MATH-X010")."""
    return [title for title in titles if not is_excluded_code(title.get("Short"))]


def term_slug(peryr: str, perid: str) -> str:
    abbr = PERID_TERM_ABBR.get(perid, f"p{perid}")
    return f"{abbr}{peryr[-2:]}"


def write_titles_csv(titles: list[dict], peryr: str, perid: str) -> Path:
    """Writes just what the sections scraper needs to run again later --
    module_id (used directly as ModuleID) plus course code/name -- to
    data/offered/<term>.csv, mirroring data/catalog/<CODE>.json."""
    OFFERED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OFFERED_DIR / f"{term_slug(peryr, perid)}.csv"
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["module_id", "code", "name"])
        for title in titles:
            writer.writerow([title.get("Smobjid"), title.get("Short"), title.get("Stext") or title.get("Title")])
    return out_path


def read_titles_csv(peryr: str, perid: str) -> list[dict]:
    path = OFFERED_DIR / f"{term_slug(peryr, perid)}.csv"
    if not path.exists():
        sys.exit(
            f"Missing {path}.\n"
            f"Run `python3 main.py --peryr {peryr} --perid {perid} --titles-only` first to build it."
        )
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def split_subject_code(short: str | None) -> tuple[str | None, str | None]:
    if not short:
        return None, None
    match = SUBJECT_CODE_RE.match(short.strip().upper())
    if not match:
        return short.strip(), None
    subject, rest = match.groups()
    return subject, (rest.strip() or None)


def scrape_all_sections(session: requests.Session, peryr: str, perid: str) -> int:
    """Scrapes sections+meetings for every course listed in
    data/offered/<term>.csv and upserts one document per course into
    MongoDB. Returns the number of courses successfully scraped."""
    rows = read_titles_csv(peryr, perid)
    print(f"Found {len(rows)} course(s) to scrape sections for.")

    collection = get_collection()
    ensure_indexes(collection)

    scraped = 0
    for i, row in enumerate(rows, start=1):
        module_id = row["module_id"]
        subject, code = split_subject_code(row["code"])

        print(f"  [{i}/{len(rows)}] {row['code']} (ModuleID={module_id})...")
        try:
            doc = scrape_course_sections(
                session, peryr, perid, module_id, subject=subject, code=code, title=row["name"]
            )
        except requests.RequestException as e:
            print(f"    skipping {row['code']}: network error ({e})")
            continue

        upsert_course_document(collection, doc)
        scraped += 1
        time.sleep(REQUEST_DELAY_SEC)

    print(f"Done. Upserted sections for {scraped}/{len(rows)} course(s).")
    return scraped


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--peryr", default="2026")
    parser.add_argument("--perid", default="2", help="'2' = Fall 2026, confirmed via keydate")
    parser.add_argument("--titles-only", action="store_true", help="just fetch titles to data/offered/<term>.csv")
    args = parser.parse_args()

    session = build_session()

    if args.titles_only:
        print(f"Fetching titles for Peryr={args.peryr} Perid={args.perid}...")
        titles = fetch_titles(session, args.peryr, args.perid)
        kept = filter_titles(titles)
        skipped = len(titles) - len(kept)
        if skipped:
            print(f"Skipped {skipped} UCSD Extension course(s) total.")
        out_path = write_titles_csv(kept, args.peryr, args.perid)
        print(f"Wrote {len(kept)} title records to {out_path.resolve()}")
        return

    scrape_all_sections(session, args.peryr, args.perid)


if __name__ == "__main__":
    main()
