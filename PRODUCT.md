# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

UC San Diego students planning and tracking a quarter's course schedule, typically in the weeks around enrollment appointments. They are fluent in the campus registrar vocabulary (section codes like A00/A01, LE/DI/LA meeting types, TuTh patterns, finals matrix) and usually have TSS open in another tab. *(Inferred from README and code; confirmed indirectly by the user's brief.)*

## Product Purpose

TSS++ is a faster, friendlier front end to UCSD's public Schedule of Classes. It replaced the workflow students lost when WebReg was retired for the Triton Student System (TSS) on 7/21/2025: search the catalog, read a course's full transitive prerequisite tree, pick sections, see the week and finals week on a calendar with conflict detection, map the walk between buildings, and export to `.ics`. Success is a student building a conflict-free quarter in minutes without TritonGPT or TSS's slow pages.

## Positioning

The one place that pairs the public catalog (titles, descriptions, prerequisites as a resolved tree) with the live quarterly section data, on a single page, with planner state kept in the browser. Neighboring tools (TSS, Chrome extensions) show either enrollment or a calendar, not prerequisites, finals, and campus routing together.

## Operating Context

- Browser app (Vite + React), desktop first; the maintainer views it in Arc at 2000px+ widths, and it must also work on a phone.
- Reads a FastAPI backend (`/api/meta`, `/api/courses`, `/api/courses/{id}`, `/api/courses/{id}/prereqs`, `/api/buildings`, `/api/route`); the backend needs MongoDB and scraped data, so frontend verification stubs `/api/*`.
- Planner state lives in `localStorage["tss-planned"]`; there is no login.
- Two PDF imports: a TSS "My Courses" PDF (replaces the planner with enrolled sections) and an academic-history PDF (tints completed/in-progress prerequisites). Both parse client-side with pdf.js.
- Term is reported by `/api/meta` as a code like `fa26`.

## Capabilities and Constraints

- Course search filtered server-side by department, offered-this-quarter, and free text; lower/upper division filtered client-side.
- Course detail: description, prerequisite graph (zoomable, OR groups, planned/completed/in-progress tinting), sections with instructor and meetings. Live seat counts were removed (issue #22) and must not be shown.
- Planner: one booked section per course; booking a different section switches it. Conflict detection per meeting block. Weekly and finals views. ICS export anchored to real quarter dates.
- Map: Leaflet with CartoDB tiles, pins per building, walking route via OpenRouteService proxy, straight-line fallback.
- Mobile shows one zone at a time with a bottom switcher.
- No affiliation with UC San Diego; the UI must not present itself as an official UCSD product or use the university's trademarks.

## Brand Commitments

- Name: TSS++ (the `++` reads as "WebReg-era quality, plus").
- Mascot: the raccoon sticker logo (`RaccoonLogo.tsx`). The user gave free rein, so it may be re-cut but should remain the mascot unless they say otherwise.
- Visual direction pinned by the user on 2026-11-02: "WebReg-flavored, modern finish" taking inspiration from old UCSD WebReg screenshots, with WebReg's tabbed List | Calendar page structure rather than the previous calendar-plus-dock workbench.

## Evidence on Hand

- Real catalog and section data via the backend; `data/catalog/*.json` and `data/buildings.json` in the repo.
- README feature list and architecture diagram.
- UCSD's public "WebReg 2.0 demo" slide deck (academicaffairs.ucsd.edu, 2015) as the reference for WebReg's structure: list or calendar views, finals tab, term switch, Enroll/Plan actions.
- No testimonials, metrics, or user counts exist; do not fabricate any.

## Product Principles

1. The registrar's vocabulary, not a startup's: section codes, meeting types, status words students already know.
2. Dense and scannable beats spacious and pretty; a whole quarter should fit on one screen.
3. Every state is visible: planned, conflict, not offered, loading, unavailable backend.
4. Nothing destructive without a visible consequence: imports that replace the planner say so.
5. Fast on first paint; heavy libraries (pdf.js) load on demand.
