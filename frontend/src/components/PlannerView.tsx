import { useCallback, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DayHeaderContentArg, EventClickArg, EventContentArg } from "@fullcalendar/core";
import { useTerm } from "../hooks/useTerm";
import { finalsWeekISO } from "../lib/academicCalendar";
import { fmt, fmtRange, splitRoom } from "../lib/schedule";
import {
  REG_INITIAL_DATE,
  buildFinalsEvents, buildRegularEvents,
  type PlannerEventProps,
} from "../lib/plannerEvents";
import type { PlannedItem } from "../types";

// A WebReg class block: time and status on the first line, the course code
// in bold, then meeting type and room, then the instructor. Clicking a block
// opens the course's drawer, where Remove and Change live.
function renderEvent(arg: EventContentArg) {
  const p = arg.event.extendedProps as PlannerEventProps;
  const hours = p.endH - p.startH;
  const loc = splitRoom(p.room);
  const where = loc.room ? `${loc.building} ${loc.room}` : loc.building;
  return (
    <div className="relative h-full overflow-hidden px-1.5 py-1 leading-tight text-white" style={{ fontSize: "0.769rem" }}>
      <div className="flex items-baseline justify-between gap-1" style={{ fontSize: "0.692rem" }}>
        <span className="planner-ev-time opacity-90 whitespace-nowrap">{fmtRange(p.startH, p.endH)}</span>
        <span className="planner-ev-status font-bold whitespace-nowrap ml-auto" style={{ color: p.conflict ? "#ffd6d6" : "#fff" }}>
          {p.conflict ? "Conflict" : "Planned"}
        </span>
      </div>
      <div className="font-bold truncate" style={{ fontSize: "0.846rem" }}>{p.code}</div>
      {hours >= 0.8 && <div className="truncate opacity-95">{p.type} / {where}</div>}
      {hours >= 1.4 && <div className="truncate opacity-85">{p.instructor}</div>}
    </div>
  );
}

export function PlannerView({ mode, items, onSelectCourse }: {
  mode: "week" | "finals";
  items: PlannedItem[];
  onSelectCourse?: (courseId: string) => void;
}) {
  const finalsMode = mode === "finals";
  const term = useTerm();
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // FullCalendar only re-measures on window resize; the page container also
  // changes width as the search panel opens and closes. Observe the wrapper
  // and nudge the calendar to re-measure.
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

  const events = useMemo(
    () => (finalsMode ? buildFinalsEvents(items, term) : buildRegularEvents(items)),
    [items, finalsMode, term],
  );

  function handleEventClick(arg: EventClickArg) {
    const { courseId } = arg.event.extendedProps as PlannerEventProps;
    arg.jsEvent.stopPropagation();
    setHighlightId(prev => (prev === courseId ? null : courseId));
    onSelectCourse?.(courseId);
  }

  const dayHeader = (arg: DayHeaderContentArg) => {
    const weekday = arg.date.toLocaleDateString("en-US", { weekday: "long" });
    if (!finalsMode) return <>{weekday}</>;
    const date = arg.date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
    return <>{weekday.slice(0, 3)}<small>{date}</small></>;
  };

  return (
    <div ref={observeWrap} onClick={() => setHighlightId(null)} className={`wr-scroll-x ${finalsMode ? "planner-finals" : ""}`}>
      <div style={{ minWidth: "46rem" }}>
      <FullCalendar
        ref={calRef}
        // initialDate only applies on mount, so a new term's finals week remounts.
        key={finalsMode ? `fin:${term}` : "reg"}
        plugins={[timeGridPlugin]}
        initialView="timeGridWeek"
        initialDate={finalsMode ? finalsWeekISO(term)[0] : REG_INITIAL_DATE}
        headerToolbar={false}
        firstDay={1}
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        slotLabelContent={arg => fmt(arg.date.getHours())}
        dayHeaderContent={dayHeader}
        expandRows={false}
        height="auto"
        nowIndicator={false}
        displayEventTime={false}
        slotEventOverlap={false}
        events={events}
        eventContent={renderEvent}
        eventClassNames={arg => {
          const p = arg.event.extendedProps as PlannerEventProps;
          const cls: string[] = [];
          if (p.conflict) cls.push("planner-ev-conflict");
          if (highlightId && p.courseId !== highlightId) cls.push("planner-ev-dim");
          return cls;
        }}
        eventClick={handleEventClick}
        stickyHeaderDates={false}
      />
      </div>
    </div>
  );
}
