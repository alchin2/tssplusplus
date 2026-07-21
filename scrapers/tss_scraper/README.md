# tss_scraper

Scrapes UCSD's TSS (Triton Student System) for real, live section and
meeting data -- times, locations, instructors, seat/waitlist counts --
none of which is in the public catalog. TSS is a SAP Fiori app backed by
an undocumented OData v4 API; this was built by reverse-engineering its
network traffic.

Unlike `catalog_scraper`, this needs a live, personal login session, and
writes to MongoDB instead of JSON files.

## Setup

1. Log into https://tss.ucsd.edu/fiori in Chrome as normal.
2. DevTools (F12) -> Network -> Fetch/XHR -> reload the page once.
3. Click any request to `tss.ucsd.edu`, copy the `cookie` request
   header's full value into a new file called `cookie.txt`, next to
   `main.py`. Don't share or commit this file -- it's your login,
   and it's already gitignored.
4. Add `MONGODB_URI` (and optionally `MONGODB_DB`) to a `.env` file at
   the repo root. See `.env.example` at the root level
5. `pip install -r requirements.txt` (from the repo root).

Sessions expire -- if a request comes back 401/403 you'll get a clear
error; redo steps 1-3.

## Running it

Two steps, run from `scrapers/tss_scraper/`:

```
python3 main.py --titles-only   # refresh the course list for the term
python3 main.py                 # scrape sections+meetings, upsert to MongoDB
```

`--titles-only` fetches every course's title record and writes just
`module_id,code,name` to `data/offered/<term>.csv` (e.g. `fa26.csv`).
The default run reads that CSV instead of re-fetching titles every
time, so run `--titles-only` again whenever you want to refresh it.

Both default to `--peryr 2026 --perid 2` (Fall 2026, the only
confirmed `Perid`). Pass `--peryr`/`--perid` for other terms.

Re-running the default scrape is idempotent -- it upserts one document
per course per term, keyed on `(module_id, peryr, perid)`, so it won't
duplicate data.

## How it works

- `main.py` -- the CLI tying it together.
- `tools/session.py` -- cookie-based auth and the shared `get()` wrapper.
- `tools/titles.py` -- bulk course title list (`YUCSD_I_SM_TITLE`).
- `tools/events_parser.py` -- Parser for `Sched` field returns `(days, times, modality, location, optional final exam)`
- `tools/sections.py` -- fetches one course's flat event rows
  (`YUCSD_CON_MODULE(...)/_sections`) and groups them by package into
  real sections, each with its meetings.
- `tools/storage.py` -- MongoDB upsert (collection defaults to `fa26`).

Each MongoDB document also keeps the untouched raw API rows in a `raw`
field, so a grouping/parsing bug can be fixed by reprocessing instead of
re-scraping (re-scraping costs a live session and is rate-limited).
