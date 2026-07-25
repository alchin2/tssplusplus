"""
In-memory catalog cache: loads data/catalog/*.json once and serves the
search/filter/lookup queries the API needs. Department is derived from
each file's stem (e.g. CSE.json -> dept "CSE"), matching the
one-file-per-department layout catalog_scraper writes.
"""

import json
import re
from functools import lru_cache

from app.config import settings

# Mirrors mark_offered_courses.py's normalize_code: strips the
# separator (dash/space/none) and any leading zeros between a course's
# dept prefix and number, so "CSE-008A" and "CSE 8A" both -> "CSE8A".
# Duplicated here (rather than imported) because scrapers/ isn't set up
# as an installable package the backend can depend on.
_CODE_RE = re.compile(r"^([A-Za-z]+)[\s-]*0*([0-9].*)$")


def normalize_code(code: str | None) -> str:
    if not code:
        return ""
    code = code.strip().upper()
    match = _CODE_RE.match(code)
    if not match:
        return code.replace("-", "").replace(" ", "")
    dept, rest = match.groups()
    return dept + rest


def _load_all() -> list[dict]:
    courses = []
    for path in sorted(settings.catalog_dir.glob("*.json")):
        dept = path.stem
        with path.open(encoding="utf-8") as f:
            for course in json.load(f):
                courses.append({**course, "dept": dept})
    return courses


@lru_cache(maxsize=1)
def get_catalog() -> list[dict]:
    return _load_all()


@lru_cache(maxsize=1)
def _get_normalized_index() -> dict[str, dict]:
    return {normalize_code(c["code"]): c for c in get_catalog()}


def find_by_normalized_code(normalized_code: str) -> dict | None:
    return _get_normalized_index().get(normalized_code)


def search_courses(dept: str | None = None, offered: bool | None = None, q: str | None = None) -> list[dict]:
    courses = get_catalog()

    if dept:
        dept_upper = dept.upper()
        courses = [c for c in courses if c["dept"] == dept_upper]

    if offered is not None:
        courses = [c for c in courses if c["offered_this_qtr"] == offered]

    if q:
        needle = q.lower()
        courses = [c for c in courses if needle in c["code"].lower() or needle in c["name"].lower()]

    return courses
