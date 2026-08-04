from fastapi import APIRouter

from app.buildings import get_buildings
from app.schemas import Building

router = APIRouter(prefix="/api", tags=["buildings"])


@router.get("/buildings", response_model=dict[str, Building])
def list_buildings():
    """GET /api/buildings -- every building name that appears in scraped
    meeting locations, mapped to its UCSD GIS coordinates + display
    abbreviation. Keyed by the same location string
    frontend/src/lib/api.ts's parseSched extracts into Meeting.room
    (location minus the trailing "Room ..."), so the frontend can look a
    meeting's building up by exact key -- no fuzzy matching needed."""
    return get_buildings()
