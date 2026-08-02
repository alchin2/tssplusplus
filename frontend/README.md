# TSS++ Frontend

Vite + React + TypeScript + Tailwind v4 app implementing the
WebReg-inspired TSS++ interface: course search, prerequisite graph,
and schedule planner. Ported from the TSS++ Figma Make design.

## Structure

```
src/
├── App.tsx                  nav + view routing + sliding course-detail panel
├── main.tsx                 entry point
├── types.ts                 Course/Section/Meeting/PlannedItem types
├── components/
│   ├── HomeView.tsx          landing page + hero search
│   ├── SearchView.tsx        filterable course table
│   ├── CourseDetailPanel.tsx side panel: description, prereq graph, sections
│   ├── PrereqGraph.tsx       interactive prerequisite tree (SVG)
│   ├── SectionsTable.tsx     section list with conflict/seat display
│   └── PlannerView.tsx       weekly calendar planner
├── hooks/
│   └── usePlannedItems.ts    localStorage-backed planner state
├── lib/
│   ├── schedule.ts           time formatting + conflict detection
│   └── prereqGraph.ts        prereq tree layout engine
├── data/
│   ├── courses.ts            mock course/section data
│   └── prereqs.ts            mock prerequisite data
└── styles/                  fonts, Tailwind, theme tokens
```

## Running it

```
cd frontend
npm install
npm run dev
```

Dev server at `http://localhost:5173`.

## Data

`data/courses.ts` and `data/prereqs.ts` are still mock data carried
over from the Figma Make design -- the app doesn't call the backend
yet. Once wired up, `search`/`courses` should come from
`GET /api/courses`, course detail from `GET /api/courses/{module_id}`,
and the prereq graph from `GET /api/courses/{module_id}/prereqs` (see
`backend/README.md`).

## Build

```
npm run build   # tsc -b && vite build, output in dist/
npm run preview # serve the production build locally
```

## Tech stack

- **React 18 + TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite`, no separate PostCSS config)
- **motion** (Framer Motion) for the sliding detail panel
- **lucide-react** for icons
- **sonner** for toast notifications
