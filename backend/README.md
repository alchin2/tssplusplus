# TSS++ Backend

FastAPI service backing the frontend. Serves course search/filter over
the scraped catalog (`data/catalog/*.json`) and per-course detail
(catalog fields + live sections/meetings from MongoDB).

## Endpoints

- `GET /api/courses?dept=CSE&offered=true&q=<query>` -- search/filter,
  returns a lightweight course list (code, name, dept, offered_this_qtr).
- `GET /api/courses/{module_id}` -- full detail: catalog fields
  (prereqs, offered flag) joined via `data/offered/<term>.csv`, plus
  live sections/meetings grouped from the `<term>` MongoDB collection.
- `GET /api/courses/{module_id}/prereqs` -- full transitive prerequisite
  tree, ported from [ClassGraph](https://github.com/nehalc200/classgraph/tree/main/data/helpers)'s
  RootNode/ChildNode AST (see `app/prereqs.py`). Each node carries the
  catalog title (`name`) alongside `code`, joined server-side so the
  frontend's interactive graph (`PrereqGraph`/`lib/prereqGraph.ts`)
  doesn't need a lookup per node. Recurses into every referenced
  course's own prereqs; a `visited` set (per path from the root, not
  global) stops on real cycles instead of recursing forever. Built
  fresh from the local catalog on every request -- no Mongo involved,
  no caching.
- `GET /api/meta` -- term + catalog-wide facts the frontend needs
  before any search: the department dropdown options and the home
  page's headline counts (course count, offered-this-quarter count).
- `GET /api/buildings` -- every building name found in scraped meeting
  locations, mapped to its UCSD GIS coordinates + display abbreviation
  (`data/buildings.json`, built by `scrapers/build_buildings.py`).
- `GET /api/route?stops=lat,lng;lat,lng;...` -- a walking route through
  the given stops in order, proxied through OpenRouteService's
  foot-walking profile so the API key stays server-side. 502s if routing
  is unavailable (no `ORS_API_KEY` configured, ORS unreachable, etc.).
- `GET /health` -- liveness check.

## Running it

From the repo root (uses the shared `requirements.txt` and `.venv`,
same as the scrapers):

```
pip install -r requirements.txt
cd backend
uvicorn app.main:app --reload
```

Docs at `http://localhost:8000/docs`.

## Config

Reads the repo-root `.env`, same file the scrapers use:

- `MONGODB_URI` -- defaults to `mongodb://localhost:27017`
- `MONGODB_DB` -- defaults to `tssplusplus`
- `TSS_TERM` -- defaults to `fa26`; selects both
  `data/offered/<term>.csv` and the Mongo collection to read sections
  from (matches tss_scraper's term-per-collection layout)
- `ORS_API_KEY` -- free key from [openrouteservice.org](https://openrouteservice.org);
  powers `GET /api/route`. Unset means that endpoint always 502s.
- `CORS_ORIGINS` -- comma-separated browser origins allowed to call the API.
  Set this to the exact Vercel deployment URL (and any custom domain), for
  example `https://tssplusplus.vercel.app,http://localhost:5173`.

## Render deployment

The repository includes a root `render.yaml` blueprint. Create a Render web
service from that blueprint and set `MONGODB_URI`, `ORS_API_KEY`, and
`CORS_ORIGINS` in the service environment. Render runs the API with its
provided `$PORT` and checks `/health`.

## Tests

```
cd backend
pytest
```
