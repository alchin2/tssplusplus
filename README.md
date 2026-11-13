<a id="readme-top"></a>

<div align="center">

# TSS++

**A faster, more visual way to browse UCSD courses and plan your quarter.**

**1,100+ users · 5,700+ courses indexed · accurate quarter data**

Course search · prerequisite graphs · schedule planner · campus routing · `.ics` export

[**Check it out here →**](https://tssplusplus.vercel.app)

</div>

---

## Overview

On ~~7/10~~ ~~7/20~~ **7/21 at 8:00 AM PST**, UCSD replaced WebReg with the new Triton Student System (TSS). The rollout came with slow response times, outages, missing features, and a less streamlined course-planning experience.

TSS++ is an open-source alternative for browsing UCSD's schedule of classes and planning a quarter. It combines the public course catalog with each quarter's section data from TSS, renders full transitive prerequisite trees, detects schedule conflicts, maps walking routes between classes, and exports schedules directly to calendar apps.

## Screenshots

The interface takes after UCSD's retired WebReg: search on top, your schedule in
List / Calendar / Finals / Map tabs below.

![Search for Classes with the CSE 100 drawer open: sections table with Plan buttons, description, and prerequisite tree](docs/screenshots/search.png)


<details>
<summary>Mobile</summary>

<img src="docs/screenshots/mobile.png" alt="Mobile view of the planner" width="390">

</details>

## Features

- **Term picker:** switch between every quarter that has been scraped (e.g. the
  current quarter and the next one while enrollment overlaps). Each term keeps
  its own planned schedule.
- **Course search:** full-text search with department, "offered this quarter",
  and division (lower, upper, graduate) filters.
- **Course detail:** sections, meeting times, locations, and instructors, plus
  the catalog description.
- **Prerequisites:** an interactive, zoomable graph of the full transitive
  prerequisite tree, including OR groups.
- **Schedule planner:** plan a section per course, with automatic conflict
  detection and a notice listing every colliding pair. Your plan stays in your
  browser (`localStorage`); there's no login.
- **Book on TSS:** each section row has a Book button under Plan that opens
  that section's TSS booking page in a new tab.
- **My Schedule views:**
  - **List:** a WebReg-style table with section codes, meeting types, times,
    rooms, and final exams.
  - **Calendar:** a weekly FullCalendar grid.
  - **Finals:** the quarter's real finals week.
  - **Map:** a Leaflet map of your buildings, with walking routes between
    back-to-back classes (via OpenRouteService).
- **Import from TSS:** load your enrolled sections from a TSS "My Courses" PDF.
  It's parsed in the browser and never uploaded.
- **`.ics` export:** add your schedule to any calendar app, anchored to the
  real quarter dates and skipping holidays.

## Built with

| Layer        | Stack                                                                            |
| ------------ | -------------------------------------------------------------------------------- |
| **Scrapers** | Python · httpx / requests · BeautifulSoup · MongoDB                              |
| **Backend**  | FastAPI · Pydantic · PyMongo · MongoDB                                           |
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS v4 · FullCalendar · Leaflet · Motion |
| **Hosting**  | Render (API) · Vercel (frontend) · MongoDB Atlas · GitHub Actions                |

## Architecture

The scrapers write course data to `data/` (committed to the repo) and each
quarter's sections to MongoDB. The backend joins the two and serves a JSON API
to the frontend.

```text
 scrapers/              data/ + MongoDB             backend/              frontend/
┌─────────────────┐    ┌──────────────────────┐    ┌────────────────┐    ┌──────────────────┐
│ catalog_scraper ├──▶ │ catalog/*.json       │    │ FastAPI        │    │ Vite + React     │
│                 │    │  courses + prereqs   ├──▶ │ /api/meta      │    │ search · detail  │
│ tss_scraper     ├──▶ │ offered/<term>.csv   │    │ /api/courses   ├──▶ │ planner · finals │
│                 │    │ scraped_quarters.txt │    │ /api/buildings │    │ map · .ics       │
│ build_buildings ├──▶ │ buildings.json       │    │ /api/route     │    │                  │
│                 │    │ MongoDB: one         │    │                │    │                  │
│                 │    │  collection per term │    │                │    │                  │
└─────────────────┘    └──────────────────────┘    └────────────────┘    └──────────────────┘
```

**Terms.** Data is kept per quarter, using codes like `fa26` and `wi27`:
`data/offered/<term>.csv` lists the courses offered that term, and MongoDB holds
one collection of sections per term. The catalog itself is term-independent.
A term shows up in the site's term picker once its scrape has finished and
it's listed in `data/scraped_quarters.txt`; the newest one is the default.

**New quarters.** A daily GitHub Actions workflow watches UCSD's
[Schedule of Classes publication dates](https://blink.ucsd.edu/instructors/courses/schedule-of-classes/publication.html).
When a quarter goes online, it opens an "Update Course Catalog to &lt;quarter&gt;"
issue, posts to Discord, and runs the scrape. See
[`.github/workflows/README.md`](.github/workflows/README.md).

## Repo structure

```text
tssplusplus/
├── scrapers/                          scraping pipeline
│   ├── catalog_scraper/               public course catalog → data/catalog/
│   ├── tss_scraper/                   TSS sections → data/offered/ + MongoDB
│   └── helpers/
│       ├── build_buildings.py         maps meeting locations to UCSD GIS coordinates
│       └── check_publication.py       detects newly published quarters (CI)
├── data/
│   ├── catalog/<DEPT>.json            per-department courses + prerequisites
│   ├── offered/<term>.csv             courses offered in each term
│   ├── scraped_quarters.txt           quarters with a finished scrape
│   └── buildings.json                 campus building coordinates
├── backend/                           FastAPI service (data/ + MongoDB)
├── frontend/                          React + TypeScript app
├── docs/screenshots/                  README images
├── .github/workflows/                 new-quarter scrape automation
├── .env.template
└── requirements.txt                   shared Python dependencies
```

## Getting started

### Prerequisites

- **Python 3.11+** and pip
- **Node.js + npm** for the frontend
- **MongoDB** (local or Atlas) for section data

### Installation

```sh
git clone https://github.com/alchin2/tssplusplus.git
cd tssplusplus
pip install -r requirements.txt
cp .env.template .env      # then fill in the values below
```

### Configuration

All Python components read the repo-root `.env`.

| Variable | Used by | Notes |
| --- | --- | --- |
| `MONGODB_URI` | scrapers, backend | MongoDB connection string. Defaults to `mongodb://localhost:27017`. |
| `MONGODB_DB` | scrapers, backend | Database name. Defaults to `tssplusplus`. |
| `TSS_TERM` | scrapers, backend | Term to scrape, e.g. `fa26`. The backend also always serves it and makes it the default. |
| `ORS_API_KEY` | backend | Free [OpenRouteService](https://openrouteservice.org) key for walking routes. Optional. |
| `CORS_ORIGINS` | backend | Comma-separated frontend origins allowed to call the API. |
| `VITE_API_URL` | frontend | Backend origin, e.g. `https://…onrender.com`. Leave empty locally (the dev server proxies `/api`). |
| `VITE_TILE_URL`, `VITE_TILE_ATTRIBUTION` | frontend | Optional alternative map tiles. |

### Running it

`data/` is committed, so the catalog and offered-course lists are already
there. Only the section data in MongoDB has to be scraped.

1. **Scrape sections** for the term in `TSS_TERM`. This needs a personal TSS
   login cookie; see [`scrapers/tss_scraper/README.md`](scrapers/tss_scraper/README.md).

   ```sh
   cd scrapers/tss_scraper
   python3 main.py --titles-only   # refresh data/offered/<term>.csv
   python3 main.py                 # scrape sections into MongoDB
   ```

2. **Start the backend** on port 8000 (API docs at http://localhost:8000/docs):

   ```sh
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

3. **Start the frontend** at http://localhost:5173. It proxies `/api` to the backend.

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

To refresh the catalog itself, run `python3 main.py` in
`scrapers/catalog_scraper/`. Each component's README has more detail:
[catalog_scraper](scrapers/catalog_scraper/README.md) ·
[tss_scraper](scrapers/tss_scraper/README.md) ·
[backend](backend/README.md) ·
[frontend](frontend/README.md).

### Tests

```sh
cd backend && pytest                    # API
cd scrapers/tss_scraper && pytest       # TSS scraper
cd scrapers/catalog_scraper && pytest   # catalog parser
cd scrapers/helpers && pytest           # publication check
cd frontend && npm run build            # type-check + build
```

## Deployment

- **Backend:** Render, configured by [`render.yaml`](render.yaml). Set
  `MONGODB_URI`, `CORS_ORIGINS`, and optionally `ORS_API_KEY` in the Render
  dashboard. Every push to `main` redeploys, including the data commits made
  by the scrape workflow.
- **Frontend:** Vercel, importing the `frontend/` directory. Set `VITE_API_URL`
  to the Render URL.

## License

[MIT](LICENSE) © 2026 Alexander Chin

<p align="right"><a href="#readme-top">back to top ↑</a></p>
