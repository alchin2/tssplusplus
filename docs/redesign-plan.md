# Frontend Redesign — "The Workbench" (one-page)

Implementation plan for the roadmap item **"Frontend Redesign to be one page."**
Branch: `redesign/one-page-workbench`.

This document is the plan only — no feature code lands in this commit.

## Goal

Collapse the five tab-views (`Home · Course Search · Schedule Planner · Overview ·
Map`) into a single workspace where the **weekly calendar is always on screen** and
everything else docks around it. Search moves into a **⌘K command palette**; course
detail, quarter overview, and the campus map live in a right-hand **context dock**.

The identity does not change — teal chrome, WebReg orange, the raccoon, the dense
registrar look, all tokens in `frontend/src/styles/theme.css` stay as-is. This is a
furniture move, not a repaint.

Reference: the interactive mockup this plan is derived from ("Direction A").

## Key finding — most of the calendar already exists

The real components already do much of what the mockup demonstrated, so this is an
information-architecture restructure, not a rebuild:

| Behavior | Where it already lives |
| --- | --- |
| Sat/Sun columns | `PlannerView` / `lib/plannerEvents.ts` — `REG_WEEK` includes `Sa`/`Su`; finals hides only Sunday via `hiddenDays`. |
| WEEKLY / FINALS toggle | `PlannerView` toolbar + `buildFinalsEvents` + real term dates from `lib/academicCalendar.ts` (`finalsWeekISO`). |
| Clickable calendar events | `PlannerView` `eventClick` (currently toggles a highlight). |
| Full course-detail screen | `CourseDetailPanel` = header + description + `PrereqGraph` + `SectionsTable`. |
| Conflict detection | `lib/schedule.ts` `conflictsWith`, `lib/plannerEvents.ts` `conflictingCourseIds`. |
| Planned-state persistence | `hooks/usePlannedItems.ts` (localStorage). |

New work is: the two-zone shell, the command palette, moving a few controls, and
wiring calendar clicks to the dock.

## Locked decisions

1. **Planned-courses list → Overview.** `PlannerView`'s left "PLANNED COURSES"
   sidebar is removed. `OverviewView` becomes the home for the planned list (its
   course cards gain a per-course **remove** control and a conflict badge).
2. **Export ICS + Clear All → the calendar canvas toolbar, next to the
   WEEKLY/FINALS toggle** (the schedule's top control strip). They no longer live in
   the removed sidebar. (If we later prefer them in the global app top bar, that's a
   one-line move.)
3. **Calendar event click → open the course in the Detail dock *and* keep the
   existing dim-others highlight.** Both behaviors fire.
4. **Hand-off:** this plan is committed first; feature code is a follow-up.

## Target layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  🦝 TSS++     [ ⌘K  search courses… ]        WI26 · 4 courses · 16u  ⌾ │  top bar
├───────────────────────────────────────────────┬──────────────────────┤
│  CALENDAR CANVAS (PlannerView)                 │   CONTEXT DOCK        │
│  ┌ WEEKLY | FINALS ───── Export ICS · Clear ┐  │  ┌ Detail│Overview│Map│
│  │                                          │  │                       │
│  │  Mon Tue Wed Thu Fri Sat Sun             │  │  CourseDetailPanel /  │
│  │  (FullCalendar, always visible)          │  │  OverviewView /       │
│  └──────────────────────────────────────────┘  │  MapView              │
└───────────────────────────────────────────────┴──────────────────────┘
   + ⌘K command palette overlay (search + dept/division/offered filters)
```

Below ~900px the two zones stack and the bottom nav returns as a zone switcher
(Calendar / Detail); its Search button opens the palette.

## Phases

### Phase 1 — App shell (`src/App.tsx`)
- Replace the horizontal tab nav + full-view swapping with the two-zone workbench:
  calendar canvas + context dock + command-palette overlay.
- Keep the top bar (logo, term/units summary, GitHub). The middle search field
  becomes the **⌘K palette trigger** (read-only, opens the palette).
- Retire `MainView` state and the `Home / Search / Planner / Overview / Map` tab
  buttons; delete the `HomeView` render path.
- Selection model: `selectedCourseId` in `App` (or a small context) drives the dock's
  Detail pane; set by both the palette and calendar clicks.
- Mobile bottom nav becomes the zone switcher (Calendar / Detail), Search → palette.

### Phase 2 — Command palette (new `src/components/CommandPalette.tsx`)
- Lift `SearchView`'s controls: query input, dept `<select>` (from `useMeta().depts`),
  "Offered this quarter" checkbox, lower/upper division segmented control, and the
  "Clear" affordance.
- Reuse the debounced fetch already in `App.tsx:32-42` (`fetchCourses({ dept,
  offered, q })`) and the client-side division filter (`App.tsx:45-50`).
- ⌘K / Ctrl-K opens; keyboard nav (↑/↓/↵/esc); Enter/click selects a course (opens it
  in the dock) and/or adds a section; palette stays open for multi-add.
- Retire `SearchView` once its results rendering is folded in.

### Phase 3 — Calendar canvas (edit `src/components/PlannerView.tsx`)
- Remove the left "PLANNED COURSES" sidebar (moves to Overview, Phase 4).
- Add **Export ICS** + **Clear All** buttons to the existing toolbar, beside the
  WEEKLY/FINALS toggle. (`downloadICS(items)` and the clear loop already exist.)
- Add an `onSelectCourse(courseId)` prop; `eventClick` calls it **and** keeps
  `toggleHighlight` — clicking a block opens Detail and dims the others.
- The component already fills its container (`h-full`) and re-measures via its
  `ResizeObserver` when the dock opens/closes.

### Phase 4 — Context dock (new `src/components/ContextDock.tsx`)
- Segmented **Detail / Overview / Map** control; renders the existing
  `CourseDetailPanel`, `OverviewView`, `MapView`.
- `CourseDetailPanel`: drop the close ✕ (the dock is permanent) — otherwise unchanged.
- `OverviewView`: add a per-course **remove** button and a conflict badge to each
  card (reuse `conflictingCourseIds`) so it doubles as the planned-courses list.
- Feed the dock `selectedCourse`, `plannedItems`, `onAdd`, `onRemove`. Adding/selecting
  auto-switches the dock to Detail.

### Phase 5 — Cleanup + docs
- Delete `HomeView`, `SearchView` (once fully migrated), and dead `MainView` code.
- Verify keyboard focus states and `prefers-reduced-motion`; keep the existing
  panel/motion transitions where they still apply.
- Update `frontend/README.md` feature list and tick the root `README.md` roadmap item
  *"Frontend Redesign to be one page."*

## Component map (before → after)

| Today | After |
| --- | --- |
| `App.tsx` tab nav + view swap | Two-zone workbench shell + palette overlay |
| `HomeView` | Removed (empty state handled by canvas/dock) |
| `SearchView` (rail) | Folded into `CommandPalette` |
| `PlannerView` (sidebar + calendar) | Calendar canvas; sidebar removed, Export/Clear → toolbar |
| `CourseDetailPanel` (animated side-panel) | Detail segment of `ContextDock` |
| `OverviewView` | Overview segment; gains remove + conflict badge (planned list) |
| `MapView` | Map segment |

Unchanged: `hooks/*`, `lib/*` (`api`, `ics`, `schedule`, `plannerEvents`,
`academicCalendar`, `prereqGraph`, `routeCache`), `PrereqGraph`, `SectionsTable`,
`styles/*`.

## Verification

Launch the frontend (via the `verify` skill / `npm run dev`) and walk:

- [ ] ⌘K opens the palette; typing, dept, division, and offered filters all narrow results
- [ ] Adding from the palette lands a block on the calendar and updates the units/course count
- [ ] Clicking a calendar block opens Detail for that course **and** dims the others
- [ ] Detail dock shows description, prereq graph (zoom/pan/collapse), and sections table
- [ ] Overview lists planned courses with working remove + conflict badges; finals summary intact
- [ ] WEEKLY/FINALS toggle still works (Sat shown, Sun hidden in finals)
- [ ] Export ICS + Clear All work from their new toolbar home
- [ ] Map segment renders pins + walking routes
- [ ] Layout stacks below ~900px; bottom nav switches zones; Search opens palette
- [ ] Planned schedule persists across reload (localStorage)

## Out of scope / follow-ups

- Directions B and C from the mockup (command-canvas / single-scroll) are not built.
- No API, data-model, or backend changes.
- Degree Audit (separate roadmap item) is untouched.

## Rollback

All work is on `redesign/one-page-workbench`; `main` is unaffected. Old components are
kept in place until each is fully migrated, so any phase can be reverted independently.
