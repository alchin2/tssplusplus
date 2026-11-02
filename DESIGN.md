---
name: TSS++
description: UCSD's retired WebReg registrar page brought back as one flat, dense course-planning page.
colors:
  header-blue: "#1f6a9b"
  header-blue-deep: "#175a86"
  strip-blue: "#d3e4f2"
  strip-border: "#a9c4dc"
  bar-navy: "#164f70"
  bar-navy-deep: "#0f3d58"
  ink: "#222222"
  ink-soft: "#4a4a4a"
  ink-muted: "#6b6b6b"
  ink-faint: "#9a9a9a"
  link-blue: "#1a5f99"
  link-blue-hover: "#0f4575"
  title-orange: "#c8661c"
  plus-gold: "#f5c842"
  page-white: "#ffffff"
  panel-gray: "#f4f4f4"
  head-gray: "#ececec"
  stripe-blue: "#f1f4f7"
  selected-blue: "#e4f0f8"
  enrolled-teal: "#3f7389"
  waitlist-cyan: "#d6eef5"
  rule: "#c9c9c9"
  rule-soft: "#e2e2e2"
  rule-hair: "#efefef"
  danger-red: "#b3261e"
  danger-bg: "#fbe9e9"
  danger-border: "#d9777a"
  success-green: "#2e7d32"
  success-bg: "#e9f6ea"
  success-border: "#8fc693"
  warn-amber: "#7a5200"
  warn-bg: "#fff6dc"
  warn-border: "#e2c46a"
  type-discussion: "#5a3e8a"
  type-lab: "#8a5a00"
typography:
  title:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1.846rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  wordmark:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1.23rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  control:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.923rem"
    fontWeight: 700
    lineHeight: 1
  table:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.923rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.846rem"
    fontWeight: 700
    lineHeight: 1.2
  axis:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.769rem"
    fontWeight: 700
    lineHeight: 1.25
rounded:
  none: "0px"
  tight: "2px"
  base: "3px"
  notice: "4px"
spacing:
  hair: "0.35rem"
  xs: "0.45rem"
  sm: "0.6rem"
  md: "0.9rem"
  lg: "1.5rem"
  xl: "2.2rem"
components:
  button-default:
    backgroundColor: "{colors.head-gray}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.base}"
    height: "2rem"
    padding: "0 0.85rem"
  button-default-hover:
    backgroundColor: "#e0e0e0"
    textColor: "{colors.ink}"
  button-primary:
    backgroundColor: "{colors.header-blue}"
    textColor: "{colors.page-white}"
    typography: "{typography.control}"
    rounded: "{rounded.base}"
    height: "2rem"
    padding: "0 0.85rem"
  button-primary-hover:
    backgroundColor: "{colors.header-blue-deep}"
    textColor: "{colors.page-white}"
  button-small:
    height: "1.6rem"
    padding: "0 0.6rem"
    typography: "{typography.label}"
  button-danger:
    backgroundColor: "{colors.head-gray}"
    textColor: "{colors.danger-red}"
  button-danger-hover:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-red}"
  link-action:
    textColor: "{colors.link-blue}"
    typography: "{typography.control}"
  link-action-hover:
    textColor: "{colors.link-blue-hover}"
  input:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.ink}"
    typography: "{typography.table}"
    rounded: "{rounded.base}"
    height: "2rem"
    padding: "0 0.6rem"
  header-band:
    backgroundColor: "{colors.header-blue}"
    textColor: "{colors.page-white}"
    height: "3.4rem"
  nav-strip:
    backgroundColor: "{colors.strip-blue}"
    textColor: "{colors.link-blue}"
    typography: "{typography.table}"
    padding: "0.45rem 0.9rem"
  page-title:
    textColor: "{colors.title-orange}"
    typography: "{typography.title}"
  tab-bar:
    backgroundColor: "{colors.bar-navy}"
    textColor: "{colors.page-white}"
    height: "2.4rem"
  tab:
    backgroundColor: "#e9f0f6"
    textColor: "{colors.bar-navy}"
    typography: "{typography.control}"
    rounded: "3px 3px 0 0"
    padding: "0 1rem"
  tab-active:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.title-orange}"
  table-head:
    backgroundColor: "{colors.head-gray}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "0.35rem 0.5rem"
  table-cell:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.ink}"
    typography: "{typography.table}"
    padding: "0.35rem 0.5rem"
  table-row-stripe:
    backgroundColor: "{colors.stripe-blue}"
  table-row-selected:
    backgroundColor: "{colors.selected-blue}"
  table-row-planned:
    backgroundColor: "{colors.waitlist-cyan}"
  table-row-conflict:
    backgroundColor: "{colors.danger-bg}"
  drawer-row:
    backgroundColor: "{colors.panel-gray}"
    textColor: "{colors.ink}"
    typography: "{typography.table}"
    padding: "0.45rem 0.7rem"
  notice-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.notice}"
    padding: "0.7rem 0.9rem"
  notice-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.notice}"
    padding: "0.7rem 0.9rem"
  notice-warn:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.notice}"
    padding: "0.7rem 0.9rem"
  pager-button:
    backgroundColor: "{colors.bar-navy}"
    textColor: "{colors.page-white}"
    typography: "{typography.label}"
    rounded: "{rounded.tight}"
    height: "1.7rem"
    padding: "0 0.5rem"
  calendar-block:
    backgroundColor: "{colors.enrolled-teal}"
    textColor: "{colors.page-white}"
    typography: "{typography.label}"
    rounded: "{rounded.tight}"
---

# Design System: TSS++

## Overview

**Creative North Star: "The Registrar's Page, Reprinted"**

TSS++ is UCSD's retired WebReg 2.0 enrollment page brought back as a single calm page, printed flat. Nothing floats, nothing is a card: a mid-blue header band carries the wordmark, a light-blue strip carries the page tabs, an orange title announces "Course Enrollment", and from there the page is text, 1px rules, gray table heads and a navy tab bar over the student's schedule. Every class is a row or a block, and every row carries a status word (Planned, Conflict, Not offered) in the registrar's own vocabulary.

The density is deliberate. The root font is 13px on laptop widths and grows fluidly to 20px on ultrawide displays, so a full quarter (search results, a sections table, the conflict notice and the My Schedule tabs) fits in one scroll with no zooming. The finish is modern only in the details: antialiased Helvetica, 3px radii, a two-pixel focus ring, soft hover tints, and nothing bevelled or gradient-filled the way the 2015 original was.

Color is structural, not decorative. Blues are chrome (header, strip, tab bar, calendar axis). Orange is the title and the active tab label, nowhere else. Link blue is the single action color for anything pressable as text. Pink, green and amber only appear as bordered notice boxes and row tints that mean something. The build confirmed one rejection: the earlier app-workbench shell (fixed sidebar dock, command palette, SaaS card grid) is gone and does not come back.

**Key Characteristics:**
- Flat registrar page: white ground, 1px rules, gray table heads, zero shadows at rest
- Three chrome blues stacked top to bottom (header, strip, tab bar), one orange title
- Status words on every row: Planned, Conflict, Not offered; nothing disappears silently
- Pipe-separated bold link-blue text actions instead of button groups
- Fluid 13px to 20px root; everything measured in rem so density holds on ultrawide

## Colors

A registrar's palette: three institutional blues for chrome, one orange for the title, link blue for actions, grays for structure, and three bordered notice tints that each mean one thing.

### Primary
- **Header Blue** (`header-blue`): the top band behind the wordmark; also the primary button fill, the text-selection highlight, the caret color and the focus ring. Hover deepens to **Header Blue Deep**.
- **Strip Blue** (`strip-blue`): the TritonLink-style page-tab strip under the header, ruled with **Strip Border**; the active strip item is bold Bar Navy Deep with a small 2px arc above it.
- **Bar Navy** (`bar-navy`): the My Schedule tab bar, the calendar's day-header row and hour axis, pagination buttons, the "Planned" status word, and the LE meeting-type label. **Bar Navy Deep** is its border and active-press state.

### Secondary
- **Title Orange** (`title-orange`): the "Course Enrollment" page title and the label of the selected schedule tab. It appears nowhere else on the page.
- **Plus Gold** (`plus-gold`): the "++" in the wordmark, the accent bar on the root node of the prerequisite graph, and the focus ring on a calendar block (so focus reads against navy and teal).

### Tertiary
- **Link Blue** (`link-blue`): the one action color. Course codes in the schedule list, "Import from TSS | Export .ics", "Advanced search", drawer links, strip items. Hover shifts to **Link Blue Hover** with an underline offset 2px.
- **Enrolled Teal** (`enrolled-teal`): WebReg's enrolled-class color, first in the ten-color course palette used for calendar blocks (`#3f7389 #2c5f8a #4a6b3a #7a4f8a #a0522d #2a6f6a #6b5b2e #8a3a4f #3d5a80 #5f6b7a`, chosen per course by a stable hash of its code). All ten are deep enough to carry white text.
- **Waitlist Cyan** (`waitlist-cyan`): WebReg's waitlist tint, reused as the Planned row background in sections tables and the Planned node fill in the prerequisite graph.

### Neutral
- **Ink** (`ink`): body text and table cells. **Ink Soft** for notice body copy, drawer panel heads and final-exam rows. **Ink Muted** for helper lines, footer, FA26 term tags. **Ink Faint** for pipe separators, disabled link buttons and the "—" no-status dash.
- **Page White** (`page-white`): the only page background. **Panel Gray** fills collapsed result drawers (alternating with `#ebebeb`); **Head Gray** is every table head cell, the default button face and the panel head bar.
- **Stripe Blue** (`stripe-blue`): zebra banding per class (not per row, since rows share a course via rowSpan). **Selected Blue** marks the clicked course and the highlighted typeahead item.
- **Rule / Rule Soft / Rule Hair** (`rule`, `rule-soft`, `rule-hair`): 1px borders in three strengths. Rule frames panels, table heads and inputs; Rule Soft separates table cells, drawers and the footer; Rule Hair is the lightest divider.
- **Danger Red / Success Green / Warn Amber** with their `-bg` and `-border` pairs: the three bordered notices (scheduling conflicts, import success, warnings) and the matching row tint (Danger BG on conflict rows) and prerequisite node states (Completed green, In progress amber).
- **Type Discussion / Type Lab** (`type-discussion`, `type-lab`): the DI and LA meeting-type labels; LE takes Bar Navy, FI takes Ink Muted.

### Named Rules
**The One Action Color Rule.** Anything pressable as text is bold Link Blue; anything pressable as a button is the gray default or Header Blue primary. No other hue signals interactivity.

**The Orange Twice Rule.** Title Orange appears on the page title and on the active schedule tab label. It is never a button, a link, or a status.

**The Status Word Rule.** Every state is named in text (Planned, Conflict, Not offered, FA26, "—") alongside any color tint; a tint alone never carries meaning.

## Typography

**Display Font:** Helvetica Neue (with Helvetica, Arial, sans-serif)
**Body Font:** Helvetica Neue (same stack)
**Label/Mono Font:** none; numerals in tables use `font-variant-numeric: tabular-nums`

**Character:** The system sans the original registrar page was set in, antialiased and sized tight. One family, two weights (400 and 700), no webfont download. Hierarchy comes from size steps on a 13px base and from bold, never from a second face.

### Hierarchy
- **Title** (700, 1.846rem, 1.25, -0.01em): the orange page title "Course Enrollment"; one per page.
- **Wordmark** (700, 1.23rem, tracking-tight): "TSS++" in the header band, with the "++" in Plus Gold; beside it a small bold uppercase "Course Planner" tag at 0.846rem with 0.08em tracking, white at 80%.
- **Body** (400, 1rem = root, 1.4): helper copy, descriptions, notice body text. The description paragraph is capped at 90ch.
- **Control** (700, 0.923rem, 1): buttons, strip items, tabs, pipe actions, link buttons, and section headings like "My Schedule" (at 1rem).
- **Table** (400, 0.923rem, 1.4): table cells, drawer rows, inputs and selects. Codes and status words inside are 700.
- **Label** (700, 0.846rem, 1.2): table head cells, panel heads, drawer links, pagination, drawer meta, footer, popover text, calendar day headers and small buttons.
- **Axis** (700, 0.769rem, 1.25): calendar hour labels and the day-header date line.

### Named Rules
**The Rem Everywhere Rule.** Every size, gap and max-width is in rem against the fluid root (`clamp(13px, 0.51vw + 6.9px, 20px)`), so the page scales as one piece from a 13px laptop baseline to 20px on a 2400px display.

**The Bold Is The Signal Rule.** Weight 700 marks what is pressable, what is a code, or what is a status; running text stays 400. There is no medium weight.

## Layout

One centered column, `.wr-page`, capped at 112rem (1456px at the 13px root, growing with the fluid font to roughly 2240px at the 20px cap) with inline padding `clamp(0.75rem, 2vw, 2rem)` that also respects safe-area insets. The page is a vertical stack in WebReg order: header band (3.4rem), nav strip, title row with the pipe actions right-aligned, a one-line gray helper, the "Search for Classes:" label-input-button row with "Advanced search" below, search results in a bordered panel of drawers, the conflict notice when present, then "My Schedule" with its navy tab bar and bordered tab panel, then the footer after a 2rem gap.

Density is tabular: cells pad 0.35rem by 0.5rem, drawer rows 0.45rem by 0.7rem, controls stand 2rem tall (1.6rem for the small variant, 1.7rem for pagers). Section spacing runs on a short ladder: 0.35rem hairline gaps, 0.6rem within controls, 0.9rem between controls, 1.5rem between page sections, 2.2rem for empty states.

Wide tables sit in a horizontal scroller (`.wr-scroll-x`) with a 3rem white fade on the right edge and a muted "scroll for more" hint that only appear when content overflows; scrollbars are thin and themed (`#b9c6d2` thumb). Under 640px the tab bar's right-hand actions wrap onto a full-width second line separated by a translucent white rule, and the mobile layout shows one zone at a time. The Map tab panel is a fixed 40rem tall. Print hides the header, pipe actions and tab-bar actions and keeps the navy tab bar, gray table heads and colored calendar blocks with exact color adjustment.

## Elevation & Depth

The system is flat. Depth is conveyed by 1px rules, tonal layering (white page, gray panel, gray-headed tables, navy bars) and background tints on hover; nothing at rest casts a shadow. Exactly two kinds of surface float above the page, both transient: the typeahead dropdown under the search box and the small help popover from the nav strip. Both carry the same soft shadow. Focused inputs show a 2px pale-blue halo drawn as a box-shadow ring, and calendar blocks are separated by a translucent white 1px border rather than any lift.

### Shadow Vocabulary
- **Transient overlay** (`box-shadow: 0 4px 12px rgba(20, 40, 60, 0.16)`): the search dropdown and the help popover only.
- **Input focus halo** (`box-shadow: 0 0 0 2px #c9dff0` with a Header Blue border): text inputs and selects on focus. Everything else focused uses `outline: 2px solid #1f6a9b; outline-offset: 1px` (gold on calendar blocks).

### Named Rules
**The Dropdown-Only Shadow Rule.** A shadow means "this is temporary and will close". Panels, tables, notices, buttons and drawers never carry one.

**The Rules Not Cards Rule.** Containers are drawn with 1px borders and gray heads, never as rounded shadowed cards; the page is structured by rules and bars.

## Shapes

Barely rounded. The base radius is 3px on buttons, inputs, selects and tabs (tabs round only their top corners). Pagination buttons, skeleton rows and calendar blocks tighten to 2px; notice boxes loosen to 4px. Panels, tables, drawers, the tab bar, the tab panel, the dropdown and the popover are square (0px). Borders are 1px solid everywhere, with the gray ladder (Rule, Rule Soft, Rule Hair) choosing strength; the calendar's half-hour lines are the one dashed rule. Conflict is a shape, not just a color: a 2px Danger Red outline inset on the block. The two small drawn marks are the arc above the active strip item (a 2px top border with elliptical radius) and the CSS-triangle caret on drawer rows that rotates 90 degrees when open.

## Components

### Buttons
WebReg's gray button, flat. Bold, short, one line.
- **Shape:** barely rounded (3px), 1px border, 2rem tall, `0 0.85rem` padding, 0.923rem bold.
- **Default:** Head Gray face with a `#b7b7b7` border; hover `#e0e0e0` / `#9f9f9f`; active `#d6d6d6`; disabled `#f3f3f3` with `#a3a3a3` text. Used for Search, Reset, Remove, Upload transcript.
- **Primary:** Header Blue fill, Header Blue Deep border, white text; hover Header Blue Deep, active Bar Navy Deep; disabled Strip Border fill. Used for Plan and Change in section rows, and the advanced-search Search.
- **Small:** 1.6rem tall, `0 0.6rem`, 0.846rem; the in-table variant.
- **Danger:** default face with Danger Red text; hover Danger BG face and Danger Border.
- **Transitions:** background and border color over 120ms ease.
- **Link button:** no box at all; bold Link Blue text, underline on hover, Ink Faint when disabled, 400 weight in the quiet variant. Inside the navy tab bar it turns white (hover `#dbe9f4`, disabled `#8fb3cc`).

### Pipe Actions
Groups of bold Link Blue text actions separated by a 400-weight Ink Faint "|" with 0.55rem on each side: the title row ("Import from TSS | Export .ics | Term: Fall Quarter 2026"), the drawer links strip (pale blue `#eaf3fa` band, 0.846rem), the tab bar right side (white on navy, separators `#8fb3cc`) and the footer links.

### Inputs / Fields
- **Style:** white, 1px Rule border, 3px radius, 2rem tall, 0.923rem, placeholder `#8c8c8c`. Selects drop the native arrow for a 10x6 dark-gray chevron and pad right 1.7rem.
- **Hover / Focus:** border to `#a8a8a8` on hover; Header Blue border plus the 2px `#c9dff0` halo on focus.
- **Checkbox:** native control, 0.95rem, `accent-color` Header Blue, label at 0.923rem.
- **Typeahead dropdown:** white, 1px Rule border, the transient shadow, 18rem max height; two-column rows (6.5rem code column bold, title soft and truncated), Selected Blue on hover or active.

### Navigation
- **Header band:** Header Blue, 3.4rem tall, white content: raccoon mascot rotated -4 degrees, "TSS++" wordmark with gold "++", the uppercase "Course Planner" tag, GitHub link at right (white at 85%, white on hover).
- **Nav strip:** Strip Blue with a Strip Border bottom rule; items are Link Blue at 0.923rem, `0.45rem 0.9rem`, each with a Strip Border right rule; hover tints `#e3eef7`. The current page item is bold Bar Navy Deep with a small Header Blue arc above it.
- **Schedule tab bar:** Bar Navy, 2.4rem min height, 1px Bar Navy border with no bottom. Tabs sit on a 4px top gutter with 2px gaps: `#e9f0f6` face, Bar Navy bold text, `0 1rem` padding, 3px top corners, hover `#f4f8fb`; the selected tab is white with Title Orange text. "Print Schedule | Export .ics" ride the right side as white link buttons. The panel below is white with a 1px Rule frame and no top edge, so the bar and panel read as one box.
- **Mobile:** below 640px the right-side actions drop to a full-width row under the tabs.

### Tables
Gray-headed, 1px-ruled, centered by default.
- **Head:** Head Gray cells, 1px Rule border, 0.846rem bold Ink, centered, `0.35rem 0.5rem`.
- **Cells:** 1px Rule Soft border, 0.923rem Ink, centered; `.is-left` for text columns; course codes bold and nowrap; tabular numerals.
- **Row states (cascade order):** zebra Stripe Blue per class, then Selected Blue, then Danger BG for conflict, then Waitlist Cyan for the planned section. A Rule-strength top border marks the first row of each class group.
- **Status words:** bold; Planned in Bar Navy, Conflict in Danger Red, "—" in Ink Faint at 400.
- **Meeting types:** bold two-letter codes; LE Bar Navy, DI Type Discussion, LA Type Lab, FI/FINAL Ink Muted; final-exam rows in Ink Soft with a bold label.
- **Footer line:** a muted 0.846rem summary under the schedule table ("4 classes planned · 13.5 class hours per week").

### Result Drawers
The search result list: a white panel with 1px Rule frame and a Head Gray panel head ("Search results and action", 0.846rem bold Ink Soft). Each drawer row is a full-width button on Panel Gray (even rows `#ebebeb`), grid `1.1rem 7.5rem 1fr auto`: caret, bold code, truncated title, and a right-aligned meta slot (muted "FA26", "Not offered", or bold Bar Navy "Planned · A00"). Hover `#ececec`, expanded `#e7e7e7` with the caret turned. The open body is white with a Rule Soft top border, a pale-blue pipe-link strip, then the sections table, description and the prerequisite graph.

### Notices
Bordered boxes, 4px radius, `0.7rem 0.9rem`, 0.923rem, Ink Soft body with a bold colored title line carrying a 16px SVG icon. Danger (pink) for "You have scheduling conflicts!" listing each pair; Success (green) for completed imports; Warn (amber) for cautions. Bullets are plain disc lists inset 1.2rem.

### Pagination
"Show 10 ▾ | First « 1 2 » Last" at 0.923rem: 1.7rem-tall Bar Navy buttons with Bar Navy Deep borders, 2px radius, white bold 0.846rem; hover Header Blue; the current page inverts to white with Bar Navy text and border; disabled `#e6e6e6`. The count ("17 courses found") is bold Ink, with a quiet "Clear search" link beside it.

### Calendar (signature)
FullCalendar restyled as WebReg's grid: Bar Navy day-header row and hour axis with white bold labels (0.846rem days, 0.769rem hours and dates), white grid, Rule Soft hour lines and dashed `#e9eef3` half-hour lines, 3rem per slot, no today tint and no now line. Blocks are the course's deep palette color with a 2px radius, a translucent white 1px border, white text (code bold, time at 90%, status word bold right-aligned). Conflict adds a 2px Danger Red inset outline and turns the status word pale pink `#ffd6d6`. Clicking a course dims the others to 45% opacity. Container queries drop the time first (under 9.5rem wide) and the status word second (under 6rem). Focus ring is Plus Gold.

### Prerequisite Graph (signature)
Nodes are small bordered boxes with a bold code and truncated title: Selected is Bar Navy with white text and a gold left accent; Completed Success BG with green stroke; In progress Warn BG with `#b07a00` stroke; Planned Waitlist Cyan with Header Blue stroke; Available white with `#b5c2cd` stroke. Edges are thin gray curves; a legend of tiny swatches runs along the panel's bottom edge, and zoom controls sit in the panel head as small gray buttons.

### Skeletons and Empty States
Loading rows are 0.8rem bars with a 2px radius and a gray shimmer (`#ececec` to `#f6f6f6`, 1.2s), stilled under reduced motion. Empty tab panels center a muted 0.923rem line at `2.2rem 1rem` with the key phrase in bold Ink.

## Do's and Don'ts

### Do:
- **Do** name every state with a registrar status word (Planned, Conflict, Not offered, FA26, "—") next to any tint; the word carries the meaning, the tint repeats it.
- **Do** present grouped text actions as bold Link Blue separated by a 400-weight Ink Faint pipe with 0.55rem on each side.
- **Do** keep Link Blue as the only text-action color and Header Blue as the only primary button fill; use the gray default button for everything else pressable.
- **Do** build containers from 1px rules and Head Gray heads: panels, tables, drawers and tab panels are square boxes, with 3px radii reserved for buttons, inputs and tabs.
- **Do** measure in rem against the fluid root (13px to 20px) so density survives both a phone and a 2400px display; keep controls 2rem tall and cells at `0.35rem 0.5rem`.
- **Do** set the whole page in the Helvetica Neue / Helvetica / Arial stack at weights 400 and 700 only.
- **Do** render conflict structurally: Danger BG row tint plus the bold red Conflict word in tables, a 2px red inset outline plus the word on calendar blocks, and the pink notice listing each pair above the schedule.
- **Do** use the ten deep course colors for calendar blocks with white text, keyed by a stable hash of the course code.

### Don't:
- **Don't** use gradients for decoration or depth; the only gradients in the system are the functional skeleton shimmer and the horizontal-scroll edge fade.
- **Don't** cast shadows on anything that stays on the page; the transient shadow belongs to the typeahead dropdown and the help popover only, and the 2px halo to focused inputs.
- **Don't** structure the page with cards, a fixed sidebar dock, a command palette or a SaaS card grid; the page is a WebReg stack of band, strip, title, search, results, notice and tabbed schedule.
- **Don't** put Title Orange on anything but the page title and the active tab label, and don't use it or any hue other than Link Blue to signal a text action.
- **Don't** reproduce UCSD or TritonLink trademarks, seals, wordmarks or the Triton name; the page is an independent planner and the footer says so.
- **Don't** show live seat counts or any state without a visible word; nothing is removed from the planner without a status change the student can read.
- **Don't** round beyond 4px, add a second typeface, or introduce a medium weight; hierarchy is size and bold only.
