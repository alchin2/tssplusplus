"""
In-memory cache of data/buildings.json -- maps each building name that
appears in scraped meeting locations (e.g. "Peterson Hall") to its UCSD
GIS record, built by scrapers/build_buildings.py.
"""

import json
from functools import lru_cache

from app.config import settings


@lru_cache(maxsize=1)
def get_buildings() -> dict[str, dict]:
    if not settings.buildings_path.exists():
        return {}

    with settings.buildings_path.open(encoding="utf-8") as f:
        return json.load(f)["buildings"]
