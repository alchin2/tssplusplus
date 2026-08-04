import json
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.buildings import get_buildings
from app.main import app

CENTR = {"abbr": "CENTR", "name": "Center Hall", "lat": 32.8778, "lng": -117.2376, "address": None, "aliases": [], "match": "exact"}
YORK = {"abbr": "YORK", "name": "Herbert F. York Undergraduate Sciences Building", "lat": 32.8745, "lng": -117.2400, "address": None, "aliases": [], "match": "exact"}


def _write_buildings(tmp_path):
    path = tmp_path / "buildings.json"
    path.write_text(json.dumps({"_meta": {}, "buildings": {"Center Hall": CENTR, "York Hall": YORK}}))
    return path


def test_list_buildings_returns_scraped_locations(tmp_path):
    path = _write_buildings(tmp_path)
    get_buildings.cache_clear()
    with patch("app.buildings.settings") as mock_settings:
        mock_settings.buildings_path = path
        client = TestClient(app)
        resp = client.get("/api/buildings")
    get_buildings.cache_clear()

    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == {"Center Hall", "York Hall"}
    assert body["Center Hall"]["abbr"] == "CENTR"
    assert body["Center Hall"]["lat"] == 32.8778
    # Provenance-only fields (address/aliases/match) are dropped from the response.
    assert "aliases" not in body["Center Hall"]


def test_list_buildings_empty_when_file_missing(tmp_path):
    get_buildings.cache_clear()
    with patch("app.buildings.settings") as mock_settings:
        mock_settings.buildings_path = tmp_path / "does-not-exist.json"
        client = TestClient(app)
        resp = client.get("/api/buildings")
    get_buildings.cache_clear()

    assert resp.status_code == 200
    assert resp.json() == {}
