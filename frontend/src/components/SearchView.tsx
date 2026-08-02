import { ChevronDown, Search, X } from "lucide-react";
import { COURSES } from "../data/courses";
import { PREREQS } from "../data/prereqs";
import { DEPTS } from "../lib/schedule";
import type { Course } from "../types";

export function SearchView({ query, onQuery, deptFilter, onDeptFilter, offeredFilter, onOfferedFilter,
  divFilter, onDivFilter, courses, selectedCourseId, onOpenCourse }: {
  query: string; onQuery: (q: string) => void;
  deptFilter: string; onDeptFilter: (d: string) => void;
  offeredFilter: boolean; onOfferedFilter: (v: boolean) => void;
  divFilter: "all" | "lower" | "upper"; onDivFilter: (v: "all" | "lower" | "upper") => void;
  courses: Course[]; selectedCourseId: string | null; onOpenCourse: (c: Course) => void;
}) {
  return (
    <div className="p-4">
      <div className="mb-3 p-3 border border-[#c0c0c0] bg-white flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={query} onChange={e => onQuery(e.target.value)}
            placeholder="Search by subject, course code, or instructor..."
            className="w-full pl-7 pr-3 py-1.5 border border-[#aaa] text-xs focus:outline-none focus:border-[#016691]" />
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <label className="font-bold text-gray-700">Dept:</label>
          <div className="relative">
            <select value={deptFilter} onChange={e => onDeptFilter(e.target.value)}
              className="appearance-none border border-[#aaa] px-2 py-1 pr-6 text-xs focus:outline-none bg-white cursor-pointer">
              {DEPTS.map(d => <option key={d} value={d}>{d === "ALL" ? "All Departments" : d}</option>)}
            </select>
            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={offeredFilter} onChange={e => onOfferedFilter(e.target.checked)} />
            Offered this quarter
          </label>
          <div className="flex border border-[#aaa] overflow-hidden">
            {(["all", "lower", "upper"] as const).map(d => (
              <button key={d} onClick={() => onDivFilter(d)} className="px-2 py-1 text-xs transition-colors"
                style={{ backgroundColor: divFilter === d ? "#0b4a67" : "#fff", color: divFilter === d ? "#fff" : "#333" }}>
                {d === "all" ? "All" : d === "lower" ? "Lower Div" : "Upper Div"}
              </button>
            ))}
          </div>
          {(query || deptFilter !== "ALL" || offeredFilter || divFilter !== "all") && (
            <button onClick={() => { onQuery(""); onDeptFilter("ALL"); onOfferedFilter(false); onDivFilter("all"); }}
              className="text-xs text-[#016691] underline hover:text-blue-800 flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm border border-[#c0c0c0] bg-white">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
          No courses found.
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse bg-white">
          <thead>
            <tr style={{ backgroundColor: "#6261c0" }}>
              <th className="border border-[#9090c0] px-3 py-2 text-left text-white font-bold">Course</th>
              <th className="border border-[#9090c0] px-3 py-2 text-left text-white font-bold">Title</th>
              <th className="border border-[#9090c0] px-2 py-2 text-center text-white font-bold">Units</th>
              <th className="border border-[#9090c0] px-2 py-2 text-center text-white font-bold">Dept</th>
              <th className="border border-[#9090c0] px-2 py-2 text-center text-white font-bold">Sec</th>
              <th className="border border-[#9090c0] px-2 py-2 text-center text-white font-bold">Avail</th>
              <th className="border border-[#9090c0] px-2 py-2 text-center text-white font-bold">Quarter</th>
              <th className="border border-[#9090c0] px-2 py-2 text-center text-white font-bold">Prereqs</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c, i) => {
              const avail = c.sections.reduce((s, sec) => s + (sec.capacity - sec.enrolled), 0);
              const prereqCount = (PREREQS[c.code] ?? []).length;
              const isSelected = c.id === selectedCourseId;
              const bg = isSelected ? "#e8f4fd" : i % 2 === 0 ? "#ffffff" : "#ececfa";
              return (
                <tr key={c.id}
                  style={{ backgroundColor: bg, outline: isSelected ? "2px solid #6261c0" : "none", outlineOffset: -1 }}
                  className="cursor-pointer transition-all hover:brightness-95"
                  onClick={() => onOpenCourse(c)}>
                  <td className="border border-[#c0c0c0] px-3 py-1.5 font-mono font-bold" style={{ color: "#016691" }}>
                    {c.code}
                  </td>
                  <td className="border border-[#c0c0c0] px-3 py-1.5 max-w-[200px]">
                    <span className="line-clamp-1">{c.title}</span>
                  </td>
                  <td className="border border-[#c0c0c0] px-2 py-1.5 text-center">{c.units}</td>
                  <td className="border border-[#c0c0c0] px-2 py-1.5 text-center font-mono">{c.dept}</td>
                  <td className="border border-[#c0c0c0] px-2 py-1.5 text-center">{c.sections.length}</td>
                  <td className="border border-[#c0c0c0] px-2 py-1.5 text-center font-mono"
                    style={{ color: avail > 0 ? "#006666" : "#cc0000" }}>{avail}</td>
                  <td className="border border-[#c0c0c0] px-2 py-1.5 text-center">
                    {c.offeredThisQuarter
                      ? <span className="font-bold" style={{ color: "#d56a03" }}>SP25</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="border border-[#c0c0c0] px-2 py-1.5 text-center">
                    {prereqCount > 0
                      ? <span className="text-purple-700 font-mono font-bold">{prereqCount}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      <div className="mt-2 text-[0.769rem] text-gray-500">
        Showing {courses.length} of {COURSES.length} courses · Spring 2025 · UC San Diego
      </div>
    </div>
  );
}
