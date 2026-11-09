"""
Reads data/offered/<term>.csv -- the module_id -> code/name mapping
tss_scraper writes via --titles-only. This is the only place module_id
is joined to a catalog course/code, matching the design doc's
"module_id is the natural key end-to-end" rule.
"""

import csv
import re
from collections import defaultdict
from functools import lru_cache

from app.config import settings

_SUBJECT_NUMBER_RE = re.compile(r"^([A-Z]+)\s*(\d+)([A-Z]*)")


def _subject_number(code: str) -> tuple[str | None, tuple[int, str] | None]:
    """"MATH 20B" -> ("MATH", (20, "B")), comparable within a subject."""
    match = _SUBJECT_NUMBER_RE.match(code)
    return (match.group(1), (int(match.group(2)), match.group(3))) if match else (None, None)


def _slot_in(catalog_rows: list[dict], extras: list[dict]) -> list[dict]:
    """Places each extra entry among its dept's catalog rows -- after the
    last one of its subject numbered at or below it -- instead of after the
    whole catalog, so DSC 1 lists right before DSC 10. Catalog order is
    left as is."""
    rows_by_dept: dict[str, list[tuple[int, str | None, int | None]]] = defaultdict(list)
    for i, c in enumerate(catalog_rows):
        rows_by_dept[c["dept"]].append((i, *_subject_number(c["code"])))

    before: dict[int, list[dict]] = defaultdict(list)  # catalog index -> extras placed before it
    for extra in extras:
        subject, number = _subject_number(extra["code"])
        dept_rows = rows_by_dept.get(extra["dept"], [])
        same_subject = [(i, n) for i, s, n in dept_rows if s == subject]
        at_or_below = [i for i, n in same_subject if n is not None and number is not None and n <= number]
        if at_or_below:
            slot = at_or_below[-1] + 1
        elif same_subject:
            slot = same_subject[0][0]
        elif dept_rows:
            slot = dept_rows[-1][0] + 1
        else:
            slot = len(catalog_rows)
        before[slot].append(extra)

    ordered = []
    for i in range(len(catalog_rows) + 1):
        ordered.extend(sorted(before[i], key=lambda c: (_subject_number(c["code"])[1] or (0, ""), c["code"])))
        if i < len(catalog_rows):
            ordered.append(catalog_rows[i])
    return ordered


# Sized for a handful of servable terms (see app/terms.py).
@lru_cache(maxsize=8)
def get_offered_index(term: str) -> dict[str, dict]:
    path = settings.offered_dir / f"{term}.csv"
    if not path.exists():
        return {}

    with path.open(newline="", encoding="utf-8") as f:
        return {row["module_id"]: {"code": row["code"], "name": row["name"]} for row in csv.DictReader(f)}


@lru_cache(maxsize=8)
def get_code_to_module_id_index(term: str) -> dict[str, str]:
    """Reverse of get_offered_index: normalized catalog code -> module_id,
    so list endpoints can attach module_id to catalog courses. Only
    courses offered in the term have a module_id, so its keys double as
    the term's set of offered codes. If two module_ids share a
    normalized code, the first seen wins."""
    from app.catalog import normalize_code

    index: dict[str, str] = {}
    for module_id, entry in get_offered_index(term).items():
        index.setdefault(normalize_code(entry["code"]), module_id)
    return index


@lru_cache(maxsize=8)
def get_term_courses(term: str) -> list[dict]:
    """Every course searchable in the term, each with its "module_id"
    (None if not offered): the whole catalog, plus an entry for each
    offered course no catalog row claimed, so courses the catalog
    doesn't list yet still show up."""
    from app.catalog import get_catalog, offered_module_id, tss_course_entry

    code_to_module_id = get_code_to_module_id_index(term)
    courses = [{**c, "module_id": offered_module_id(c, code_to_module_id)} for c in get_catalog()]
    claimed = {c["module_id"] for c in courses}
    extras = [
        {**tss_course_entry(entry["code"], entry["name"]), "module_id": module_id}
        for module_id, entry in get_offered_index(term).items()
        if module_id not in claimed
    ]
    return _slot_in(courses, extras)


@lru_cache(maxsize=8)
def get_term_course_index(term: str) -> dict[str, dict]:
    """module_id -> its get_term_courses entry; the first catalog row
    wins when two catalog entries share a module_id."""
    index: dict[str, dict] = {}
    for c in get_term_courses(term):
        if c["module_id"] is not None:
            index.setdefault(c["module_id"], c)
    return index
