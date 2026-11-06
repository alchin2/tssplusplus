import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from pymongo.errors import ServerSelectionTimeoutError

from app.catalog import get_catalog, _get_normalized_index
from app.main import app
from app.offered import get_code_to_module_id_index, get_offered_index
from app.terms import available_terms

CSE_100 = {
    "name": "Advanced Data Structures",
    "code": "CSE 100",
    "description": "High-performance data structures and supporting algorithms.",
    "raw_prereq": "CSE 12 and CSE 15L and MATH 20C",
    "prerequisites": [{"type": "AND", "items": [{"type": "COURSE", "course_id": "CSE12"}]}],
}
MATH_20A = {
    "name": "Calculus I",
    "code": "MATH 20A",
    "raw_prereq": "none",
    "prerequisites": [],
}


def _write_catalog(tmp_path):
    (tmp_path / "CSE.json").write_text(json.dumps([CSE_100]))
    (tmp_path / "MATH.json").write_text(json.dumps([MATH_20A]))


def _write_offered(tmp_path, term="fa26", rows="8401,CSE-100,Advanced Data Structures\n"):
    (tmp_path / f"{term}.csv").write_text("module_id,code,name\n" + rows)


def _clear_caches():
    get_catalog.cache_clear()
    _get_normalized_index.cache_clear()
    get_offered_index.cache_clear()
    get_code_to_module_id_index.cache_clear()
    available_terms.cache_clear()


@pytest.fixture
def data_dir(tmp_path):
    """Points catalog/offered/terms at tmp_path, with fa26 (CSE 100) and
    wi27 (MATH 20A) both fully scraped. Yields the fake settings so tests
    can tweak e.g. .term."""
    _write_catalog(tmp_path)
    _write_offered(tmp_path, "fa26")
    _write_offered(tmp_path, "wi27", "9100,MATH-020A,Calculus I\n")
    (tmp_path / "scraped_quarters.txt").write_text("Fall 2026\nWinter 2027\n")
    fake = SimpleNamespace(
        catalog_dir=tmp_path, offered_dir=tmp_path,
        scraped_quarters_path=tmp_path / "scraped_quarters.txt", term=None,
    )
    _clear_caches()
    with (
        patch("app.catalog.settings", fake),
        patch("app.offered.settings", fake),
        patch("app.terms.settings", fake),
    ):
        yield fake
    _clear_caches()


@pytest.fixture
def client(data_dir):
    return TestClient(app)


RAW_ROW = {
    "EventObjid": "957",
    "EventPkgObjid": "154263",
    "EventPkgText": "CSE-100 (P-001-001)",
    "EventPkgLimit": "105",
    "EventPkgSeatsAvailable": "18",
    "EventPkgNumOnWaitl": 0,
    "TeachingMethod": "LE",
    "InstructorName": "Moshiri, N.",
    "InstructorEmail": "mailto: NMOSHIRI@UCSD.EDU",
    "LocationText": "CENTR 109",
    "Sched": "M, W, F 12:00 PM - 12:50 PM In Person @ CENTR 109",
    "BeginDate": "2026-09-24",
    "EndDate": "2026-12-08",
}


# --- /api/courses ---------------------------------------------------------------


def test_list_courses_filters_by_dept(client):
    resp = client.get("/api/courses", params={"dept": "CSE", "term": "fa26"})

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["code"] == "CSE 100"
    assert body[0]["offered_this_qtr"] is True


def test_list_courses_search_matches_name(client):
    resp = client.get("/api/courses", params={"q": "calculus"})

    assert resp.status_code == 200
    assert [c["code"] for c in resp.json()] == ["MATH 20A"]


def test_list_courses_offered_and_module_id_follow_the_term(client):
    fall = {c["code"]: c for c in client.get("/api/courses", params={"term": "fa26"}).json()}
    winter = {c["code"]: c for c in client.get("/api/courses", params={"term": "wi27"}).json()}

    assert fall["CSE 100"] == {**fall["CSE 100"], "module_id": "8401", "offered_this_qtr": True}
    # MATH 20A is only in wi27's CSV.
    assert fall["MATH 20A"]["module_id"] is None
    assert fall["MATH 20A"]["offered_this_qtr"] is False

    assert winter["MATH 20A"]["module_id"] == "9100"
    assert winter["MATH 20A"]["offered_this_qtr"] is True
    assert winter["CSE 100"]["offered_this_qtr"] is False


def test_list_courses_offered_filter_is_per_term(client):
    fall = client.get("/api/courses", params={"term": "fa26", "offered": "true"}).json()
    winter = client.get("/api/courses", params={"term": "wi27", "offered": "true"}).json()

    assert [c["code"] for c in fall] == ["CSE 100"]
    assert [c["code"] for c in winter] == ["MATH 20A"]


def test_list_courses_defaults_to_newest_term(client):
    body = {c["code"]: c for c in client.get("/api/courses").json()}
    assert body["MATH 20A"]["offered_this_qtr"] is True  # wi27


def test_list_courses_unknown_term_404s(client):
    resp = client.get("/api/courses", params={"term": "sp27"})
    assert resp.status_code == 404


# --- /api/courses/{module_id} ---------------------------------------------------


def test_course_detail_merges_catalog_and_mongo_sections(client):
    mock_collection = MagicMock()
    mock_collection.find_one.return_value = {"module_id": "8401", "raw": [RAW_ROW]}

    with patch("app.routers.courses.get_courses_collection", return_value=mock_collection) as get_coll:
        resp = client.get("/api/courses/8401", params={"term": "fa26"})

    get_coll.assert_called_once_with("fa26")
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == "CSE 100"
    assert body["offered_this_qtr"] is True
    assert body["description"] == "High-performance data structures and supporting algorithms."
    assert len(body["sections"]) == 1
    section = body["sections"][0]
    assert section["section_code"] == "P-001-001"
    assert section["seats_available"] == 18
    assert len(section["meetings"]) == 1
    assert section["meetings"][0]["instructor_name"] == "Moshiri, N."


def test_course_detail_sections_link_to_tss_booking(client):
    mock_collection = MagicMock()
    mock_collection.find_one.return_value = {
        "module_id": "8401", "peryr": "2026", "perid": "2", "raw": [RAW_ROW],
    }

    with patch("app.routers.courses.get_courses_collection", return_value=mock_collection):
        resp = client.get("/api/courses/8401", params={"term": "fa26"})

    assert resp.json()["sections"][0]["book_url"] == (
        "https://tss.ucsd.edu/fiori#ZUSModule-display?TileType=MYMOD&/Detail/EventPackage/SM/"
        "8401/00000000/0/0/0/00000000-0000-0000-0000-000000000000/154263/2026/2/"
    )


def test_course_detail_book_url_null_without_term_ids(client):
    mock_collection = MagicMock()
    mock_collection.find_one.return_value = {"module_id": "8401", "raw": [RAW_ROW]}

    with patch("app.routers.courses.get_courses_collection", return_value=mock_collection):
        resp = client.get("/api/courses/8401", params={"term": "fa26"})

    assert resp.json()["sections"][0]["book_url"] is None


def test_course_detail_reads_the_terms_collection(client):
    mock_collection = MagicMock()
    mock_collection.find_one.return_value = None

    with patch("app.routers.courses.get_courses_collection", return_value=mock_collection) as get_coll:
        resp = client.get("/api/courses/9100", params={"term": "wi27"})

    get_coll.assert_called_once_with("wi27")
    assert resp.status_code == 200
    assert resp.json()["code"] == "MATH 20A"


def test_course_detail_503_when_mongo_unreachable(client):
    mock_collection = MagicMock()
    mock_collection.find_one.side_effect = ServerSelectionTimeoutError("SSL handshake failed")

    with patch("app.routers.courses.get_courses_collection", return_value=mock_collection):
        resp = client.get("/api/courses/8401", params={"term": "fa26"})

    assert resp.status_code == 503


def test_course_detail_404_when_module_id_not_offered(client):
    resp = client.get("/api/courses/does-not-exist", params={"term": "fa26"})
    assert resp.status_code == 404


def test_course_detail_404_when_offered_in_another_term_only(client):
    # 8401 (CSE 100) is in fa26's CSV, not wi27's.
    resp = client.get("/api/courses/8401", params={"term": "wi27"})
    assert resp.status_code == 404


# --- /api/courses/{module_id}/prereqs -------------------------------------------


def test_course_prereqs_resolves_tree(client):
    resp = client.get("/api/courses/8401/prereqs", params={"term": "fa26"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "ROOT"
    assert body["code"] == "CSE 100"
    assert body["name"] == "Advanced Data Structures"
    # CSE 12 isn't in the fixture catalog, so it resolves as an
    # unnamed, childless leaf rather than 404ing the whole request.
    assert body["children"] == [{"code": "CSE12", "type": "CHILD", "name": None, "children": []}]


# --- /api/meta ------------------------------------------------------------------


def test_meta_lists_terms_newest_first_with_default(client):
    body = client.get("/api/meta").json()

    assert body["terms"] == ["wi27", "fa26"]
    assert body["default_term"] == "wi27"
    assert body["term"] == "wi27"
    assert body["depts"] == ["CSE", "MATH"]
    assert body["course_count"] == 2
    assert body["offered_count"] == 1


def test_meta_for_a_requested_term(client):
    body = client.get("/api/meta", params={"term": "fa26"}).json()

    assert body["term"] == "fa26"
    assert body["default_term"] == "wi27"
    assert body["offered_count"] == 1


def test_meta_tss_term_pins_the_default(data_dir, client):
    data_dir.term = "fa26"
    body = client.get("/api/meta").json()

    assert body["default_term"] == "fa26"
    assert body["term"] == "fa26"
    assert body["terms"] == ["wi27", "fa26"]


def test_meta_unknown_term_404s(client):
    assert client.get("/api/meta", params={"term": "fa99"}).status_code == 404
