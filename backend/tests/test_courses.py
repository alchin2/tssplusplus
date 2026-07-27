import json
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.catalog import get_catalog, _get_normalized_index
from app.main import app
from app.offered import get_offered_index

CSE_100 = {
    "name": "Advanced Data Structures",
    "code": "CSE 100",
    "raw_prereq": "CSE 12 and CSE 15L and MATH 20C",
    "prerequisites": [{"type": "AND", "items": [{"type": "COURSE", "course_id": "CSE12"}]}],
    "offered_this_qtr": True,
}
MATH_20A = {
    "name": "Calculus I",
    "code": "MATH 20A",
    "raw_prereq": "none",
    "prerequisites": [],
    "offered_this_qtr": False,
}


def _write_catalog(tmp_path):
    (tmp_path / "CSE.json").write_text(json.dumps([CSE_100]))
    (tmp_path / "MATH.json").write_text(json.dumps([MATH_20A]))


def _write_offered(tmp_path, term="fa26"):
    csv_path = tmp_path / f"{term}.csv"
    csv_path.write_text("module_id,code,name\n8401,CSE-100,Advanced Data Structures\n")


def _clear_caches():
    get_catalog.cache_clear()
    _get_normalized_index.cache_clear()
    get_offered_index.cache_clear()


def test_list_courses_filters_by_dept_and_offered(tmp_path):
    _write_catalog(tmp_path)
    _clear_caches()
    with patch("app.catalog.settings") as mock_settings:
        mock_settings.catalog_dir = tmp_path
        client = TestClient(app)
        resp = client.get("/api/courses", params={"dept": "CSE"})
    _clear_caches()

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["code"] == "CSE 100"
    assert body[0]["offered_this_qtr"] is True


def test_list_courses_search_matches_name(tmp_path):
    _write_catalog(tmp_path)
    _clear_caches()
    with patch("app.catalog.settings") as mock_settings:
        mock_settings.catalog_dir = tmp_path
        client = TestClient(app)
        resp = client.get("/api/courses", params={"q": "calculus"})
    _clear_caches()

    assert resp.status_code == 200
    codes = [c["code"] for c in resp.json()]
    assert codes == ["MATH 20A"]


def test_course_detail_merges_catalog_and_mongo_sections(tmp_path):
    _write_catalog(tmp_path)
    _write_offered(tmp_path)
    _clear_caches()

    raw_row = {
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
    mock_collection = MagicMock()
    mock_collection.find_one.return_value = {"module_id": "8401", "raw": [raw_row]}

    with (
        patch("app.catalog.settings") as mock_catalog_settings,
        patch("app.offered.settings") as mock_offered_settings,
        patch("app.routers.courses.get_courses_collection", return_value=mock_collection),
    ):
        mock_catalog_settings.catalog_dir = tmp_path
        mock_offered_settings.offered_dir = tmp_path
        mock_offered_settings.term = "fa26"
        client = TestClient(app)
        resp = client.get("/api/courses/8401")
    _clear_caches()

    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == "CSE 100"
    assert body["offered_this_qtr"] is True
    assert len(body["sections"]) == 1
    section = body["sections"][0]
    assert section["section_code"] == "P-001-001"
    assert section["seats_available"] == 18
    assert len(section["meetings"]) == 1
    assert section["meetings"][0]["instructor_name"] == "Moshiri, N."


def test_course_detail_404_when_module_id_not_offered(tmp_path):
    _write_catalog(tmp_path)
    _write_offered(tmp_path)
    _clear_caches()

    with (
        patch("app.catalog.settings") as mock_catalog_settings,
        patch("app.offered.settings") as mock_offered_settings,
    ):
        mock_catalog_settings.catalog_dir = tmp_path
        mock_offered_settings.offered_dir = tmp_path
        mock_offered_settings.term = "fa26"
        client = TestClient(app)
        resp = client.get("/api/courses/does-not-exist")
    _clear_caches()

    assert resp.status_code == 404
