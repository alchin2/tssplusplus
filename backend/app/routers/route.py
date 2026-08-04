from fastapi import APIRouter, HTTPException, Query

from app.routing import fetch_walking_route
from app.schemas import RouteResult

router = APIRouter(prefix="/api", tags=["route"])


def _parse_stops(stops: str) -> list[tuple[float, float]]:
    parsed = []
    for pair in stops.split(";"):
        try:
            lat_str, lng_str = pair.split(",")
            parsed.append((float(lat_str), float(lng_str)))
        except ValueError:
            raise HTTPException(status_code=400, detail="stops must be ';'-separated 'lat,lng' pairs") from None
    return parsed


@router.get("/route", response_model=RouteResult)
def get_route(stops: str = Query(..., description="';'-separated 'lat,lng' pairs, in visiting order")):
    """GET /api/route?stops=32.88,-117.24;32.87,-117.23 -- a walking route
    through the given stops in order, proxied through OpenRouteService's
    foot-walking profile (see app/routing.py) so the API key stays
    server-side. 502s if routing is unavailable (no key configured, ORS
    unreachable, etc.) -- the frontend falls back to a straight line."""
    result = fetch_walking_route(_parse_stops(stops))
    if result is None:
        raise HTTPException(status_code=502, detail="routing unavailable")
    return result
