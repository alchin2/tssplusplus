# TSS++ Frontend

Vite + React + TypeScript + Tailwind v4 app implementing the
WebReg-inspired TSS++ interface: course search, course detail,
schedule planner, quarter overview, and campus map. Ported from the
TSS++ Figma Make design and now wired to the FastAPI backend.

## Structure

```
src/
├── App.tsx                  nav + view routing + sliding course-detail panel
├── main.tsx                 entry point
├── types.ts                 Course/Section/Meeting/PlannedItem types
├── components/
│   ├── HomeView.tsx          landing page: headline stats + "Get Started" CTA into search
│   ├── SearchView.tsx        filterable course table
│   ├── CourseDetailPanel.tsx side panel: description, raw prereq text, sections
│   ├── PrereqGraph.tsx       interactive prerequisite tree (SVG) -- built, not yet wired into the panel
│   ├── SectionsTable.tsx     section list with conflict/seat display
│   ├── PlannerView.tsx       FullCalendar-based weekly planner
│   ├── OverviewView.tsx      planned-quarter stats: units, weekly hours, fill, finals
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
├── data/
│   └── prereqs.ts            mock prerequisite data -- only consumer left is the
│                              unwired PrereqGraph.tsx/prereqGraph.ts pair
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

- Course search/filter (`SearchView`) -- `GET /api/courses`.
- Course detail, sections, and raw prereq text (`CourseDetailPanel`)
  -- `GET /api/courses/{module_id}`.
- Department list + headline counts (`useMeta`) -- `GET /api/meta`.
- Building coordinates for the map (`useBuildings`) -- `GET /api/buildings`.
- Walking routes between back-to-back meetings (`MapView`) -- `GET /api/route`,
  falling back to a straight line if routing is unavailable.

`data/prereqs.ts` is the one piece of mock data left. It backs
`PrereqGraph.tsx`/`lib/prereqGraph.ts`, an interactive prerequisite
tree component that isn't rendered anywhere yet -- `CourseDetailPanel`
currently shows the catalog's raw prerequisite text instead. The
backend already serves the real transitive graph at
`GET /api/courses/{module_id}/prereqs`; wiring `PrereqGraph` to that
endpoint (dropping the mock data) is the main thing left.

Course/section colors, previously hand-picked in the mock data, are
now derived deterministically from the course code (`colorFor` in
`lib/api.ts`).

## Build

```
npm run build   # tsc -b && vite build, output in dist/
npm run preview # serve the production build locally
```

## Tech stack

- **React 18 + TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite`, no separate PostCSS config)
- **FullCalendar** (`@fullcalendar/react` + `daygrid`/`timegrid`) for the planner
- **Leaflet** (via `react-leaflet`) for the campus map
- **motion** (Framer Motion) for the sliding detail panel
- **lucide-react** for icons
- **sonner** for toast notifications
