"""
Cross-references catalog_scraper's course list (data/catalog/<CODE>.json)
against tss_scraper's offered-this-term list (data/offered/<term>.csv),
marking each catalog course's "offered_this_qtr" field true if it's
actually being taught this term.

The two scrapers format course codes differently -- catalog_scraper
writes "CSE 8A" (space-separated, no zero-padding), tss_scraper writes
"CSE-008A" (dash-separated, zero-padded) -- so codes are compared via
normalize_code(), which strips the separator and any leading zeros from
both sides down to a common "CSE8A" shape.

Running it:
  python3 mark_offered_courses.py [--term fa26]
"""

import argparse
import csv
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OFFERED_DIR = PROJECT_ROOT / "data" / "offered"
CATALOG_DIR = PROJECT_ROOT / "data" / "catalog"

# Captures a leading letters-only dept prefix, then discards the
# separator (dash/space/none) and any leading zeros between it and the
# course number, e.g. "MAE-020" / "MAE 20" -> dept="MAE", rest="20".
CODE_RE = re.compile(r"^([A-Za-z]+)[\s-]*0*([0-9].*)$")


def normalize_code(code: str | None) -> str:
    """Normalizes a course code. e.g. both
    "CSE-008A" and "CSE 8A" normalize to "CSE8A"."""
    if not code:
        return ""
    code = code.strip().upper()
    match = CODE_RE.match(code)
    if not match:
        return code.replace("-", "").replace(" ", "")
    dept, rest = match.groups()
    return dept + rest


def add_filtered_data_column(csv_path: Path) -> Path:
    """Reads an offered-courses CSV (module_id, code, name) and rewrites
    it with an added "filtered_data" column holding each code's
    normalized form."""
    with csv_path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    for row in rows:
        row["filtered_data"] = normalize_code(row.get("code"))

    fieldnames = ["module_id", "code", "name", "filtered_data"]
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return csv_path


def load_offered_codes(csv_path: Path) -> set[str]:
    """Reads the "filtered_data" column of an offered-courses CSV
    (added by add_filtered_data_column) into a set of normalized
    codes."""
    with csv_path.open(newline="", encoding="utf-8") as f:
        return {row["filtered_data"] for row in csv.DictReader(f) if row.get("filtered_data")}


def mark_offered_in_catalog(catalog_dir: Path, offered_codes: set[str]) -> tuple[int, int]:
    """Loops through every data/catalog/<CODE>.json and offered courses."""
    marked_true = 0
    total = 0

    for path in sorted(catalog_dir.glob("*.json")):
        with path.open(encoding="utf-8") as f:
            courses = json.load(f)

        changed = False
        for course in courses:
            total += 1
            is_offered = normalize_code(course.get("code")) in offered_codes
            if course.get("offered_this_qtr") != is_offered:
                changed = True
            course["offered_this_qtr"] = is_offered
            if is_offered:
                marked_true += 1

        if changed:
            with path.open("w", encoding="utf-8") as f:
                json.dump(courses, f, indent=2, ensure_ascii=False)

    return marked_true, total


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--term", default="fa26", help="offered-courses CSV to use, e.g. fa26 -> data/offered/fa26.csv")
    args = parser.parse_args()

    csv_path = OFFERED_DIR / f"{args.term}.csv"
    if not csv_path.exists():
        parser.error(f"Missing {csv_path}")

    add_filtered_data_column(csv_path)
    print(f"Added filtered_data column to {csv_path}")

    offered_codes = load_offered_codes(csv_path)
    print(f"Loaded {len(offered_codes)} normalized offered course code(s) from {csv_path.name}")

    marked_true, total = mark_offered_in_catalog(CATALOG_DIR, offered_codes)
    print(f"Marked {marked_true}/{total} catalog course(s) as offered_this_qtr=true")


if __name__ == "__main__":
    main()
