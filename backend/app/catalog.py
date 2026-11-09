"""
In-memory catalog cache: loads data/catalog/*.json once and serves the
search/filter/lookup queries the API needs. Department is derived from
each file's stem (e.g. CSE.json -> dept "CSE"), matching the
one-file-per-department layout catalog_scraper writes.
"""

import json
import re
from collections import Counter
from functools import lru_cache

from app.config import settings

# Strips the separator (dash/space/none) and any leading zeros between a
# course's dept prefix and number, so TSS's "CSE-008A" and the catalog's
# "CSE 8A" both -> "CSE8A". This is how a term's offered CSV is joined to
# the catalog.
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


# One catalog entry often covers several TSS codes, which TSS lists
# separately: "DSC 10/R" (DSC-010 and DSC-010R), "HIEA 163/263",
# "BENG 202/CSE 282", "BENG/BIMM/CSE 181", "POLI 5 or 5R", "LISL 5A, 5B",
# "MATH 220A-B-C", "VIS 128A–E". Split on the alternative separators, then
# parse each part as [DEPT] [NUMBER][SUFFIX][-SUFFIX...].
_ALT_SEP_RE = re.compile(r"\s*(?:/|,|\bOR\b)\s*")
_ALT_PART_RE = re.compile(r"^(?:([A-Z]+)\s+)?(\d+)?\s*([A-Z]*(?:\s*[-–]\s*[A-Z0-9]+)*)$")
_CHAIN_SEP_RE = re.compile(r"\s*[-–]\s*")


def catalog_code_aliases(code: str | None) -> list[str]:
    """Every normalized code a catalog entry's code covers, its plain
    normalize_code first. Parts that don't parse (e.g. a title the
    scraper left in the code) are skipped."""
    aliases = [normalize_code(code)]
    dept = number = None
    letters = ""  # the last code's own suffix: "DSC 40A/R" -> DSC 40AR
    pending_depts: list[str] = []  # "BENG/BIMM" in "BENG/BIMM/CSE 181"

    def add(d: str | None, n: str | None, suffix: str = "") -> None:
        if d and n:
            aliases.append(normalize_code(f"{d} {n}{suffix}"))

    for part in _ALT_SEP_RE.split((code or "").strip().upper()):
        match = _ALT_PART_RE.match(part)
        if not match:
            continue
        part_dept, part_number, chain = match.groups()
        if part_dept:
            dept = part_dept
        if not part_number and not part_dept:
            # Letters only: a dept still waiting for its number, or a
            # suffix on the last code ("DSC 10/R" -> DSC 10R).
            if number is None:
                pending_depts.append(chain)
            else:
                add(dept, number, letters + chain)
            continue
        if part_number:
            number = part_number
            for pending in pending_depts:
                add(pending, number)
            pending_depts.clear()

        first, *rest = _CHAIN_SEP_RE.split(chain)
        letters = first
        add(dept, number, first)
        prev = first
        for link in rest:
            if link.isdigit():  # "GSS 21-22-23": a list of numbers
                add(dept, link)
            elif len(prev) == 1 and len(link) == 1 and prev.isalpha():
                # "128A–E" is a letter range; "220A-B-C" spells it out.
                for ord_ in range(ord(prev) + 1, ord(link) + 1):
                    add(dept, number, chr(ord_))
            else:
                add(dept, number, link)
            prev = link

    return list(dict.fromkeys(aliases))


def offered_module_id(course: dict, code_to_module_id: dict[str, str]) -> str | None:
    """The course's module_id in a term (see
    offered.get_code_to_module_id_index), matching any code it covers."""
    for alias in catalog_code_aliases(course["code"]):
        if alias in code_to_module_id:
            return code_to_module_id[alias]
    return None


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
    """Normalized code -> catalog entry, for every code an entry covers.
    An entry's own exact code wins over another entry's alias (e.g. a
    standalone "HIEU 157GS" over "HIEU 157/157GS")."""
    catalog = get_catalog()
    index = {normalize_code(c["code"]): c for c in catalog}
    for c in catalog:
        for alias in catalog_code_aliases(c["code"])[1:]:
            index.setdefault(alias, c)
    return index


def find_by_normalized_code(normalized_code: str) -> dict | None:
    return _get_normalized_index().get(normalized_code)


_TSS_CODE_RE = re.compile(r"^([A-Z]+)-0*(\d.*)$")


def tss_display_code(code: str) -> str:
    """TSS's "DSC-001" -> the catalog's style, "DSC 1"."""
    match = _TSS_CODE_RE.match(code.strip().upper())
    return f"{match.group(1)} {match.group(2)}" if match else code


@lru_cache(maxsize=1)
def _subject_depts() -> dict[str, str]:
    """Subject prefix -> the catalog dept (file) most of its courses live
    in, e.g. "LIGN" -> "LING" (not EDS, for "EDS/LIGN 119"), "BILD" ->
    "BIOL"."""
    counts: dict[str, Counter] = {}
    for c in get_catalog():
        for alias in catalog_code_aliases(c["code"]):
            prefix = re.match(r"[A-Z]+(?=\d)", alias)
            if prefix:
                counts.setdefault(prefix.group(), Counter())[c["dept"]] += 1
    depts = {prefix: dept_counts.most_common(1)[0][0] for prefix, dept_counts in counts.items()}
    depts.update({c["dept"]: c["dept"] for c in get_catalog()})
    return depts


_LETTERED_CODE_RE = re.compile(r"^([A-Z]+)(\d+)([A-Z]+)$")


def _title_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]", "", title.lower())


def _variant_base(normalized_code: str, name: str) -> dict | None:
    """The catalog entry for a TSS variant of a course the catalog lists
    only under its base code: a remote "R" offering (CSE-140R -> CSE 140),
    or a lettered section of a course whose entry covers its sections --
    the description names one ("MUS 95W", "CLIN 294A") or the titles match
    (MGT-151A "Business Analytics"). Other lettered codes can be different
    courses (POLI 174D "Data Politics" isn't POLI 174), so they don't match.
    A section keeps its own TSS title ("Concert Choir", not "Ensemble
    Performance") unless that's just the catalog's, truncated."""
    match = _LETTERED_CODE_RE.match(normalized_code)
    if not match:
        return None
    dept, number, letters = match.groups()
    if letters.endswith("R"):
        base = find_by_normalized_code(normalized_code[:-1])
        if base is not None:
            return base
    base = find_by_normalized_code(dept + number)
    if base is None:
        return None
    if _title_key(base["name"]).startswith(_title_key(name)):
        return base
    if re.search(rf"\b{number}[A-Z]", base.get("description") or ""):
        return {**base, "name": name}
    return None


def tss_course_entry(code: str, name: str) -> dict:
    """A course entry for a TSS listing that no catalog course's row
    claimed: TSS's own code and title, borrowing the catalog's
    description/prereqs when the code still resolves to an entry (e.g.
    DSC-010R to "DSC 10/R" when DSC-010 took that entry's row). Otherwise
    it's a course the catalog doesn't list yet, like a new DSC 1."""
    display = tss_display_code(code)
    normalized = normalize_code(code)
    catalog_course = find_by_normalized_code(normalized) or _variant_base(normalized, name)
    if catalog_course is not None:
        return {**catalog_course, "code": display}
    prefix = display.split(" ")[0]
    return {"code": display, "name": name, "dept": _subject_depts().get(prefix, prefix), "prerequisites": []}


def search_courses(
    courses: list[dict],
    dept: str | None = None,
    offered: bool | None = None,
    q: str | None = None,
) -> list[dict]:
    """courses: the selected term's courses (offered.get_term_courses),
    each carrying its module_id in the term -- "offered" is per term, so
    it isn't stored on the catalog entries themselves."""
    if dept:
        dept_upper = dept.upper()
        courses = [c for c in courses if c["dept"] == dept_upper]

    if offered is not None:
        courses = [c for c in courses if (c["module_id"] is not None) == offered]

    if q:
        needle = q.lower()
        courses = [c for c in courses if needle in c["code"].lower() or needle in c["name"].lower()]

    return courses
