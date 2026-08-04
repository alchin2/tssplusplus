"""
Walking directions between campus buildings via OpenRouteService's
foot-walking profile (https://openrouteservice.org). The API key stays
server-side -- this is the only thing that ever calls ORS.
"""

import httpx

from app.config import settings

ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson"


def fetch_walking_route(stops: list[tuple[float, float]]) -> dict | None:
    """stops: ordered (lat, lng) waypoints a route must pass through, in
    order. Returns {geometry, distance_m, duration_s} with geometry as
    (lat, lng) pairs (Leaflet's order, not GeoJSON's), or None on any
    failure -- no API key configured, network error, non-2xx response, or
    an unexpected body shape. Never raises, so a routing hiccup can't take
    the map view down with it."""
    if len(stops) < 2 or not settings.ors_api_key:
        return None

    try:
        resp = httpx.post(
            ORS_DIRECTIONS_URL,
            json={"coordinates": [[lng, lat] for lat, lng in stops]},
            headers={"Authorization": settings.ors_api_key},
            timeout=10.0,
        )
        resp.raise_for_status()
        feature = resp.json()["features"][0]
        summary = feature["properties"]["summary"]
        return {
            "geometry": [[lat, lng] for lng, lat in feature["geometry"]["coordinates"]],
            "distance_m": summary["distance"],
            "duration_s": summary["duration"],
        }
    except (httpx.HTTPError, KeyError, IndexError, TypeError):
        return None
