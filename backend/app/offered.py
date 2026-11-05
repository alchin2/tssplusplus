"""
Reads data/offered/<term>.csv -- the module_id -> code/name mapping
tss_scraper writes via --titles-only. This is the only place module_id
is joined to a catalog course/code, matching the design doc's
"module_id is the natural key end-to-end" rule.
"""

import csv
from functools import lru_cache

from app.config import settings


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
