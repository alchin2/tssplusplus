"""
MongoDB writer for course section/meeting documents built by sections.py.

One document per course per term (matching the app's own "give me
everything about this one course" access pattern), upserted so re-runs
don't duplicate documents -- keyed on (module_id, peryr, perid), which
is equivalent to (subject, code, peryr, perid) since module_id already
uniquely identifies the course.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection

# .env lives at the project root (four levels up: tools -> tss_scraper ->
# scrapers -> project root), alongside MONGODB_URI -- matches this
# project's existing env var naming, not a generic MONGO_URI.
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

DEFAULT_MONGO_URI = "mongodb://localhost:27017"
DEFAULT_DB_NAME = "tssplusplus"
COLLECTION_NAME = "fa26"


def get_collection(uri: str | None = None, db_name: str | None = None) -> Collection:
    client = MongoClient(uri or os.environ.get("MONGODB_URI", DEFAULT_MONGO_URI))
    db = client[db_name or os.environ.get("MONGODB_DB", DEFAULT_DB_NAME)]
    return db[COLLECTION_NAME]


def ensure_indexes(collection: Collection) -> None:
    """Unique index backing the upsert key, as a second line of defense
    against duplicate documents alongside the upsert itself."""
    collection.create_index([("module_id", 1), ("peryr", 1), ("perid", 1)], unique=True)


def upsert_course_document(collection: Collection, doc: dict) -> None:
    """Upserts one course-per-term document, keyed on (module_id, peryr,
    perid) -- re-running the scraper overwrites the existing document
    instead of inserting a duplicate."""
    key = {"module_id": doc["module_id"], "peryr": doc["peryr"], "perid": doc["perid"]}
    collection.update_one(key, {"$set": doc}, upsert=True)
