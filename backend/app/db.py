"""
Mongo connection, mirroring tss_scraper/tools/storage.py's client setup
so both processes point at the same database by default.
"""

from functools import lru_cache

from pymongo import MongoClient
from pymongo.collection import Collection

from app.config import settings


@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    # Default server selection is 30s; when Mongo is unreachable that
    # stalls every /api/courses/{module_id} request for 30s before the
    # 503 fallback kicks in. 5s keeps the failure mode snappy.
    return MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)


def get_courses_collection() -> Collection:
    """The scraper writes one collection per term (e.g. "fa26"),
    keyed on module_id -- see tools/storage.py."""
    return get_client()[settings.mongodb_db][settings.term]


def get_prereq_cache_collection() -> Collection:
    """Cache of generated prereq graphs, keyed by course code (not
    module_id -- prereqs are a catalog-level fact, not a per-term one).
    Per designdoc.md's Prereq generation/caching: every /prereqs
    request regenerates the graph and overwrites this cache, so it
    always reflects the current catalog with no time-based expiry
    needed -- a stale entry only exists between catalog_scraper runs."""
    return get_client()[settings.mongodb_db]["prereq_graphs"]
