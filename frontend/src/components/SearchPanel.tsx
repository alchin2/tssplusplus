import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Course, PlannedItem, Section } from "../types";
import { CourseDrawer, type TranscriptState } from "./CourseDrawer";

export type Div = "all" | "lower" | "upper" | "grad";
const PAGE_SIZES = [10, 25, 50];

// WebReg's "Search for Classes": a label, a wide box with a typeahead, a
// Search button and an Advanced search form; results arrive below as a
// paged panel of expandable drawers.
export function SearchPanel({
  inputRef, query, onQuery, deptFilter, onDeptFilter, offeredFilter, onOfferedFilter, divFilter, onDivFilter,
  depts, termLabel, termName, courses, loading, error, active, onActive, expandedId, onExpand, pinned, scrollToken,
  plannedItems, onAdd, onRemove, transcript, onTranscriptFile, onTranscriptClear,
}: {
  inputRef: RefObject<HTMLInputElement>;
  query: string; onQuery: (q: string) => void;
  deptFilter: string; onDeptFilter: (d: string) => void;
  offeredFilter: boolean; onOfferedFilter: (v: boolean) => void;
  divFilter: Div; onDivFilter: (v: Div) => void;
  depts: string[]; termLabel: string; termName: string;
  courses: Course[]; loading: boolean; error: string | null;
  active: boolean; onActive: (v: boolean) => void;
  expandedId: string | null; onExpand: (id: string | null) => void;
  pinned: Course | null; scrollToken: number;
  plannedItems: PlannedItem[];
  onAdd: (c: Course, s: Section) => void;
  onRemove: (courseId: string) => void;
  transcript: TranscriptState;
  onTranscriptFile: (file: File) => void;
  onTranscriptClear: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const wrapRef = useRef<HTMLDivElement>(null);

  const hasFilters = deptFilter !== "ALL" || offeredFilter || divFilter !== "all";

  const pageCount = Math.max(1, Math.ceil(courses.length / pageSize));
  useEffect(() => { setPage(p => Math.min(p, pageCount)); }, [pageCount]);
  useEffect(() => { setPage(1); }, [query, deptFilter, offeredFilter, divFilter, pageSize]);

  const pageCourses = courses.slice((page - 1) * pageSize, page * pageSize);
  const pinnedVisible = pinned !== null && !pageCourses.some(c => c.id === pinned.id);
  const showPanel = active || pinned !== null;

  // A course chosen from the schedule scrolls its drawer into view.
  useEffect(() => {
    if (!scrollToken || !expandedId) return;
    const el = wrapRef.current?.querySelector<HTMLElement>(`[data-course-id="${CSS.escape(expandedId)}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollToken, expandedId]);

  // Typing shows the results panel straight away; Enter and the Search
  // button only matter when the box is empty or the panel was hidden.
  function submit() {
    onActive(true);
  }

  function onQueryChange(q: string) {
    onQuery(q);
    if (q.trim()) onActive(true);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  function reset() {
    onQuery(""); onDeptFilter("ALL"); onOfferedFilter(false); onDivFilter("all");
    inputRef.current?.focus();
  }

  const countLabel = loading && courses.length === 0
    ? "Searching…"
    : `${courses.length} course${courses.length !== 1 ? "s" : ""} found`;

  return (
    <section aria-label="Search for classes" ref={wrapRef}>
      {/* ── Search row ── */}
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="pt-1">
          <label htmlFor="class-search" className="wr-label block" style={{ fontSize: "1rem" }}>Search for Classes:</label>
        </div>
        <div className="flex-1 min-w-[16rem] max-w-[38rem]">
          <div className="flex items-start gap-2">
          <div className="relative flex-1 min-w-0">
          <input id="class-search" ref={inputRef} type="search" value={query} autoComplete="off" spellCheck={false}
            className="wr-input w-full" placeholder="CSE 100, MATH, or compilers"
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown} />
          </div>
          <button type="button" className="wr-btn" onClick={submit}>Search</button>
          </div>
          <p className="wr-help mt-1 text-[0.846rem]">Press <b>⌘K</b> anywhere to jump here. Results update as you type.</p>
        </div>
        {showPanel && (
          <button type="button" className="wr-linkbtn ml-auto self-center text-[0.923rem]" onClick={() => onActive(false)}>
            Hide search result
          </button>
        )}
      </div>

      {/* ── Advanced search ── */}
      <div className="mt-3 p-3" style={{ border: "1px solid var(--wr-rule-soft)", background: "#fafafa" }}>
        <div className="grid gap-x-8 gap-y-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))" }}>
          <label className="flex items-center gap-3">
            <span className="wr-label text-[0.923rem] w-24 text-right">Department:</span>
            <select className="wr-select flex-1" value={deptFilter} onChange={e => onDeptFilter(e.target.value)}>
              {depts.map(d => <option key={d} value={d}>{d === "ALL" ? "All departments" : d}</option>)}
            </select>
          </label>
          <fieldset className="flex items-start gap-3 m-0 p-0 border-0 min-w-0">
            <legend className="sr-only">Show only</legend>
            <span className="wr-label text-[0.923rem] w-24 text-right pt-0.5" aria-hidden="true">Show only:</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
              {([["all", "All"], ["lower", "Lower (1–99)"], ["upper", "Upper (100–199)"], ["grad", "Graduate (200+)"]] as const).map(([v, l]) => (
                <label key={v} className="wr-check">
                  <input type="radio" name="division" value={v} checked={divFilter === v} onChange={() => onDivFilter(v)} />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <label className="wr-check">
            <input type="checkbox" checked={offeredFilter} onChange={e => onOfferedFilter(e.target.checked)} />
            Only courses offered in {termName}
          </label>
          <div className="ml-auto flex gap-2">
            <button type="button" className="wr-btn" onClick={reset} disabled={!hasFilters && !query}>Reset</button>
            <button type="button" className="wr-btn is-primary" onClick={submit}>Search</button>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      {showPanel && (
        <div className="mt-4">
          {active && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-2">
              <div className="wr-pager">
                <span className="wr-label text-[0.923rem]">Show</span>
                <select className="wr-select" style={{ height: "1.7rem", lineHeight: "1.7rem" }} value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))} aria-label="Results per page">
                  {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button type="button" className="wr-pagebtn" onClick={() => setPage(1)} disabled={page === 1}>First</button>
                <button type="button" className="wr-pagebtn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">«</button>
                {pageWindow(page, pageCount).map(n => (
                  <button key={n} type="button" className="wr-pagebtn" aria-current={n === page ? "page" : undefined} onClick={() => setPage(n)}>{n}</button>
                ))}
                <button type="button" className="wr-pagebtn" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount} aria-label="Next page">»</button>
                <button type="button" className="wr-pagebtn" onClick={() => setPage(pageCount)} disabled={page === pageCount}>Last</button>
              </div>
              <span className="wr-label text-[0.923rem]" aria-live="polite">{countLabel}</span>
              {(hasFilters || query) && (
                <button type="button" className="wr-linkbtn is-quiet text-[0.846rem]" onClick={reset}>Clear search</button>
              )}
            </div>
          )}

          <div className="wr-panel">
            <div className="wr-panel-head">
              <span>{active ? "Search results and action" : "Selected class"}</span>
              {active && hasFilters && (
                <span className="font-normal">
                  {deptFilter !== "ALL" && `${deptFilter} · `}
                  {divFilter !== "all" && `${divFilter === "lower" ? "lower-division" : divFilter === "upper" ? "upper-division" : "graduate"} · `}
                  {offeredFilter && `offered ${termLabel} · `}
                  filtered
                </span>
              )}
            </div>

            {pinned && (pinnedVisible || !active) && (
              <CourseDrawer course={pinned} expanded={expandedId === pinned.id} onToggle={() => onExpand(expandedId === pinned.id ? null : pinned.id)}
                plannedItems={plannedItems} onAdd={onAdd} onRemove={onRemove}
                transcript={transcript} onTranscriptFile={onTranscriptFile} onTranscriptClear={onTranscriptClear}
                termLabel={termLabel} termName={termName} />
            )}

            {active && error && (
              <div className="p-3">
                <div className="wr-notice is-danger">
                  <div className="wr-notice-title">Search is unavailable</div>
                  <p className="mt-1">{error}. The course service may be restarting; try again shortly.</p>
                </div>
              </div>
            )}

            {active && !error && loading && courses.length === 0 && (
              <div className="p-3 space-y-2" aria-busy="true">
                {[88, 72, 80, 64].map((w, i) => <span key={i} className="wr-skel" style={{ width: `${w}%` }} />)}
              </div>
            )}

            {active && !error && !loading && courses.length === 0 && (
              <div className="wr-empty">
                <p><b>No courses match.</b></p>
                <p className="mt-1">Try a department code (CSE), a course (CSE 100), or a word from the title. Loosen the filters under Advanced search.</p>
              </div>
            )}

            {active && !error && courses.length > 0 && (
              <div style={{ opacity: loading ? 0.6 : 1, transition: "opacity 150ms ease" }}>
                {pageCourses.map(c => (
                  <CourseDrawer key={c.id} course={c} expanded={expandedId === c.id} onToggle={() => onExpand(expandedId === c.id ? null : c.id)}
                    plannedItems={plannedItems} onAdd={onAdd} onRemove={onRemove}
                    transcript={transcript} onTranscriptFile={onTranscriptFile} onTranscriptClear={onTranscriptClear}
                    termLabel={termLabel} termName={termName} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// Up to five page numbers centered on the current page.
function pageWindow(page: number, count: number): number[] {
  const start = Math.max(1, Math.min(page - 2, count - 4));
  const end = Math.min(count, start + 4);
  const out: number[] = [];
  for (let n = start; n <= end; n++) out.push(n);
  return out;
}
