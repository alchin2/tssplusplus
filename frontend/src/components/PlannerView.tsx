import { AlertTriangle, CalendarX2, Download, Search, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import { toast } from "sonner";
import { finalsRangeLabel, fmt } from "../lib/schedule";
import { downloadICS } from "../lib/ics";
import {
  FIN_INITIAL_DATE, REG_INITIAL_DATE,
  buildFinalsEvents, buildRegularEvents, conflictingCourseIds,
  type PlannerEventProps,
} from "../lib/plannerEvents";
import type { PlannedItem } from "../types";

function renderEvent(arg: EventContentArg) {
  const p = arg.event.extendedProps as PlannerEventProps;
  return (
    <div className="relative h-full overflow-hidden px-1.5 py-1 leading-tight text-white">
      {p.conflict && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "repeating-linear-gradient(135deg, transparent 0 6px, rgba(120,0,0,0.30) 6px 9px)" }} />
      )}
      <div className="flex items-center gap-1">
        <span className="font-mono font-bold text-[0.769rem]">{p.code}</span>
        {p.conflict && <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: "#ffd7d7" }} />}
      </div>
      <div className="text-[0.692rem] opacity-90 leading-tight truncate">{p.type} · {p.room}</div>
      <div className="text-[0.692rem] opacity-75 leading-tight">{fmt(p.startH)}–{fmt(p.endH)}</div>
    </div>
  );
}

export function PlannerView({ items, onRemove, onBrowse }: {
  items: PlannedItem[];
  onRemove: (id: string) => void;
  onBrowse?: () => void;
}) {
  const [finalsMode, setFinalsMode] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // FullCalendar only re-measures on window resize, but this container also
  // changes width when the course-detail panel animates open/closed. Observe
  // the wrapper and nudge the calendar to re-measure.
  const calRef = useRef<FullCalendar | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const observeWrap = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (el) {
      roRef.current = new ResizeObserver(() =>
        requestAnimationFrame(() => calRef.current?.getApi().updateSize()),
      );
      roRef.current.observe(el);
    }
  }, []);

  const conflictIds = useMemo(() => conflictingCourseIds(items), [items]);
  const events = useMemo(
    () => (finalsMode ? buildFinalsEvents(items) : buildRegularEvents(items)),
    [items, finalsMode],
  );

  function toggleHighlight(courseId: string) {
    setHighlightId(prev => (prev === courseId ? null : courseId));
  }

  function handleEventClick(arg: EventClickArg) {
    toggleHighlight((arg.event.extendedProps as PlannerEventProps).courseId);
  }

  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="text-center max-w-xs border border-[#c0c0c0] bg-white px-8 py-10"
          style={{ boxShadow: "4px 4px 0 #c9cede" }}>
          <CalendarX2 className="w-10 h-10 mx-auto" style={{ color: "#6261c0" }} />
          <h3 className="mt-4 font-bold" style={{ color: "#0b4a67" }}>Nothing scheduled yet</h3>
          <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
            Find a course and click ADD — every section you pick lands on this calendar.
          </p>
          {onBrowse && (
            <button onClick={onBrowse}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-110"
              style={{ backgroundColor: "#0b4a67", border: "1px solid #083a52" }}>
              <Search className="w-3.5 h-3.5" /> Browse courses
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* ── Sidebar: planned courses ── */}
      <aside className="w-64 flex-shrink-0 border-r border-[#c0c0c0] bg-[#f5f5fa] flex flex-col">
        <div className="px-3 py-2 border-b border-[#c0c0c0]" style={{ backgroundColor: "#6261c0" }}>
          <h3 className="font-bold text-white text-xs tracking-wide">PLANNED COURSES</h3>
          <p className="text-white opacity-70 text-[10px]">{items.length} course{items.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {items.map(({ course, section }) => {
            const highlighted = highlightId === course.id;
            const conflict = conflictIds.has(course.id);
            return (
              <div key={course.id} onClick={() => toggleHighlight(course.id)}
                className="w-full text-left flex items-stretch gap-2 px-2 py-1.5 border bg-white text-xs cursor-pointer transition-shadow"
                style={{
                  borderColor: highlighted ? "#0b4a67" : "#c0c0c0",
                  boxShadow: highlighted ? "0 0 0 2px #f5c842" : "none",
                }}>
                <div className="w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: course.color }} />
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center gap-1.5">
                    <p className="font-mono font-bold text-[0.846rem]">{course.code} – {section.id}</p>
                    {conflict && (
                      <span className="text-[0.577rem] font-bold px-1 py-px leading-tight flex-shrink-0"
                        style={{ backgroundColor: "#cc0000", color: "#fff" }}>
                        CONFLICT
                      </span>
                    )}
                  </div>
                  <p className="text-[0.769rem] text-gray-500 truncate">{section.instructor}</p>
                  <div className="mt-0.5 space-y-px">
                    {section.meetings.map((m, i) => (
                      <p key={i} className="text-[0.692rem] text-gray-400 font-mono truncate">
                        {m.type} · {m.days.join("")} · {fmt(m.start)}–{fmt(m.end)}
                      </p>
                    ))}
                  </div>
                </div>
                <button aria-label={`Remove ${course.code}`}
                  onClick={e => { e.stopPropagation(); onRemove(course.id); }}
                  className="self-center p-0.5 text-gray-400 hover:text-red-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="p-2 border-t border-[#c0c0c0] space-y-1.5">
          <button
            onClick={() => { downloadICS(items); toast.success("Schedule exported — check your downloads for tss-schedule.ics"); }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold"
            style={{ background: "linear-gradient(to bottom, #f5c842, #e6a800)", border: "1px solid #c8900a", color: "#333" }}>
            <Download className="w-3.5 h-3.5 text-[#333]" /><span className="text-[#333]">Export ICS</span>
          </button>
          <button onClick={() => items.forEach(i => onRemove(i.course.id))}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold border border-[#c0c0c0] bg-white text-gray-700 hover:bg-gray-50">
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>
      </aside>

      {/* ── Calendar column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex-shrink-0 flex items-center gap-3 px-3 py-2 border-b border-[#c0c0c0] bg-[#ececfa]">
          <div className="flex" style={{ border: "1px solid #0b4a67" }}>
            <button onClick={() => setFinalsMode(false)}
              className="px-3 py-1 text-[0.692rem] font-bold transition-colors"
              style={{ backgroundColor: !finalsMode ? "#0b4a67" : "#fff", color: !finalsMode ? "#fff" : "#0b4a67" }}>
              WEEKLY
            </button>
            <button onClick={() => setFinalsMode(true)}
              className="px-3 py-1 text-[0.692rem] font-bold transition-colors border-l"
              style={{
                backgroundColor: finalsMode ? "#6261c0" : "#fff",
                color: finalsMode ? "#fff" : "#0b4a67",
                borderColor: "#0b4a67",
              }}>
              FINALS
            </button>
          </div>
          {finalsMode && (
            <span className="text-[0.692rem] font-bold tracking-wide" style={{ color: "#6261c0" }}>
              FINALS WEEK · {finalsRangeLabel()}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3 text-[0.692rem] text-gray-600">
            <span><b>{items.length}</b> course{items.length !== 1 ? "s" : ""} planned</span>
            {conflictIds.size > 0 && (
              <span className="flex items-center gap-1 font-bold" style={{ color: "#cc0000" }}>
                <AlertTriangle className="w-3 h-3" />
                {conflictIds.size} time conflict{conflictIds.size !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* FullCalendar */}
        <div ref={observeWrap} className={`flex-1 min-h-0 bg-white ${finalsMode ? "planner-finals" : ""}`}>
          <FullCalendar
            ref={calRef}
            key={finalsMode ? "fin" : "reg"}
            plugins={[timeGridPlugin]}
            initialView="timeGridWeek"
            initialDate={finalsMode ? FIN_INITIAL_DATE : REG_INITIAL_DATE}
            headerToolbar={false}
            firstDay={1}
            hiddenDays={finalsMode ? [0] : []}
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="21:00:00"
            slotDuration="01:00:00"
            slotLabelContent={arg => fmt(arg.date.getHours())}
            dayHeaderFormat={finalsMode
              ? { weekday: "short", month: "short", day: "numeric", omitCommas: true }
              : { weekday: "short" }}
            expandRows
            height="100%"
            nowIndicator={false}
            displayEventTime={false}
            slotEventOverlap={false}
            events={events}
            eventContent={renderEvent}
            eventClassNames={arg =>
              highlightId && (arg.event.extendedProps as PlannerEventProps).courseId !== highlightId
                ? ["planner-ev-dim"]
                : []
            }
            eventClick={handleEventClick}
          />
        </div>
      </div>
    </div>
  );
}
