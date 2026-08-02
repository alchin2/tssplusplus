import { Download, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { DAY_CODES, DAY_LABELS, FINALS_COLS, computeFinal, fmt } from "../lib/schedule";
import type { PlannedItem } from "../types";

export function PlannerView({ items, onRemove }: { items: PlannedItem[]; onRemove: (id: string) => void }) {
  const HOUR_H = 52, START = 8, END = 21;
  const hours = Array.from({ length: END - START }, (_, i) => START + i);
  const [finalsMode, setFinalsMode] = useState(false);

  const finalsItems = useMemo(() =>
    items.map(({ course, section }) => ({ course, section, fi: computeFinal(section) }))
      .filter(x => x.fi),
    [items]);

  return (
    <div className="flex h-[calc(100vh-88px)]">
      <aside className="w-60 flex-shrink-0 border-r border-[#c0c0c0] bg-[#f5f5fa] flex flex-col">
        <div className="px-3 py-2 border-b border-[#c0c0c0]" style={{ backgroundColor: "#6261c0" }}>
          <h3 className="font-bold text-white text-xs">PLANNED COURSES</h3>
          <p className="text-white opacity-70 text-[10px]">{items.length} course{items.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {items.length === 0
            ? <p className="text-xs text-gray-500 text-center py-6">No courses added yet.<br />Search and click ADD.</p>
            : items.map(({ course, section }) => (
              <div key={course.id} className="flex items-center gap-2 px-2 py-1.5 border border-[#c0c0c0] bg-white text-xs">
                <div className="w-2 min-h-[28px] flex-shrink-0 rounded-sm self-stretch" style={{ backgroundColor: course.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-bold text-[11px]">{course.code} – {section.id}</p>
                  <p className="text-[10px] text-gray-500 truncate">{section.instructor}</p>
                </div>
                <button onClick={() => onRemove(course.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          }
        </div>
        {items.length > 0 && (
          <div className="p-2 border-t border-[#c0c0c0] space-y-1.5">
            <button className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold"
              style={{ background: "linear-gradient(to bottom, #f5c842, #e6a800)", border: "1px solid #c8900a", color: "#333" }}>
              <Download className="w-3.5 h-3.5 text-[#333]" /><span className="text-[#333]">Export ICS</span>
            </button>
            <button onClick={() => items.forEach(i => onRemove(i.course.id))}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold border border-[#c0c0c0] bg-white text-gray-700 hover:bg-gray-50">
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          </div>
        )}
      </aside>

      <div className="flex-1 overflow-auto">
        {/* Week toggle */}
        <div className="sticky top-0 z-10 border-b border-[#c0c0c0] bg-[#ececfa] flex items-stretch">
          <div className="w-14 flex-shrink-0 border-r border-[#c0c0c0] flex items-center justify-center">
            <div className="flex flex-col gap-px">
              <button onClick={() => setFinalsMode(false)}
                className="text-[8px] font-bold px-1.5 py-0.5 transition-colors"
                style={{ backgroundColor: !finalsMode ? "#0b4a67" : "#dde1ec", color: !finalsMode ? "#fff" : "#4a5875" }}>
                REG
              </button>
              <button onClick={() => setFinalsMode(true)}
                className="text-[8px] font-bold px-1.5 py-0.5 transition-colors"
                style={{ backgroundColor: finalsMode ? "#6261c0" : "#dde1ec", color: finalsMode ? "#fff" : "#4a5875" }}>
                FIN
              </button>
            </div>
          </div>
          {finalsMode ? (
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(6, 1fr)` }}>
              {FINALS_COLS.map((d, i) => (
                <div key={i} className="py-1.5 px-1 text-center text-[10px] font-bold border-r border-[#c0c0c0] last:border-r-0 leading-tight" style={{ color: "#6261c0" }}>
                  {d.split(" ").map((p, j) => <div key={j}>{p}</div>)}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-5">
              {DAY_LABELS.map(d => (
                <div key={d} className="py-1.5 text-center text-xs font-bold border-r border-[#c0c0c0] last:border-r-0" style={{ color: "#0b4a67" }}>{d}</div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar body */}
        <div className="flex">
          <div className="w-14 flex-shrink-0 border-r border-[#c0c0c0]">
            {hours.map(h => (
              <div key={h} style={{ height: HOUR_H }} className="relative border-b border-[#e0e0e0]">
                <span className="absolute right-1.5 top-0 text-[9px] text-gray-400 font-mono">{fmt(h)}</span>
              </div>
            ))}
          </div>

          {finalsMode ? (
            /* ── Finals week grid (6 cols) ── */
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(6, 1fr)`, height: hours.length * HOUR_H }}>
              {FINALS_COLS.map((_, colIdx) => (
                <div key={colIdx} className="relative border-r border-[#c0c0c0] last:border-r-0">
                  {hours.map((_, hi) => <div key={hi} className="absolute inset-x-0 border-b border-[#e8e8e8]" style={{ top: hi * HOUR_H }} />)}
                  {finalsItems
                    .filter(({ fi }) => fi!.colIdx === colIdx)
                    .map(({ course, section, fi }, i) => {
                      const lec = section.meetings.find(m => m.type === "LE");
                      const top = (fi!.startH - START) * HOUR_H + 1;
                      const h   = (fi!.endH - fi!.startH) * HOUR_H - 2;
                      return (
                        <div key={i} className="absolute inset-x-0.5 text-white text-[10px] overflow-hidden border border-white/30 px-1.5 py-1"
                          style={{ top, height: h, backgroundColor: course.color }}>
                          <div className="font-mono font-bold leading-tight">{course.code}</div>
                          <div className="opacity-90 font-bold text-[9px] leading-tight">FINAL</div>
                          <div className="opacity-75 leading-tight text-[9px]">{lec?.room ?? "TBD"}</div>
                          <div className="opacity-75 leading-tight text-[9px]">{fmt(fi!.startH)}–{fmt(fi!.endH)}</div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          ) : (
            /* ── Regular week grid (5 cols) ── */
            <div className="flex-1 grid grid-cols-5" style={{ height: hours.length * HOUR_H }}>
              {DAY_CODES.map(dc => (
                <div key={dc} className="relative border-r border-[#c0c0c0] last:border-r-0">
                  {hours.map((_, hi) => <div key={hi} className="absolute inset-x-0 border-b border-[#e8e8e8]" style={{ top: hi * HOUR_H }} />)}
                  {items.flatMap(({ course, section }) =>
                    section.meetings.filter(m => m.days.includes(dc)).map(m => {
                      const top = (m.start - START) * HOUR_H + 1;
                      const h = (m.end - m.start) * HOUR_H - 2;
                      return (
                        <div key={`${course.id}-${section.id}-${m.type}`}
                          className="absolute inset-x-0.5 text-white text-[10px] overflow-hidden border border-white/30 px-1 py-0.5"
                          style={{ top, height: h, backgroundColor: course.color }}>
                          <div className="font-mono font-bold leading-tight">{course.code}</div>
                          <div className="opacity-80 leading-tight">{m.type} · {m.room}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
