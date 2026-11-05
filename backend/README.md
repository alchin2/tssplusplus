# TSS++ Backend

FastAPI service backing the frontend. Serves course search/filter over
the scraped catalog (`data/catalog/*.json`) and per-course detail
(catalog fields + live sections/meetings from MongoDB).

## Endpoints

Every course endpoint and `/api/meta` take an optional `?term=wi27`;
omitted, they use the default term. A term with no servable data 404s.

- `GET /api/courses?term=fa26&dept=CSE&offered=true&q=<query>` --
  search/filter, returns a lightweight course list (code, name, dept,
  offered_this_qtr). "Offered" and `module_id` come from the term's
  `data/offered/<term>.csv`, not a flag stored in the catalog.
- `GET /api/courses/{module_id}?term=fa26` -- full detail: catalog fields
  (prereqs) joined via `data/offered/<term>.csv`, plus live
  sections/meetings grouped from the `<term>` MongoDB collection.
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
- `GET /api/meta` -- the servable `terms` (newest first),
  `default_term`, the requested `term`, plus catalog-wide facts the
  frontend needs before any search: the department dropdown options and
  headline counts (course count, offered count for the term).
- `GET /api/buildings` -- every building name found in scraped meeting
  locations, mapped to its UCSD GIS coordinates + display abbreviation
  (`data/buildings.json`, built by `scrapers/build_buildings.py`).
- `GET /api/route?stops=lat,lng;lat,lng;...` -- a walking route through
  the given stops in order, proxied through OpenRouteService's
  foot-walking profile so the API key stays server-side. 502s if routing
  is unavailable (no `ORS_API_KEY` configured, ORS unreachable, etc.).
- `GET /health` -- liveness check.

A term is servable once it's listed in `data/scraped_quarters.txt` (the
publication workflow appends it only after the section scrape succeeds)
and its `data/offered/<term>.csv` exists. See `app/terms.py`.

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
- `TSS_TERM` -- optional, e.g. `fa26`. Always servable (handy for a
  local scrape that isn't in `scraped_quarters.txt`) and pinned as the
  default term. Unset, the newest servable term is the default.
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
