"""
Per-term module_id -> instructor names, read from the scraped Mongo
sections so course search can match a professor. Names only exist in
Mongo (the offered CSV has just code/name), so the index is cached with
a TTL rather than forever: a fresh scrape shows up without a restart.
"""

import time

from pymongo.errors import PyMongoError

from app.db import get_courses_collection

# A full scan of a term is ~1s, too slow per keystroke but cheap every
# few minutes.
_TTL_S = 600
# After a failed read, keep serving what we had (or nothing) for a bit
# instead of stalling every search on Mongo's server-selection timeout.
_RETRY_S = 60

_cache: dict[str, tuple[float, dict[str, str]]] = {}


def _read_index(term: str) -> dict[str, str]:
    index = {}
    for doc in get_courses_collection(term).find({}, {"_id": 0, "module_id": 1, "raw.InstructorName": 1}):
        names = {(row.get("InstructorName") or "").strip() for row in doc.get("raw") or []}
        index[doc["module_id"]] = "\n".join(sorted(n.lower() for n in names if n))
    return index


def get_instructor_index(term: str) -> dict[str, str]:
    """module_id -> its instructors' names, lowercased and newline-joined
    (so a substring match can't span two names). Empty when Mongo is
    unreachable -- search then just matches code/name as before."""
    now = time.monotonic()
    cached = _cache.get(term)
    if cached and now < cached[0]:
        return cached[1]
    try:
        index = _read_index(term)
        _cache[term] = (now + _TTL_S, index)
    except PyMongoError:
        index = cached[1] if cached else {}
        _cache[term] = (now + _RETRY_S, index)
    return index


def clear_cache() -> None:
    _cache.clear()
