<a id="readme-top"></a>

<div align="center">

# TSS++

**An alternative way to browse UCSD's schedule of classes and plan your quarter.**

Course search · live section data · prerequisite graphs · schedule planner · campus map · `.ics` export

</div>

---

On ~~7/10~~ ~~7/20~~ **7/21 8:00am PST** UCSD replaced the beloved WebReg with the new
Triton Student System (TSS). TSS++ is a friendlier way to browse the schedule of
classes and build your schedule, no TritonGPT required. It pairs the public course
catalog with live section/seat data, renders full transitive prerequisite trees, and
lets you plan a conflict-free quarter you can export to any calendar app.

> [!NOTE]
> This project is WIP. The prerequisite graph is built and cached server-side
> (`GET /api/courses/{module_id}/prereqs`) but the frontend doesn't render it as an
> interactive tree yet. See the [Roadmap](#roadmap) for more.

## Features

- **Course search** — filter by department and "offered this quarter", full-text query,
  served from the backend.
- **Course detail** — sections, meeting times, instructors, and live seat/waitlist counts.
- **Prerequisites** — raw catalog prerequisite text per course; the full transitive
  graph (ported from [ClassGraph](https://github.com/nehalc200/classgraph)) is built and
  cached in MongoDB by the backend, not yet rendered in the UI.
- **Schedule planner** — a FullCalendar based weekly view with automatic conflict
  detection; state lives in your browser (`localStorage`).
- **Overview** — Stats for your planned quarter: units, weekly hours, average
  section fill, and a computed finals schedule.
- **Campus map** — a Leaflet map pinning every planned course's building, with real
  walking routes between back-to-back meetings (proxied through OpenRouteService).
- **ICS export** — export your planned schedule to a standard `.ics` file, anchored to
  the real quarter dates.

## Built with

| Layer        | Stack |
| ------------ | ----- |
| **Scrapers** | Python 3.11+ · httpx / requests · BeautifulSoup · MongoDB |
| **Backend**  | FastAPI · Pydantic · PyMongo · MongoDB |
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS v4 · FullCalendar · Leaflet · motion |

## Architecture

The scrapers write to `data/` and MongoDB, the backend reads from both and serves a JSON
API, and the frontend consumes that API.

```
  scrapers/                 data/ + MongoDB              backend/                    frontend/
 ┌───────────────┐        ┌──────────────────┐        ┌─────────────────────┐     ┌──────────────────┐
 │ catalog_scraper│ write │ catalog/*.json    │  read  │ FastAPI service      │ API │ Vite + React app │
 │ tss_scraper    │ ────▶ │  (courses,prereqs,│ ─────▶ │  /api/courses(/{id}) │────▶│  search · detail │
 │ mark_offered…  │       │   offered flag)   │        │  /…/{id}/prereqs     │HTTP │  planner · map   │
 │ build_buildings│       │  buildings.json)  │        │  /api/meta           │JSON │  overview        │
 └───────────────┘        │ MongoDB (sections,│        │  /api/buildings      │     │  ICS export      │
                          │  seats, waitlist) │        │  /api/route          │     └──────────────────┘
                          └──────────────────┘        └─────────────────────┘
```

## Repo structure

```
tssplusplus/
├── scrapers/                         the scraping pipeline
│   ├── catalog_scraper/              public catalog scraper
│   ├── tss_scraper/                  live TSS section/meeting scraper 
│   ├── helpers/
│       ├── mark_offered_courses.py   cross-references the two, sets offered_this_qtr in data/catalog/
│       └── build_buildings.py        maps scraped meeting locations to UCSD GIS records → data/buildings.json
├── data/                             
│   ├── catalog/<CODE>.json        per-department course data
│   ├── offered/<term>.csv         per-term list of offered courses
│   └── buildings.json             campus buildings: abbreviation + Lat/Long
├── backend/                       FastAPI service reading data/ + MongoDB — see backend/README.md
├── frontend/                      React + TypeScript web app — see frontend/README.md
├── .gitignore                   
├── .env.template         
└── requirements.txt               shared Python deps (scrapers + backend)
```

## Getting started

### Prerequisites

- **Python 3.11+** and pip
- **Node.js + npm** — for the frontend
- **MongoDB** (local or Atlas) — backs `tss_scraper`'s section data and the backend API

### Installation

1. Clone the repo:
   ```sh
   git clone https://github.com/alchin2/tssplusplus.git
   cd tssplusplus
   ```
2. Install the shared Python dependencies:
   ```sh
   pip install -r requirements.txt
   ```
3. Copy `.env.template` to `.env` and fill it out
   ```sh
   cp .env.template .env
   ```

   > [!IMPORTANT]
   > `tss_scraper` additionally needs a personal TSS login cookie. See
   > [`scrapers/tss_scraper/README.md`](scrapers/tss_scraper/README.md) for the full
   > walkthrough.

### Running it

Run the pieces in order. Each has its own README with the details.

```sh
# 1. Populate the data - see scrapers/README.md
(cd scrapers/catalog_scraper && python3 main.py)   # Catalog Scraper
(cd scrapers/tss_scraper && python3 main.py)       # TSS Scraper
(cd scrapers && python3 mark_offered_courses.py)   
(cd scrapers && python3 build_buildings.py)         

# 2. Backend — see backend/README.md
cd backend && uvicorn app.main:app --reload   # docs at http://localhost:8000/docs

# 3. Frontend — see frontend/README.md
cd frontend && npm install && npm run dev      # http://localhost:5173
```


## API

The backend exposes course, meta, buildings, and routing endpoints (plus `/health`).
Full contract in [`backend/README.md`](backend/README.md).

| Endpoint | Description |
| -------- | ----------- |
| `GET /api/courses?dept=CSE&offered=true&q=<query>` | Search/filter, returns a lightweight course list |
| `GET /api/courses/{module_id}` | Full detail: catalog fields + live sections/meetings from MongoDB |
| `GET /api/courses/{module_id}/prereqs` | Full transitive prerequisite graph, cached in MongoDB |
| `GET /api/meta` | Term + catalog-wide facts: department list, course/offered counts |
| `GET /api/buildings` | Every scraped meeting location mapped to its UCSD GIS coordinates |
| `GET /api/route?stops=lat,lng;...` | Walking route through the given stops, via OpenRouteService |

## Roadmap

- [x] Static catalog scraper
- [x] Dynamic TSS scraper
- [x] MongoDB setup
- [x] Initial UI/UX design
- [x] API endpoints
- [x] Connect frontend to backend
- [x] Class search feature
- [x] Course planner feature
- [x] Campus map + walking routes
- [x] ICS export feature
- [x] Interactive prerequisite viewer
- [ ] Cron job to check for schedule updates and scrape data automatically
- [ ] Archive enrollment data (seats + waitlist) from FA26 2nd pass onward and publish it as a public CSV dataset

## Contributing

Contributions and Ideas are always welcome! Here is how to help:

1. **Fork** the repo and create your feature branch.
2. **Commit** changes with clear messages.
3. **Push** to your branch and open a Pull Request.

You can also reach me directly on discord `@alowo`

## Acknowledgments

- [WebReg++](https://github.com/yxli001/webregplusplus) — an archived alternative course
  browser that inspired this project.
- [ClassGraph](https://github.com/nehalc200/classgraph) — the prerequisite viewer whose
  AST approach this project reuses (built with a team for DS3's WI26 Projects cohort).
- [WebRegToICS](https://github.com/alchin2/webreg-to-ics) - A webreg to ics converter i previously built,
  used export code for .ics export feature
- Shoutout Claude Code.

<p align="right"><a href="#readme-top">back to top ↑</a></p>
