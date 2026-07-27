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
  RootNode/ChildNode AST (see `app/prereqs.py`). Recurses into every
  referenced course's own prereqs; a `visited` set (per path from the
  root, not global) stops on real cycles instead of recursing forever.
  Regenerates on every request and upserts a cached copy into the
  `prereq_graphs` Mongo collection, keyed by course code.
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

## Tests

```
cd backend
pytest
```
