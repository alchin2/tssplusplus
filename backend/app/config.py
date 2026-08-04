"""
App settings, loaded from the repo-root .env (same file the scrapers
read via python-dotenv) plus sane local defaults.
"""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# config.py -> app -> backend -> repo root.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=PROJECT_ROOT / ".env", extra="ignore")

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "tssplusplus"

    # Both the offered-courses CSV filename (data/offered/<term>.csv)
    # and the Mongo collection name -- matches tss_scraper's term_slug
    # convention (e.g. "fa26"). Named TSS_TERM to avoid colliding with
    # the generic $TERM env var most shells already set.
    term: str = Field(default="fa26", validation_alias="TSS_TERM")

    # OpenRouteService API key for GET /api/route (walking directions
    # between campus buildings). Free tier, sign up at openrouteservice.org.
    # Kept server-side only -- never sent to the frontend.
    ors_api_key: str | None = Field(default=None, validation_alias="ORS_API_KEY")

    @property
    def catalog_dir(self) -> Path:
        return DATA_DIR / "catalog"

    @property
    def offered_dir(self) -> Path:
        return DATA_DIR / "offered"

    @property
    def buildings_path(self) -> Path:
        return DATA_DIR / "buildings.json"


settings = Settings()
