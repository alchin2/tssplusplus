# Transcript upload (archived)

Retired November 2026: TritonLink discontinued unofficial transcript
printing, so students can no longer download the academic-history PDF this
feature read. The code is kept here, outside `src/`, so it isn't built or
shipped but can be revived if a new source of the same data turns up.

## What it did

A "Upload transcript" button above every course's prerequisite graph took a
UCSD academic-history PDF, parsed it in the browser, and tinted the graph's
nodes: **Completed** (green), **In progress** (amber), alongside the
planner's **Planned**. Nothing was sent to the server.

- `TranscriptUpload.tsx` -- the button, status line (file name, counts,
  Clear), and error display. Purely presentational.
- `transcriptParse.ts` -- `parseAcademicHistoryText(text)`: line-oriented
  heuristics over the PDF text (term markers, transfer-credit `LD` rows,
  grade tokens) producing a `TranscriptRecord` of completed / in-progress /
  planned course codes. Ported from ClassGraph
  (https://github.com/nehalc200/classgraph).

PDF -> text extraction was `src/lib/pdfExtract.ts`, which is still in use by
the TSS "My Courses" schedule import.

## Known issues (unfixed when archived)

These were found and fixed in PR #37, which was closed unmerged when the
feature was retired -- the fixes live on in that PR's history:

- The subject list is hardcoded from `valid_codes.txt` (catalog page names,
  not course prefixes), so ~135 real subjects never matched: BILD/BIMM/...,
  GPCO/GPEC/..., HIEU, LIGN, LTEN, SOCI, TD*, and more.
- Grades are read from the first standalone grade letter anywhere on a
  line, so titles leak in ("U.S. Urban Policy" reads as a U).
- `NEWEST_QUARTER` is hardcoded and must be bumped every quarter.
- `exec()` on the shared global regex leaks `lastIndex`, dropping the first
  course after a transfer block.

## Reviving it

The last commit with the feature fully wired in is `215d4fa`
(`git show 215d4fa:frontend/src/App.tsx` etc.). To restore:

1. Move both files back: `TranscriptUpload.tsx` -> `src/components/`,
   `transcriptParse.ts` -> `src/lib/` (optionally move `TranscriptRecord`
   back into `src/types.ts`).
2. `src/App.tsx`: transcript state plus `handleTranscriptFile` /
   `clearTranscript`, lazy-importing `pdfExtract` and `transcriptParse`;
   pass `transcript`, `onTranscriptFile`, `onTranscriptClear` to
   `SearchPanel`.
3. Thread those props through `SearchPanel` -> `CourseDrawer` ->
   `DrawerDetail`, rendering `<TranscriptUpload>` beside the
   "Prerequisites" label.
4. `src/lib/prereqGraph.ts`: re-add the `completed` / `inProgress` statuses
   to `GNode["status"]`, `StatusCodes`, the status ternary in `place()`, and
   `NODE_CFG` (which also drives the legend); pass `completedCodes` /
   `inProgressCodes` into `PrereqGraph`.
