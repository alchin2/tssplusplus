from unittest.mock import MagicMock, patch

import httpx
from fastapi.testclient import TestClient

from app.main import app

ORS_RESPONSE = {
    "features": [
        {
            "geometry": {"coordinates": [[-117.2376, 32.8778], [-117.24, 32.876], [-117.24, 32.8745]]},
            "properties": {"summary": {"distance": 512.3, "duration": 368.1}},
        }
    ]
}


def test_get_route_returns_geometry_flipped_to_lat_lng():
    mock_resp = MagicMock(status_code=200)
    mock_resp.json.return_value = ORS_RESPONSE
    mock_resp.raise_for_status.return_value = None

    with (
        patch("app.routing.settings") as mock_settings,
        patch("app.routing.httpx.post", return_value=mock_resp) as mock_post,
    ):
        mock_settings.ors_api_key = "test-key"
        client = TestClient(app)
        resp = client.get("/api/route", params={"stops": "32.8778,-117.2376;32.8745,-117.24"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["geometry"][0] == [32.8778, -117.2376]  # flipped back to lat, lng
    assert body["distance_m"] == 512.3
    assert body["duration_s"] == 368.1

    # Request to ORS used lng, lat order and the Authorization header.
    _, kwargs = mock_post.call_args
    assert kwargs["json"]["coordinates"][0] == [-117.2376, 32.8778]
    assert kwargs["headers"]["Authorization"] == "test-key"


def test_get_route_502s_when_no_api_key_configured():
    with patch("app.routing.settings") as mock_settings:
        mock_settings.ors_api_key = None
        client = TestClient(app)
        resp = client.get("/api/route", params={"stops": "32.8778,-117.2376;32.8745,-117.24"})

    assert resp.status_code == 502


def test_get_route_502s_when_ors_unreachable():
    with (
        patch("app.routing.settings") as mock_settings,
        patch("app.routing.httpx.post", side_effect=httpx.ConnectError("connection refused")),
    ):
        mock_settings.ors_api_key = "test-key"
        client = TestClient(app)
        resp = client.get("/api/route", params={"stops": "32.8778,-117.2376;32.8745,-117.24"})

    assert resp.status_code == 502


def test_get_route_400s_on_malformed_stops():
    client = TestClient(app)
    resp = client.get("/api/route", params={"stops": "not-a-valid-pair"})
    assert resp.status_code == 400
