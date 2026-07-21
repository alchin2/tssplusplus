import json
import re
import time
from pathlib import Path

import httpx

from tools.course_scraper import scrape_department
from tools.json_parser import parse_department_prereqs

BASE_DIR = Path(__file__).parent
PROJECT_ROOT = Path(__file__).resolve().parents[2]
VALID_CODES_PATH = BASE_DIR / "valid_codes.txt"
CATALOG_DIR = PROJECT_ROOT / "data" / "catalog"

# Unlike every other department code, BIOL's catalog page aggregates every
# biology sub-department (BILD, BIMM, BIPN, BIEB, BICD, BGGN, ...) under one
# URL - none of those sub-codes have their own catalog page. Split BIOL's
# courses back out by their real prefix so each sub-department still gets
# its own file.
BIOL_CODE = "BIOL"
COURSE_PREFIX_RE = re.compile(r"^([A-Z]+)")


def read_codes(path: Path) -> list[str]:
    with path.open("r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def write_codes(path: Path, codes: list[str]) -> None:
    with path.open("w", encoding="utf-8") as f:
        f.write("\n".join(codes) + "\n")


def write_department_json(code: str, courses: list[dict]) -> Path:
    path = CATALOG_DIR / f"{code}.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)
    return path


def split_by_prefix(courses: list[dict]) -> dict[str, list[dict]]:
    """Group courses by their real department prefix (e.g. "BICD 100" -> "BICD")."""
    groups: dict[str, list[dict]] = {}
    for course in courses:
        match = COURSE_PREFIX_RE.match(course["code"])
        prefix = match.group(1) if match else course["code"]
        groups.setdefault(prefix, []).append(course)
    return groups


def scrape_all_departments(codes: list[str]) -> list[str]:
    """
    Scrape every department code, parse its prerequisites, and write one
    JSON file per department to data/catalog/<code>.json. Returns only the
    codes that the catalog site actually recognized. A code is considered
    "not found" if it scrapes zero courses - the catalog returns a 404 page
    for unknown department codes, which naturally has no course-name/
    course-descriptions elements for scrape_department to find.
    """
    found_codes = []

    for code in codes:
        try:
            courses = scrape_department(code)
        except httpx.HTTPError as e:
            print(f"  {code}: network error ({e}), keeping in valid_codes.txt and skipping this run")
            found_codes.append(code)
            time.sleep(0.1)
            continue

        if not courses:
            print(f"  {code}: not found, removing from valid_codes.txt")
            time.sleep(0.1)
            continue

        found_codes.append(code)
        parse_department_prereqs(courses)
        path = write_department_json(code, courses)
        print(f"  {code}: wrote {len(courses)} courses to {path}")

        time.sleep(0.1)

    return found_codes


def main():
    codes = read_codes(VALID_CODES_PATH)
    print(f"Scraping {len(codes)} department codes...")

    CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    found_codes = scrape_all_departments(codes)

    if len(found_codes) != len(codes):
        removed = set(codes) - set(found_codes)
        print(f"Removing {len(removed)} not-found department code(s): {sorted(removed)}")
        write_codes(VALID_CODES_PATH, found_codes)

    print(f"Done. Wrote catalog data for {len(found_codes)} departments to {CATALOG_DIR}")


if __name__ == "__main__":
    main()
