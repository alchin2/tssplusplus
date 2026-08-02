import { AlertCircle, CheckCircle2 } from "lucide-react";
import { conflictsWith, fmt } from "../lib/schedule";
import type { Course, PlannedItem, Section } from "../types";

export function SectionsTable({ course, plannedItems, onAdd }: {
  course: Course; plannedItems: PlannedItem[]; onAdd: (c: Course, s: Section) => void;
}) {
  const alreadyPlanned = plannedItems.some(i => i.course.id === course.id);
  const totalSeats = course.sections.reduce((s, sec) => s + sec.capacity, 0);
  const totalEnrolled = course.sections.reduce((s, sec) => s + sec.enrolled, 0);

  return (
    <div>
      {alreadyPlanned && (
        <div className="mb-2 flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium border border-green-400 bg-green-50 text-green-800">
          <CheckCircle2 className="w-3 h-3" /> A section is in your planner.
        </div>
      )}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ backgroundColor: "#ececfa" }}>
            <th className="border border-[#c0c0c0] px-2 py-1 text-left font-bold">Sec</th>
            <th className="border border-[#c0c0c0] px-2 py-1 text-left font-bold">Instructor</th>
            <th className="border border-[#c0c0c0] px-2 py-1 text-left font-bold">Meeting</th>
            <th className="border border-[#c0c0c0] px-2 py-1 text-center font-bold">Avail/Enrl/Lim</th>
            <th className="border border-[#c0c0c0] px-1 py-1 text-center font-bold">WL</th>
            <th className="border border-[#c0c0c0] px-1 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {course.sections.map((sec, si) => {
            const avail = sec.capacity - sec.enrolled;
            const conflict = !alreadyPlanned && conflictsWith(sec, plannedItems);
            const bg = si % 2 === 0 ? "#ffffff" : "#f5f5fb";
            return (
              <tr key={sec.id} style={{ backgroundColor: conflict ? "#fff0f0" : bg }}>
                <td className="border border-[#c0c0c0] px-2 py-1 font-mono font-bold text-[0.846rem]">{sec.id}</td>
                <td className="border border-[#c0c0c0] px-2 py-1 whitespace-nowrap text-[0.846rem]">{sec.instructor}</td>
                <td className="border border-[#c0c0c0] px-2 py-1">
                  {sec.meetings.map((m, mi) => (
                    <div key={mi} className="whitespace-nowrap text-[0.846rem]">
                      <span className={`font-mono font-bold mr-1 ${m.type === "LE" ? "text-blue-700" : m.type === "DI" ? "text-purple-700" : "text-orange-700"}`}>{m.type}</span>
                      {m.days.join("")} {fmt(m.start)}–{fmt(m.end)} <span className="text-gray-500">{m.room}</span>
                    </div>
                  ))}
                </td>
                <td className="border border-[#c0c0c0] px-2 py-1 text-center font-mono text-[0.846rem]">
                  <span style={{ color: avail > 0 ? "#006666" : "#cc0000" }}>{avail}</span>/{sec.enrolled}/{sec.capacity}
                </td>
                <td className="border border-[#c0c0c0] px-1 py-1 text-center font-mono text-[0.846rem]">
                  {sec.waitlist > 0 ? <span style={{ color: "#cc6600" }}>{sec.waitlist}</span> : "—"}
                </td>
                <td className="border border-[#c0c0c0] px-1 py-1 text-center">
                  {conflict
                    ? <span className="text-red-700 text-[0.769rem] flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />Conflict</span>
                    : alreadyPlanned
                    ? <span className="text-green-700 text-[0.769rem]">✓</span>
                    : <button onClick={() => onAdd(course, sec)}
                        className="px-1.5 py-0.5 text-[0.769rem] font-bold cursor-pointer"
                        style={{ background: "linear-gradient(to bottom, #f5c842, #e6a800)", border: "1px solid #c8900a", color: "#333" }}>
                        ADD
                      </button>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-1.5 text-[0.769rem] text-gray-500 flex gap-3">
        <span>Total: <strong>{totalEnrolled}</strong>/{totalSeats}</span>
        <span style={{ color: "#006666" }}>Available: <strong>{totalSeats - totalEnrolled}</strong></span>
      </div>
    </div>
  );
}
