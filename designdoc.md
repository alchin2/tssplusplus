# TSS++ Design Doc

## Overview

An alternative to TSS/webreg for browsing UCSD's schedule of classes:
search + filter courses, see section/meeting data, view prerequisites
as a graph, and building schedules that can be exported.

## Roadmap

### Done

- [x] Catalog scraper (`scrapers/catalog_scraper`) -- `data/catalog/*.json`
- [x] TSS scraper (`scrapers/tss_scraper`) -- `data/offered/<term>.csv` + MongoDB sections
- [x] Matcher (`mark_offered_courses.py`) -- `offered_this_qtr` set on every catalog course
- [x] All scraped data landed in MongoDB / `data/catalog`

### Next, in priority order

- [ ] **UI design** -- no code dependency on anything below; nails down IA/look before screens get built against it.
- [ ] **Search feature + backend APIs** -- first real backend work: `GET /api/courses` (search/filter) and `GET /api/courses/{module_id}` (detail data source). Everything below depends on this existing.
- [ ] **Detailed view** -- consumes `GET /api/courses/{module_id}`; sections/meetings/seats display + "add to schedule" action.
- [ ] **Course planner** -- client-only (localStorage), consumes the "add to schedule" action from the detailed view; FullCalendar.io rendering.
- [ ] **Prerequisite viewer** -- `GET /api/courses/{module_id}/prereqs`, full transitive AST (ported from ClassGraph) + D3.js rendering. Sequenced after the planner since it's the heavier backend lift (recursive graph generation + Mongo caching) and isn't blocking anything else.
- [ ] **ICS export** -- exports whatever's in the planner to a `.ics` file; last because there's nothing to export until the planner exists.

## Features 

1. Search bar with department filter + toggle for "offered this quarter"
2. Detail view per course: sections, meeting times, instructors, seats/waitlist
3. Schedule planner with an embedded calendar
4. Prerequisite viewer (ClassGraph remake)
5. ICS export of the planned schedule

Possible Extensions (Out of Scope Currently)
- CRON to pull new json during registration week to track enrollment data (might need bigger db or restrict departments)
- Steal TritonGPT's prompt and integrate it locally
- Mobile App


## Data Pipeline (finished)

### Catalog Scraper (`scrapers/catalog_scraper`)

BeautifulSoup + HTML fetching against the public course catalog 

Artifacts: 
- `data/catalog/<CODE>.json` -- one file per department, each
- Courses has `name`, `code`, `raw_prereq`, `prerequisites`(2 layer ast tree) and `offered_this_qtr` (defaults to false)

### TSS Scraper (`scrapers/tss_scraper`)

Reverse-engineered access to TSS's OData v4 API. Requires a live, personal TSS login cookie.

Artifacts:
- `data/offered/<term>.csv` -- every course offered this term (module_id, code, name)
- MongoDB (`fa26` collection) -- one document per course  with grouped sections, meetings, instructors, and seat/waitlist counts

**Run cadence:** TSS's schedule of classes only changes when the
school publishes/updates it so scraper doesnt need to be run often,
might add a cron job or something later for this

**Cookie auth:** manual for now (log in, copy the cookie per the
scraper's README). maybe playwright or other browser agent can fetch cookie 
in the future

### Matcher (`scrapers/mark_offered_courses.py`)

catalog_scraper and tss_scraper format codes differently (`"CSE 8A"`
vs `"CSE-008A"`). This normalizes both and sets `offered_this_qtr` on
every course in `data/catalog/*.json`.

## Frontend

### Overview / Search view

Search + filter by department and `offered_this_qtr`. 
- backend serves a filtered  endpoint 
`/api/courses?dept=CSE&offered=true&q=<query>`

### Detail view

Click a course -> fetch its sections from the backend (Mongo-backed,
live-ish seat/waitlist data) -> render sections/meetings -> "add to
schedule" action.

### Prerequisite viewer

Full transitive multi-course prerequisite graph (not just the
course's own 2-level tree), rendered with D3.js. Ported from
[ClassGraph's `data/helpers/ast.py` +
`astclass.py`](https://github.com/nehalc200/classgraph/tree/main/data/helpers)
approach:
- `RootNode`/`ChildNode` classes, each serializing to `{code, type: "ROOT"|"CHILD", children: [...]}`
- recursively resolves each prereq course's own prerequisites (reusing the 2-level `prerequisites` tree already stored per course in `data/catalog/<CODE>.json` as the base case), branching on AND/OR
- a `visited` set guards against cycles -- this is the only guard we actually need. ClassGraph's per-course/per-dept recursion-depth caps (COGS 118A/B, PHYS 4A-D, CHIN) existed because they precomputed full department-wide trees ahead of time and needed to bound output size; we generate one course's graph per request instead, so we don't inherit that problem. Same underlying catalog, so real cycles (courses whose prereqs depend on each other) will still show up and need the visited-set guard -- but the PHYS 4A-D case specifically shouldn't need a special-case here

### Schedule planner

Embedded calendar via [FullCalendar.io](https://fullcalendar.io/);
add/remove sections from the detail view, conflict detection between
selected sections. Client-only, see Class Scheduler.

### ICS export

Exports the planner's current selections to a `.ics` file, generated
client-side from the same section/meeting data already in the
planner's state -- no backend endpoint needed.

## Backend / API

Endpoints, normalized to REST conventions (`snake_case`, path params,
no bare `=` in the path):

- `GET /api/courses?dept=CSE&offered=true&q=<query>` -- search/filter, returns lightweight course list (code, name, offered_this_qtr)
- `GET /api/courses/{module_id}` -- full detail: catalog fields + live sections/meetings (Mongo query on `module_id`)
- `GET /api/courses/{module_id}/prereqs` -- full transitive prerequisite graph (see Prerequisite viewer)

`module_id` is already the natural key end-to-end (catalog codes ->
normalized match -> TSS's `Smobjid`/`ModuleID`), so endpoints should
key on it consistently instead of introducing a second "code" lookup
path.

**Prereq generation/caching:** on a `/prereqs` request, the backend
builds the AST locally (walking `data/catalog/*.json`, same as
ClassGraph's script) and returns it to the client, and also upserts a
copy into MongoDB as a cache. Since catalog data only changes when
catalog_scraper re-runs (infrequent), a generated graph stays valid
until the next scrape -- no need for time-based cache expiry, just
regenerate/overwrite the cached copy whenever catalog_scraper runs.

## Class Scheduler

Client-only: schedule lives in `localStorage`/frontend state via
FullCalendar.io, no backend endpoints, no accounts. Nothing persists
across devices/browsers for v1.

## Tech stack

- **Frontend:** React + Tailwind CSS
- **Prereq graph rendering:** D3.js
- **Calendar/schedule rendering:** [FullCalendar.io](https://fullcalendar.io/)
- **Backend:** Python (FastAPI) -- chosen over Express to reuse the scraper code and the ClassGraph AST port directly instead of rewriting that logic in JS

## Open questions

- **Automatic cookie refresh.** Whether Playwright-driven login is
  worth building, and whether it's within TSS's terms of use --
  revisit once manual re-auth actually becomes a bottleneck.
- **Cookie-death notification channel.** Email/Slack/other -- not
  blocking v1, manual monitoring is fine at quarterly cadence.
- **Cycle detection for the prereq graph.** Resolved -- see
  Prerequisite viewer. Since we generate one course's graph per
  request (not precomputed full-department trees like ClassGraph),
  ClassGraph's depth-cap overrides don't carry over; the `visited`-set
  cycle guard should be enough on its own. Still worth confirming
  against real mutually-recursive courses once the endpoint exists.

## Acknowledgments / prior art

- [ClassGraph](https://github.com/nehalc200/classgraph) -- prereq
  viewer this design reuses ideas from
- [WebReg++](https://github.com/yxli001/webregplusplus) -- prior
  alternative course browser
