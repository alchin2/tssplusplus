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
    return MongoClient(settings.mongodb_uri)


def get_courses_collection() -> Collection:
    """The scraper writes one collection per term (e.g. "fa26"),
    keyed on module_id -- see tools/storage.py."""
    return get_client()[settings.mongodb_db][settings.term]
