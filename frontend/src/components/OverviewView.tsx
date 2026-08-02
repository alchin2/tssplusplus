import { BookOpen, LayoutGrid } from "lucide-react";
import { termLabel, useMeta } from "../hooks/useMeta";
import { computeFinal, fmt } from "../lib/schedule";
import type { PlannedItem } from "../types";

export function OverviewView({ items }: { items: PlannedItem[] }) {
  const term = termLabel(useMeta());
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-gray-400">
        <LayoutGrid className="w-10 h-10 opacity-30" />
        <p className="text-sm font-bold">No courses planned yet.</p>
        <p className="text-xs">Search for a course and click ADD to build your schedule.</p>
      </div>
    );
  }

  const totalHrs   = items.reduce((s, { section }) =>
    s + section.meetings.reduce((ms, m) => ms + (m.end - m.start) * m.days.length, 0), 0);
  const withSeats  = items.filter(({ section: sec }) => sec.enrolled !== null && sec.capacity !== null && sec.capacity > 0);
  const avgFill    = withSeats.length === 0 ? null : Math.round(
    withSeats.reduce((s, { section: sec }) => s + sec.enrolled! / sec.capacity!, 0) / withSeats.length * 100);
  const buildings  = new Set(items.flatMap(({ section }) =>
    section.meetings.map(m => m.room.split(" ")[0]))).size;
  const finals     = items.map(({ course, section }) => ({ course, section, fi: computeFinal(section) }))
    .filter(x => x.fi).sort((a, b) => (a.fi!.colIdx - b.fi!.colIdx) || (a.fi!.startH - b.fi!.startH));

  return (
    <div className="overflow-auto" style={{ backgroundColor: "#f5f5fa", minHeight: "100%" }}>

      {/* ── stats bar ── */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-[#b0b0c8] flex items-center gap-0" style={{ backgroundColor: "#6261c0" }}>
        <div className="pr-6">
          <div className="text-white font-bold text-sm">My Schedule Overview</div>
          <div className="text-white/60 text-[11px]">{term || "…"}</div>
        </div>
        {[
          { v: items.length,                            l: "Courses"      },
          { v: `${totalHrs.toFixed(1)}h`,               l: "Class Hrs/Wk" },
          { v: avgFill === null ? "—" : `${avgFill}%`,  l: "Avg Fill Rate" },
          { v: buildings,                               l: "Buildings"    },
        ].map(({ v, l }) => (
          <div key={l} className="border-l border-white/25 px-6">
            <div className="text-white font-bold text-xl leading-none">{v}</div>
            <div className="text-white/55 text-[10px] mt-1">{l}</div>
          </div>
        ))}
      </div>

      {/* ── course cards ── */}
      <div className="p-5 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))" }}>
        {items.map(({ course, section }) => {
          const fill = section.enrolled !== null && section.capacity ? section.enrolled / section.capacity : null;
          const fi   = computeFinal(section);
          const lec  = section.meetings.find(m => m.type === "LE");

          return (
            <div key={course.id} className="bg-white border border-[#d4d4e4] overflow-hidden"
              style={{ borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>

              {/* card header */}
              <div className="flex items-stretch">
                <div style={{ width: 5, backgroundColor: course.color, flexShrink: 0 }} />
                <div className="flex-1 px-4 py-3 border-b border-[#e8e8f4]" style={{ backgroundColor: "#fafafe" }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-base" style={{ color: "#0b4a67" }}>{course.code}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: course.color + "22", color: course.color }}>{course.dept}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-700 mt-0.5 leading-snug">{course.title}</p>
                    </div>
                    {course.offeredThisQuarter && (
                      <span className="text-[10px] font-bold px-2 py-0.5 flex-shrink-0" style={{ backgroundColor: "#d56a03", color: "#fff" }}>{term || "…"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* professor + section row */}
              <div className="flex items-stretch">
                <div style={{ width: 5, backgroundColor: course.color, flexShrink: 0 }} />
                <div className="flex-1 grid grid-cols-2 divide-x divide-[#e8e8f4] border-b border-[#e8e8f4]">
                  <div className="px-4 py-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Professor</div>
                    <div className="text-xs font-bold text-gray-700">{section.instructor}</div>
                  </div>
                  <div className="px-4 py-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Section</div>
                    <div className="text-xs font-bold" style={{ color: "#6261c0" }}>§ {section.id}</div>
                  </div>
                </div>
              </div>

              {/* enrollment row */}
              <div className="flex items-stretch">
                <div style={{ width: 5, backgroundColor: course.color, flexShrink: 0 }} />
                <div className="flex-1 px-4 py-2.5 border-b border-[#e8e8f4]">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Enrollment</div>
                  {fill === null ? (
                    <span className="text-[11px] text-gray-400 italic">No seat data</span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "#e8e8f0" }}>
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${fill * 100}%`,
                          backgroundColor: fill >= 1 ? "#dc2626" : fill > 0.8 ? "#d97706" : "#16a34a",
                        }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 whitespace-nowrap">
                        {section.enrolled} / {section.capacity}
                      </span>
                      <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: fill >= 1 ? "#dc2626" : fill > 0.8 ? "#d97706" : "#16a34a" }}>
                        {Math.round(fill * 100)}%
                      </span>
                      {(section.waitlist ?? 0) > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>
                          WL: {section.waitlist}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* schedule row */}
              <div className="flex items-stretch">
                <div style={{ width: 5, backgroundColor: course.color, flexShrink: 0 }} />
                <div className="flex-1 px-4 py-2.5 border-b border-[#e8e8f4]">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Schedule</div>
                  <table className="w-full text-[11px] border-collapse">
                    <tbody>
                      {section.meetings.map((m, i) => (
                        <tr key={i} className="border-b border-[#f0f0f8] last:border-0">
                          <td className="py-1 pr-3 font-bold" style={{ color: "#6261c0" }}>{m.type}</td>
                          <td className="py-1 pr-3 font-bold text-gray-600">{m.days.join(" ")}</td>
                          <td className="py-1 pr-3 text-gray-600">{fmt(m.start)} – {fmt(m.end)}</td>
                          <td className="py-1 text-gray-500 font-mono text-[10px]">{m.room}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* finals row */}
              <div className="flex items-stretch">
                <div style={{ width: 5, backgroundColor: course.color, flexShrink: 0 }} />
                <div className="flex-1 px-4 py-2.5" style={{ backgroundColor: fi ? "#faf8ff" : "#fafafa" }}>
                  <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400 mb-1">Final Exam</div>
                  {fi ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: "#6261c0", color: "#fff" }}>{fi.dateLabel}</span>
                      <span className="text-xs text-gray-700 font-bold">{fmt(fi.startH)} – {fmt(fi.endH)}</span>
                      <span className="text-[11px] text-gray-500 font-mono">{lec?.room ?? "TBD"}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400 italic">Schedule not determined</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── finals summary table ── */}
      {finals.length > 0 && (
        <div className="px-5 pb-6">
          <div className="border border-[#d4d4e4] bg-white overflow-hidden" style={{ borderRadius: 3 }}>
            <div className="px-4 py-2.5 border-b border-[#d4d4e4] flex items-center gap-2" style={{ backgroundColor: "#6261c0" }}>
              <BookOpen className="w-3.5 h-3.5 text-white" />
              <span className="font-bold text-white text-xs">Finals Week Summary — Jun 9–14, 2025</span>
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ backgroundColor: "#f0effe" }}>
                  {["Course", "Section", "Professor", "Date", "Time", "Room"].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] font-bold border-b border-[#d4d4e4] uppercase tracking-wide" style={{ color: "#6261c0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {finals.map(({ course, section, fi }, i) => {
                  const lec = section.meetings.find(m => m.type === "LE");
                  return (
                    <tr key={i} className="border-b border-[#ebebf4] last:border-0 hover:bg-[#faf8ff] transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: course.color }} />
                          <span className="font-mono font-bold" style={{ color: "#0b4a67" }}>{course.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: "#6261c0" }}>§ {section.id}</td>
                      <td className="px-4 py-2.5 text-gray-600">{section.instructor}</td>
                      <td className="px-4 py-2.5 font-bold text-gray-700">{fi!.dateLabel}</td>
                      <td className="px-4 py-2.5 text-gray-600">{fmt(fi!.startH)} – {fmt(fi!.endH)}</td>
                      <td className="px-4 py-2.5 text-gray-500 font-mono text-[10px]">{lec?.room ?? "TBD"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
