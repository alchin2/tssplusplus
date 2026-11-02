---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: ["frontend/src/components/SearchPanel.tsx","frontend/src/components/ScheduleTabs.tsx","frontend/src/styles/webreg.css"]
---

# Surface brief: TSS++ course enrollment page (frontend/src/App.tsx)

Scope: the whole single-page app. Visitor mode: Operate. Audience: UCSD students planning a quarter; job: find classes, read prerequisites, book sections, see the week/finals/map, export. Proof/content: real catalog + section data from the backend. Constraints: no UCSD trademarks, no live seat counts, planner in localStorage, pdf.js lazy.

## Direction contract

THESIS: TSS++ is WebReg 2.0 brought back as one calm registrar page: search on top, "My Schedule" tabs below, every class a row or a block with a status word. It refuses the app-workbench arrangement (fixed shell, side dock, command palette) and the generic SaaS card grid.

OWN-WORLD: Flat navy header band (#1f6a9b) with light-blue nav strip (#d3e4f2) and a sliver of gold; orange page title (#c8661c) on white; bold link-blue (#1a5f99) text actions separated by pipes; navy tab bar (#164f70) with white tabs, active tab white with orange text; gray-headed (#ececec) bordered tables with 1px rules; deep slate-teal class blocks with white text and a 2px red outline on conflict; pink/green/amber bordered notice boxes; Helvetica/Arial 13px fluid; 3px radii; no gradients, no shadows beyond a dropdown.

STORY: The student lands on a page they recognize from WebReg, types a course, expands its drawer, presses Plan on a section, and watches it appear in the List and Calendar tabs with Planned status, conflicts called out in a pink notice above the schedule, finals on their own tab, walking route on Map, ICS export at hand.

FIRST VIEWPORT: Header band (brand left, GitHub/help right) + nav strip; "Course Enrollment" title left, "Import from TSS | Export .ics | Fall Quarter 2026 ▾" right; one-line gray helper; "Search for Classes:" label, wide input, Search button, "Advanced search" link; (conflict notice when present); navy tab bar List | Calendar | Finals | Map with "Print Schedule" right; the active tab's table or calendar filling the rest. Primary action: Search input (focused by ⌘K), then Plan buttons in result drawers.

FORM: Brief-pinned direction (user: "WebReg-flavored, modern finish" + "WebReg tabs"); candidate 7 on the grounded list by assignment, seed key d491cb3c. Challengers declined; raises kept: single action color only where something can be pressed (warm-consumer canon); conflict rendered structurally (red outline + notice list) not only by color (exposure-record); states cancel visibly, nothing disappears without a status word (ticket wallet).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Memorable moment
Pressing Plan in a search drawer: the row flips to Planned, the List tab count ticks, and the block lands on the calendar in the course's deep teal.

## Unresolved
Whether to add a per-course color legend on the Calendar tab; default is per-course deep tones with the code on every block.
