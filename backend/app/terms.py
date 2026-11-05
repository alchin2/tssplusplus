"""
Which terms the API can serve, and which one it serves by default.

A term is available once its scrape fully finished and its offered-courses
CSV exists. The publication workflow appends a quarter's Blink label (e.g.
"Winter 2027") to data/scraped_quarters.txt only after the section scrape
succeeds, so a term whose CSV was committed mid-run (sections still
scraping, or failed on a dead cookie) isn't offered yet.

TSS_TERM, when set, is always available -- local scrapes never touch the
marker file -- and pins the default. Otherwise the default is the newest
available term.
"""

import re
from functools import lru_cache

from fastapi import HTTPException, Query

from app.config import settings

# Mirrors scrapers/helpers/check_publication.py's quarter_term (duplicated
# for the same reason as catalog.normalize_code: scrapers/ isn't an
# installable package).
SEASON_PREFIXES = {"fall": "fa", "winter": "wi", "spring": "sp", "summer": "su"}

# Chronological order of seasons within a calendar year, for sorting codes.
SEASON_ORDER = {"wi": 0, "sp": 1, "su": 2, "s1": 2, "s2": 3, "s3": 4, "fa": 5}

TERM_RE = re.compile(r"^([a-z]\d|[a-z]{2})(\d{2})$")


def quarter_term(quarter: str) -> str | None:
    """"Winter 2027" -> "wi27", or None if the label isn't "<Season> <Year>"."""
    parts = quarter.split()
    if len(parts) != 2 or parts[0].lower() not in SEASON_PREFIXES or not parts[1].isdigit():
        return None
    return f"{SEASON_PREFIXES[parts[0].lower()]}{parts[1][-2:]}"


def term_sort_key(term: str) -> tuple[int, int]:
    match = TERM_RE.match(term)
    if not match:
        return (-1, -1)
    season, yy = match.groups()
    return (int(yy), SEASON_ORDER.get(season, -1))


def _scraped_terms() -> set[str]:
    path = settings.scraped_quarters_path
    if not path.exists():
        return set()
    terms = (quarter_term(line.strip()) for line in path.read_text(encoding="utf-8").splitlines())
    return {t for t in terms if t}


@lru_cache(maxsize=1)
def available_terms() -> list[str]:
    """Servable term codes, newest first."""
    candidates = _scraped_terms()
    if settings.term:
        candidates.add(settings.term)
    servable = {t for t in candidates if (settings.offered_dir / f"{t}.csv").exists()}
    return sorted(servable, key=term_sort_key, reverse=True)


def default_term() -> str | None:
    terms = available_terms()
    if settings.term in terms:
        return settings.term
    return terms[0] if terms else None


def selected_term(
    term: str | None = Query(None, description="Term code, e.g. fa26; defaults to the default term"),
) -> str:
    """FastAPI dependency: the requested term, or the default when omitted.
    404s for a term with no servable data."""
    resolved = term.lower() if term else default_term()
    if resolved is None:
        raise HTTPException(status_code=503, detail="No term data is available yet")
    if resolved not in available_terms():
        raise HTTPException(status_code=404, detail=f"No data for term {resolved!r}")
    return resolved
