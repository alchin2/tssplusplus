import { ChevronDown, CornerDownLeft, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { termLabel, useMeta } from "../hooks/useMeta";
import type { Course } from "../types";

// A list is snappier to scan than the old results table; cap it and say so.
const MAX_ROWS = 60;

type Div = "all" | "lower" | "upper";

// The ⌘K command palette — search moved off a permanent rail into an
// overlay. Owns keyboard navigation; search/filter state stays lifted in App
// (the debounced fetch lives there) and is threaded through as props.
export function CommandPalette({
  onClose, query, onQuery, deptFilter, onDeptFilter, offeredFilter, onOfferedFilter,
  divFilter, onDivFilter, courses, loading, error, selectedCourseId, onOpenCourse,
}: {
  onClose: () => void;
  query: string; onQuery: (q: string) => void;
  deptFilter: string; onDeptFilter: (d: string) => void;
  offeredFilter: boolean; onOfferedFilter: (v: boolean) => void;
  divFilter: Div; onDivFilter: (v: Div) => void;
  courses: Course[]; loading: boolean; error: string | null;
  selectedCourseId: string | null; onOpenCourse: (c: Course) => void;
}) {
  const meta = useMeta();
  const term = termLabel(meta);
  const depts = ["ALL", ...(meta?.depts ?? [])];
  const visible = courses.slice(0, MAX_ROWS);

  const [cur, setCur] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hasFilters = query !== "" || deptFilter !== "ALL" || offeredFilter || divFilter !== "all";

  useEffect(() => { inputRef.current?.focus(); }, []);
  // Keep the highlighted row valid as the result set changes under filtering.
  useEffect(() => { setCur(c => Math.min(c, Math.max(0, visible.length - 1))); }, [visible.length]);
  // Keep the highlighted row scrolled into view.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${cur}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cur]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); if (visible.length) setCur(c => (c + 1) % visible.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (visible.length) setCur(c => (c - 1 + visible.length) % visible.length); }
    else if (e.key === "Enter") { e.preventDefault(); const c = visible[cur]; if (c) onOpenCourse(c); }
    // Escape is handled globally in App so ⌘K's toggle and this stay in sync.
  }

  function clearFilters() {
    onQuery(""); onDeptFilter("ALL"); onOfferedFilter(false); onDivFilter("all");
    inputRef.current?.focus();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-10"
      style={{ backgroundColor: "rgba(15,23,42,0.35)" }}
      onMouseDown={onClose}>
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "82vh", border: "1px solid #c0c0c0" }}
        role="dialog" aria-modal="true" aria-label="Search courses"
        onMouseDown={e => e.stopPropagation()}>

        {/* Search input */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-[#e4e7f2]">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input ref={inputRef} type="text" value={query}
            onChange={e => onQuery(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Search courses by code or title…"
            className="flex-1 text-sm focus:outline-none" autoComplete="off" />
          <button onClick={onClose} title="Close (Esc)"
            className="text-[11px] text-gray-500 hover:text-gray-800 px-1.5 py-0.5 border border-[#c0c0c0] rounded">
            Esc
          </button>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b border-[#e4e7f2] bg-[#f5f6fb] text-xs">
          <div className="relative">
            <select value={deptFilter} onChange={e => onDeptFilter(e.target.value)}
              className="appearance-none border border-[#aaa] px-2 py-1 pr-6 text-xs focus:outline-none bg-white cursor-pointer">
              {depts.map(d => <option key={d} value={d}>{d === "ALL" ? "All departments" : d}</option>)}
            </select>
            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>
          <div className="flex border border-[#aaa] overflow-hidden">
            {(["all", "lower", "upper"] as const).map(d => (
              <button key={d} onClick={() => onDivFilter(d)}
                className="px-2 py-1 text-xs transition-colors"
                style={{ backgroundColor: divFilter === d ? "#0b4a67" : "#fff", color: divFilter === d ? "#fff" : "#333" }}>
                {d === "all" ? "All" : d === "lower" ? "Lower" : "Upper"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-gray-700">
            <input type="checkbox" checked={offeredFilter} onChange={e => onOfferedFilter(e.target.checked)} />
            Offered {term || "this quarter"}
          </label>
          {hasFilters && (
            <button onClick={clearFilters}
              className="text-[#016691] underline hover:text-blue-800 flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          <span className="ml-auto text-gray-500">
            {courses.length > MAX_ROWS ? `first ${MAX_ROWS} of ${courses.length}` : `${courses.length} result${courses.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 min-h-0 overflow-auto app-scroll">
          {error ? (
            <div className="m-3 px-3 py-2.5 text-xs border border-red-300 bg-red-50 text-red-700">Failed to load courses: {error}</div>
          ) : loading && courses.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm"><Loader2 className="w-7 h-7 mx-auto mb-2 opacity-40 animate-spin" />Loading courses…</div>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm"><Search className="w-7 h-7 mx-auto mb-2 opacity-20" />No courses match. Try loosening a filter.</div>
          ) : (
            <div style={{ opacity: loading ? 0.6 : 1 }}>
              {visible.map((c, i) => {
                const active = i === cur;
                const isSel = c.id === selectedCourseId;
                return (
                  <button key={c.id} data-idx={i} role="option" aria-selected={active}
                    onMouseMove={() => setCur(i)} onClick={() => onOpenCourse(c)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 border-b border-[#eef0f7]"
                    style={{ backgroundColor: active ? "#e6ecff" : isSel ? "#eef4fd" : "transparent", boxShadow: isSel ? "inset 3px 0 0 #d56a03" : "none" }}>
                    <span className="font-mono font-bold text-[0.846rem] whitespace-nowrap" style={{ color: "#016691" }}>{c.code}</span>
                    <span className="flex-1 min-w-0 truncate text-xs text-gray-700">{c.title}</span>
                    <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">{c.dept}</span>
                    {c.offeredThisQuarter
                      ? <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "#d56a03" }}>{term || "…"}</span>
                      : <span className="text-[10px] text-gray-300 flex-shrink-0">—</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex-shrink-0 flex items-center gap-4 px-3 py-1.5 border-t border-[#e4e7f2] bg-[#f5f6fb] text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><b>↑ ↓</b> move</span>
          <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" /> open details</span>
          <span><b>esc</b> close</span>
        </div>
      </div>
    </div>
  );
}
