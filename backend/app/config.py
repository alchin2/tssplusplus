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

    # Optional term code (e.g. "fa26") to pin as the default term and
    # always serve, even if it's not in data/scraped_quarters.txt (see
    # app/terms.py). Unset, the newest fully scraped term is the default.
    # Named TSS_TERM to avoid colliding with the generic $TERM env var
    # most shells already set.
    term: str | None = Field(default=None, validation_alias="TSS_TERM")

    # OpenRouteService API key for GET /api/route (walking directions
    # between campus buildings). Free tier, sign up at openrouteservice.org.
    # Kept server-side only -- never sent to the frontend.
    ors_api_key: str | None = Field(default=None, validation_alias="ORS_API_KEY")

    # Comma-separated browser origins, e.g. "https://tssplusplus.vercel.app,http://localhost:5173".
    # Keeping this server-side avoids hard-coding a production hostname in the API.
    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        validation_alias="CORS_ORIGINS",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def catalog_dir(self) -> Path:
        return DATA_DIR / "catalog"

    @property
    def offered_dir(self) -> Path:
        return DATA_DIR / "offered"

    @property
    def scraped_quarters_path(self) -> Path:
        return DATA_DIR / "scraped_quarters.txt"

    @property
    def buildings_path(self) -> Path:
        return DATA_DIR / "buildings.json"


settings = Settings()
