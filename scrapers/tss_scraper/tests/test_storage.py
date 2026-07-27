from unittest.mock import MagicMock, patch

import tools.storage as storage_module
from tools.storage import DEFAULT_DB_NAME, DEFAULT_MONGO_URI, ensure_indexes, get_collection, upsert_course_document


def make_doc(module_id="2494", peryr="2026", perid="2", **extra):
    return {"module_id": module_id, "peryr": peryr, "perid": perid, "sections": [], "raw": [], **extra}


# --- upsert_course_document --------------------------------------------------


def test_upsert_uses_module_peryr_perid_as_key():
    collection = MagicMock()
    doc = make_doc(subject="MATH", code="010B")

    upsert_course_document(collection, doc)

    collection.update_one.assert_called_once_with(
        {"module_id": "2494", "peryr": "2026", "perid": "2"},
        {"$set": doc},
        upsert=True,
    )


def test_upsert_is_idempotent_across_repeated_calls():
    """Simulates running the scraper twice: same key both times means
    the same document gets replaced, not duplicated."""
    collection = MagicMock()
    doc = make_doc()

    upsert_course_document(collection, doc)
    upsert_course_document(collection, doc)

    assert collection.update_one.call_count == 2
    first_key = collection.update_one.call_args_list[0].args[0]
    second_key = collection.update_one.call_args_list[1].args[0]
    assert first_key == second_key == {"module_id": "2494", "peryr": "2026", "perid": "2"}


# --- ensure_indexes -----------------------------------------------------------


def test_ensure_indexes_creates_unique_compound_index():
    collection = MagicMock()

    ensure_indexes(collection)

    collection.create_index.assert_called_once_with(
        [("module_id", 1), ("peryr", 1), ("perid", 1)], unique=True
    )


# --- get_collection -------------------------------------------------------------


@patch("tools.storage.MongoClient")
def test_get_collection_uses_defaults_when_unset(mock_client_cls, monkeypatch):
    monkeypatch.delenv("MONGODB_URI", raising=False)
    monkeypatch.delenv("MONGODB_DB", raising=False)
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    get_collection()

    mock_client_cls.assert_called_once_with(DEFAULT_MONGO_URI)
    mock_client.__getitem__.assert_called_once_with(DEFAULT_DB_NAME)


@patch("tools.storage.MongoClient")
def test_get_collection_prefers_explicit_args_over_env(mock_client_cls, monkeypatch):
    monkeypatch.setenv("MONGODB_URI", "mongodb://env-host:27017")
    monkeypatch.setenv("MONGODB_DB", "env_db")
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    get_collection(uri="mongodb://explicit-host:27017", db_name="explicit_db")

    mock_client_cls.assert_called_once_with("mongodb://explicit-host:27017")
    mock_client.__getitem__.assert_called_once_with("explicit_db")


@patch("tools.storage.MongoClient")
def test_get_collection_falls_back_to_env_vars(mock_client_cls, monkeypatch):
    monkeypatch.setenv("MONGODB_URI", "mongodb://env-host:27017")
    monkeypatch.setenv("MONGODB_DB", "env_db")
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    get_collection()

    mock_client_cls.assert_called_once_with("mongodb://env-host:27017")
    mock_client.__getitem__.assert_called_once_with("env_db")
