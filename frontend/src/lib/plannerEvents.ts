import type { EventInput } from "@fullcalendar/core";
import { computeFinal, conflictsWith } from "./schedule";
import type { DayCode, PlannedItem } from "../types";

// FullCalendar renders concrete dates, so meetings are pinned onto a fixed
// reference week. The finals week matches the campus finals matrix used by
// computeFinal/FINALS_COLS (Mon Jun 9 – Sat Jun 14); the regular week is the
// Mon–Fri immediately before it. Both are in the past, so FullCalendar never
// shows a "today" highlight or now-indicator.
export const REG_INITIAL_DATE = "2025-06-02";
export const FIN_INITIAL_DATE = "2025-06-09";

export const REG_WEEK: Record<DayCode, string> = {
  M: "2025-06-02",
  Tu: "2025-06-03",
  W: "2025-06-04",
  Th: "2025-06-05",
  F: "2025-06-06",
};

// Index = FinalInfo.colIdx (0 = Mon Jun 9 … 5 = Sat Jun 14).
export const FINALS_WEEK = [
  "2025-06-09", "2025-06-10", "2025-06-11",
  "2025-06-12", "2025-06-13", "2025-06-14",
];

// Decimal hours → "HH:MM:00". Minutes are rounded, not truncated: 8.833 → 08:50.
export function toHMS(h: number): string {
  const total = Math.round(h * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

export interface PlannerEventProps {
  courseId: string;
  code: string;
  title: string;
  type: string;
  room: string;
  startH: number;
  endH: number;
  conflict: boolean;
}

// conflictsWith compares a section against every item's meetings, including
// its own (a section always overlaps itself), so each check must exclude the
// item's own course from the comparison set.
export function conflictingCourseIds(items: PlannedItem[]): Set<string> {
  const ids = new Set<string>();
  for (const { course, section } of items) {
    const others = items.filter(o => o.course.id !== course.id);
    if (others.length > 0 && conflictsWith(section, others)) ids.add(course.id);
  }
  return ids;
}

export function buildRegularEvents(items: PlannedItem[]): EventInput[] {
  const events: EventInput[] = [];
  for (const { course, section } of items) {
    // Flag the specific colliding blocks, not the whole section — a course
    // whose lecture conflicts shouldn't hatch its unrelated discussion slot.
    const otherMeetings = items
      .filter(o => o.course.id !== course.id)
      .flatMap(o => o.section.meetings);
    for (const m of section.meetings) {
      if (m.end <= m.start) continue;
      for (const day of m.days) {
        const conflict = otherMeetings.some(
          mb => mb.days.includes(day) && m.start < mb.end && mb.start < m.end,
        );
        events.push({
          id: `${course.id}:${section.id}:${m.type}:${day}`,
          start: `${REG_WEEK[day]}T${toHMS(m.start)}`,
          end: `${REG_WEEK[day]}T${toHMS(m.end)}`,
          backgroundColor: course.color,
          borderColor: "transparent",
          extendedProps: {
            courseId: course.id,
            code: course.code,
            title: course.title,
            type: m.type,
            room: m.room,
            startH: m.start,
            endH: m.end,
            conflict,
          } satisfies PlannerEventProps,
        });
      }
    }
  }
  return events;
}

export function buildFinalsEvents(items: PlannedItem[]): EventInput[] {
  const events: EventInput[] = [];
  for (const { course, section } of items) {
    const fi = computeFinal(section);
    if (!fi) continue;
    const room = section.meetings.find(m => m.type === "LE")?.room ?? "TBD";
    events.push({
      id: `${course.id}:${section.id}:final`,
      start: `${FINALS_WEEK[fi.colIdx]}T${toHMS(fi.startH)}`,
      end: `${FINALS_WEEK[fi.colIdx]}T${toHMS(fi.endH)}`,
      backgroundColor: course.color,
      borderColor: "transparent",
      extendedProps: {
        courseId: course.id,
        code: course.code,
        title: course.title,
        type: "FINAL",
        room,
        startH: fi.startH,
        endH: fi.endH,
        conflict: false,
      } satisfies PlannerEventProps,
    });
  }
  return events;
}
