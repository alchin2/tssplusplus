import { GitBranch, Layers, X } from "lucide-react";
import { PREREQS } from "../data/prereqs";
import type { Course, PlannedItem, Section } from "../types";
import { PrereqGraph } from "./PrereqGraph";
import { SectionsTable } from "./SectionsTable";

export function CourseDetailPanel({ course, plannedItems, onAdd, onClose }: {
  course: Course; plannedItems: PlannedItem[];
  onAdd: (c: Course, s: Section) => void; onClose: () => void;
}) {
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
          <span className="text-white/60 text-[11px]">{course.units}u · {course.dept}</span>
          {course.offeredThisQuarter
            ? <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ backgroundColor: "#d56a03", color: "#fff" }}>SP25</span>
            : <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-500 text-white">NOT OFFERED</span>}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Description */}
        <div className="px-4 py-3 border-b border-[#e8e8f0] bg-[#f9f9fd]">
          <p className="text-xs text-gray-700 leading-relaxed">{course.description}</p>
        </div>

        {/* Prereq graph */}
        <div className="px-4 py-3 border-b border-[#c0c0c0]">
          <div className="flex items-center gap-1.5 mb-2">
            <GitBranch className="w-3.5 h-3.5" style={{ color: "#6261c0" }} />
            <span className="text-xs font-bold" style={{ color: "#0b4a67" }}>Prerequisite Graph</span>
          </div>
          <PrereqGraph courseCode={course.code} />

          {PREREQS[course.code] && (
            <div className="mt-2 text-[11px] text-gray-600">
              <span className="font-bold">Requires: </span>
              {PREREQS[course.code].map((req, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-gray-400 mx-1">AND</span>}
                  {typeof req === "string"
                    ? <span className="font-mono font-bold" style={{ color: "#016691" }}>{req}</span>
                    : <span className="text-purple-700">(any of: {req.or.map((o, j) => (
                        <span key={j}>{j > 0 && ", "}<span className="font-mono font-bold" style={{ color: "#016691" }}>{o}</span></span>
                      ))})</span>
                  }
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Layers className="w-3.5 h-3.5" style={{ color: "#d56a03" }} />
            <span className="text-xs font-bold" style={{ color: "#0b4a67" }}>
              Sections — SP25
            </span>
          </div>
          <SectionsTable course={course} plannedItems={plannedItems} onAdd={onAdd} />
        </div>
      </div>
    </div>
  );
}
