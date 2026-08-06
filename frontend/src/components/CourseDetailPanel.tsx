import { BookOpen, CalendarOff, GitBranch, Layers, Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { termLabel, useMeta } from "../hooks/useMeta";
import { ApiError, fetchCourseDetail } from "../lib/api";
import type { Course, CourseDetail, PlannedItem, Section } from "../types";
import { PrereqGraph } from "./PrereqGraph";
import { SectionsTable } from "./SectionsTable";

export function CourseDetailPanel({ course, plannedItems, onAdd, onClose }: {
  course: Course; plannedItems: PlannedItem[];
  onAdd: (c: Course, s: Section) => void; onClose: () => void;
}) {
  const term = termLabel(useMeta());
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = course.moduleId !== null && detail === null && error === null;
  const plannedCodes = useMemo(() => new Set(plannedItems.map(i => i.course.code)), [plannedItems]);

  useEffect(() => {
    setDetail(null);
    setError(null);
    if (!course.moduleId) return;
    let alive = true;
    fetchCourseDetail(course.moduleId)
      .then(d => { if (alive) setDetail(d); })
      .catch(err => {
        if (!alive) return;
        setError(err instanceof ApiError && err.status === 503
          ? "Live section data is temporarily unavailable."
          : err instanceof Error ? err.message : "Failed to load course detail.");
      });
    return () => { alive = false; };
  }, [course.moduleId]);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#fff" }}>
      {/* Panel header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: "#6261c0" }}>
        <button onClick={onClose}
          className="flex items-center justify-center w-6 h-6 text-white/70 hover:text-white hover:bg-white/20 transition-colors rounded"
          title="Close panel">
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-white/30 mx-0.5" />
        <span className="font-mono font-bold text-white text-xs">{course.code}</span>
        <span className="text-white/75 text-xs truncate">{course.title}</span>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <span className="text-white/60 text-[11px]">{course.dept}</span>
          {course.offeredThisQuarter
            ? <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ backgroundColor: "#d56a03", color: "#fff" }}>{term || "…"}</span>
            : <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-500 text-white">NOT OFFERED</span>}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {course.moduleId === null ? (
          <div className="px-4 py-8 text-center text-gray-500 text-xs">
            <CalendarOff className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-bold mb-1">Not offered {term ? `in ${term}` : "this quarter"}</p>
            <p>No sections are scheduled for this course this term.</p>
          </div>
        ) : loading ? (
          <div className="px-4 py-8 text-center text-gray-500 text-xs">
            <Loader2 className="w-8 h-8 mx-auto mb-2 opacity-40 animate-spin" />
            Loading course detail…
          </div>
        ) : error ? (
          <div className="m-4 px-3 py-2.5 text-xs border border-amber-400 bg-amber-50 text-amber-800 flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        ) : detail && (
          <>
            {/* Catalog description */}
            {detail.description && (
              <div className="px-4 py-3 border-b border-[#c0c0c0]">
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5" style={{ color: "#6261c0" }} />
                  <span className="text-xs font-bold" style={{ color: "#0b4a67" }}>Description</span>
                </div>
                <p className="text-[11px] text-gray-700 leading-relaxed">{detail.description}</p>
              </div>
            )}

            {/* Prerequisites */}
            <div className="px-4 py-3 border-b border-[#c0c0c0]">
              <div className="flex items-center gap-1.5 mb-2">
                <GitBranch className="w-3.5 h-3.5" style={{ color: "#6261c0" }} />
                <span className="text-xs font-bold" style={{ color: "#0b4a67" }}>Prerequisites</span>
              </div>
              {detail.rawPrereq && (
                <p className="text-[11px] text-gray-700 leading-relaxed mb-2">{detail.rawPrereq}</p>
              )}
              <PrereqGraph moduleId={detail.moduleId} plannedCodes={plannedCodes} />
            </div>

            {/* Sections */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5" style={{ color: "#d56a03" }} />
                <span className="text-xs font-bold" style={{ color: "#0b4a67" }}>
                  Sections — {term || "…"}
                </span>
              </div>
              {detail.sections.length === 0
                ? <p className="text-[11px] text-gray-400">No section data available for this course.</p>
                : <SectionsTable course={detail} plannedItems={plannedItems} onAdd={onAdd} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
