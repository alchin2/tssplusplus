# TSS++ Frontend

Vite + React + TypeScript + Tailwind v4 app implementing the TSS++
interface as a single **WebReg-style page**: a navy header band,
an orange "Course Enrollment" title, a **Search for Classes** panel whose
results open as drawers (sections table with Plan buttons, description,
prerequisite tree), a pink conflict notice when planned classes collide,
and a **My Schedule** block with **List | Calendar | Finals | Map** tabs.
Wired to the FastAPI backend.

## Layout

The page scrolls as one document (no fixed app shell), centered by
`.wr-page` whose max-width is in rem so it grows with the fluid root font
on ultrawide displays:

- **Search for Classes** (`SearchPanel`) — input whose results appear as
  you type, Search button, Advanced search (department, division, offered-this-term), and a
  paged results panel of `CourseDrawer`s. ⌘K focuses the input.
- **Course drawer** (`CourseDrawer`) — sections table (Section, Meeting
  Type, Days, Time, Building, Room, Instructor, Status, Action with
  Plan / Change / Remove, plus a FINAL row), catalog description, and the
  `PrereqGraph` with the transcript upload.
- **Conflict notice** (`ConflictNotice`) — lists every colliding pair of
  classes and finals.
- **My Schedule** (`ScheduleTabs`) — List (`ScheduleList`, a WebReg
  status table with Final Exam rows), Calendar and Finals (`PlannerView`,
  FullCalendar), and Map (`MapView`, Leaflet). Print Schedule and
  Export .ics sit on the right of the tab bar. Clicking a List row or a
  calendar block opens that course's drawer above.

## Structure

```
src/
├── App.tsx                  page shell: search state, planner actions, PDF imports
├── main.tsx                 entry point
├── types.ts                 Course/Section/Meeting/PlannedItem types
├── components/
│   ├── SiteHeader.tsx        navy header band
│   ├── SiteFooter.tsx        footer: affiliation note, Report a problem, links
│   ├── SearchPanel.tsx       Search for Classes: live results, advanced form, paged drawers
│   ├── CourseDrawer.tsx      one result drawer: sections table, description, prereqs
│   ├── ConflictNotice.tsx    "You have scheduling conflicts!" box
│   ├── ScheduleTabs.tsx      My Schedule tab bar (List / Calendar / Finals / Map)
│   ├── ScheduleList.tsx      WebReg-style status table of planned classes
│   ├── PlannerView.tsx       FullCalendar weekly/finals grid with class blocks
│   ├── PrereqGraph.tsx       interactive prerequisite tree (SVG), fed by /prereqs
│   ├── TranscriptUpload.tsx  academic-history PDF upload (tints the prereq graph)
│   ├── ScheduleImportButton.tsx  "Import from TSS" link + help popover
│   ├── MapView.tsx           Leaflet campus map with walking routes between meetings
│   └── RaccoonLogo.tsx       inline SVG mascot/logo
├── hooks/
│   ├── usePlannedItems.ts    localStorage-backed planner state
│   ├── useMeta.ts            shared /api/meta fetch (term, depts, counts) + term names
│   └── useBuildings.ts       shared /api/buildings fetch (building abbreviations)
├── lib/
│   ├── api.ts                typed fetch client for the FastAPI backend
│   ├── schedule.ts           time formatting, room splitting, conflict detection/pairs
│   ├── prereqGraph.ts        prereq tree layout engine
│   ├── plannerEvents.ts      planner<->FullCalendar event conversion
│   ├── academicCalendar.ts   real quarter/finals dates
│   ├── ics.ts                .ics file generation for schedule export
│   └── routeCache.ts         caches walking-route responses per stop sequence
└── styles/
    ├── theme.css             design tokens (--wr-*) and base element styles
    ├── webreg.css            component vocabulary (.wr-btn, .wr-table, .wr-tabbar, ...)
    ├── fullcalendar.css      FullCalendar theme (navy axis, class blocks)
    └── layout.css            safe areas, scrollbars, print
```

## Running it

```
cd frontend
npm install
npm run dev
```

Dev server at `http://localhost:5173`.

## Vercel deployment

Import the `frontend/` directory as a Vercel project. Set `VITE_API_URL` to the
Render backend origin, without a trailing slash or `/api` suffix, for example
`https://tssplusplus-api.onrender.com`. The Vercel SPA fallback is defined in
`vercel.json`.

Vercel Web Analytics is supported through Vercel's first-party
`/_vercel/insights/script.js` endpoint. Set `VITE_ANALYTICS_ENABLED=true` in
Vercel when Web Analytics is enabled for the project; it is opt-in so local
development and unconfigured previews do not send analytics.

## Map tiles

The Map tab uses OpenStreetMap's standard tiles by default (no key).
Carto's public basemaps, used previously, now return a "key required"
placeholder to browsers. To use another provider set `VITE_TILE_URL`
(Leaflet template with `{z}/{x}/{y}`) and `VITE_TILE_ATTRIBUTION` in
`.env`; a keyless alternative is Esri's World Light Gray canvas at
`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`.

## Data

The app is wired to the backend via `lib/api.ts`, a typed client whose
DTOs mirror `backend/app/schemas.py`:

- Course search/filter (`SearchPanel`) -- `GET /api/courses`.
- Course detail, sections, and raw prereq text (`CourseDrawer`)
  -- `GET /api/courses/{module_id}`.
- Transitive prerequisite graph (`PrereqGraph`, rendered inside the
  course drawer) -- `GET /api/courses/{module_id}/prereqs`.
- Department list + headline counts (`useMeta`) -- `GET /api/meta`.
- Building coordinates for the map (`useBuildings`) -- `GET /api/buildings`.
- Walking routes between back-to-back meetings (`MapView`) -- `GET /api/route`,
  falling back to a straight line if routing is unavailable.

The app carries no mock data. Course/section colors are derived
deterministically from the course code (`colorFor` in `lib/api.ts`).

## Build

```
npm run build   # tsc -b && vite build, output in dist/
npm run preview # serve the production build locally
```

## Tech stack

- **React 18 + TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite`, no separate PostCSS config)
- **FullCalendar** (`@fullcalendar/react` + `timegrid`) for the planner canvas
- **Leaflet** (via `react-leaflet`) for the campus map
- **lucide-react** for icons
- **sonner** for toast notifications
