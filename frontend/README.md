# TSS++ Frontend

Vite + React + TypeScript + Tailwind v4 app implementing the
WebReg-inspired TSS++ interface as a single-page **workbench**: a
persistent weekly-calendar canvas on the left and a context dock
(course detail / quarter overview / campus map) on the right, with
course search living in a ⌘K command palette. Wired to the FastAPI
backend.

## Layout

Two zones sit side by side under the top bar (they stack into one
zone at a time on mobile, switched from the bottom nav):

- **Calendar canvas** (`PlannerView`) — the weekly/finals timegrid;
  always rendered, even when empty. Click an event to open it in the
  dock; click the event's top-right × to remove it.
- **Context dock** (`ContextDock`) — a segmented Detail / Overview /
  Map switcher, ~440px wide on desktop.
- **Command palette** (`CommandPalette`) — ⌘K (or the top-bar search
  field) opens a filterable course search overlay; picking a course
  opens it in the dock's Detail tab.

## Structure

```
src/
├── App.tsx                  two-zone workbench shell + ⌘K palette wiring
├── main.tsx                 entry point
├── types.ts                 Course/Section/Meeting/PlannedItem types
├── components/
│   ├── CommandPalette.tsx    ⌘K course-search overlay (dept/division/offered filters)
│   ├── PlannerView.tsx       FullCalendar weekly/finals canvas + export/clear toolbar
│   ├── ContextDock.tsx       segmented Detail / Overview / Map switcher
│   ├── CourseDetailPanel.tsx dock Detail: description, prereq graph, sections
│   ├── PrereqGraph.tsx       interactive prerequisite tree (SVG), fed by /prereqs
│   ├── SectionsTable.tsx     section list with conflict/seat display
│   ├── OverviewView.tsx      planned-quarter stats + per-course cards + finals summary
│   ├── MapView.tsx           Leaflet campus map with walking routes between meetings
│   └── RaccoonLogo.tsx       inline SVG mascot/logo
├── hooks/
│   ├── usePlannedItems.ts    localStorage-backed planner state
│   ├── useMeta.ts            shared /api/meta fetch (term, depts, counts)
│   └── useBuildings.ts       shared /api/buildings fetch
├── lib/
│   ├── api.ts                typed fetch client for the FastAPI backend
│   ├── schedule.ts           time formatting + conflict detection
│   ├── prereqGraph.ts        prereq tree layout engine
│   ├── plannerEvents.ts      planner<->FullCalendar event conversion
│   ├── academicCalendar.ts   real quarter/finals dates
│   ├── ics.ts                .ics file generation for schedule export
│   └── routeCache.ts         caches walking-route responses per stop sequence
└── styles/                  fonts, Tailwind, theme tokens, FullCalendar overrides
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

## Data

The app is wired to the backend via `lib/api.ts`, a typed client whose
DTOs mirror `backend/app/schemas.py`:

- Course search/filter (`CommandPalette`) -- `GET /api/courses`.
- Course detail, sections, and raw prereq text (`CourseDetailPanel`)
  -- `GET /api/courses/{module_id}`.
- Transitive prerequisite graph (`PrereqGraph`, rendered in the
  Detail panel) -- `GET /api/courses/{module_id}/prereqs`.
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
