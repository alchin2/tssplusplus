import type { DayCode, PlannedItem, Section } from "../types";
import { finalsWeekISO } from "./academicCalendar";

export function fmt(h: number): string {
  const hr = Math.floor(h), min = Math.round((h - hr) * 60);
  const ap = hr >= 12 ? "pm" : "am", h12 = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return `${h12}:${min.toString().padStart(2, "0")}${ap}`;
}

export const DAY_CODES: DayCode[] = ["M", "Tu", "W", "Th", "F", "Sa", "Su"];
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DEPTS = ["ALL", "CSE", "ECE", "MATH", "COGS"];

export function conflictsWith(s: Section, items: PlannedItem[]): boolean {
  for (const { section: b } of items)
    for (const ma of s.meetings)
      for (const mb of b.meetings)
        if (ma.days.some(d => mb.days.includes(d)) && ma.start < mb.end && mb.start < ma.end) return true;
  return false;
}

// ─── Finals ─────────────────────────────────────────────────────────────────
// A section's final slot is derived from its lecture's meeting pattern (MWF vs
// TuTh) and start time, mirroring the campus finals matrix. `colIdx` is the
// finals-week column (0 = Monday of finals week … 5 = Saturday); the concrete
// dates come from the current term (see finalsWeekISO in academicCalendar.ts),
// so only the column index is stored here.

export interface FinalInfo { colIdx: number; startH: number; endH: number; }

export function computeFinal(section: Section): FinalInfo | null {
  const lec = section.meetings.find(m => m.type === "LE");
  if (!lec) return null;
  const { days, start: s } = lec;
  const mwf = days.includes("M") && days.includes("W");
  const tth = days.includes("Tu") && days.includes("Th");
  if (mwf) {
    if (s <  9)  return { colIdx: 5, startH: 8, endH: 11 };
    if (s < 10)  return { colIdx: 0, startH: 8, endH: 11 };
    if (s < 11)  return { colIdx: 2, startH: 8, endH: 11 };
    if (s < 12)  return { colIdx: 4, startH: 8, endH: 11 };
    if (s < 13)  return { colIdx: 1, startH: 8, endH: 11 };
    if (s < 15)  return { colIdx: 3, startH: 8, endH: 11 };
  }
  if (tth) {
    if (s <  9.5) return { colIdx: 0, startH: 11.5, endH: 14.5 };
    if (s < 11)   return { colIdx: 2, startH: 11.5, endH: 14.5 };
    if (s < 12.5) return { colIdx: 4, startH: 11.5, endH: 14.5 };
    if (s < 14)   return { colIdx: 1, startH: 11.5, endH: 14.5 };
    if (s < 16)   return { colIdx: 3, startH: 11.5, endH: 14.5 };
  }
  return null;
}

const UTC = { timeZone: "UTC" } as const;
const asDate = (iso: string) => new Date(iso + "T00:00:00Z");

// Human label for a final's day (e.g. "Mon Dec 8"), read from the current
// term's finals week -- or the fixed fallback week when the term isn't known.
export function finalDateLabel(colIdx: number): string {
  return asDate(finalsWeekISO()[colIdx])
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...UTC })
    .replace(",", "");
}

// Range label for the whole finals week (e.g. "Dec 8–13, 2026"), for headings.
export function finalsRangeLabel(): string {
  const week = finalsWeekISO();
  const s = asDate(week[0]), e = asDate(week[week.length - 1]);
  const mon = (d: Date) => d.toLocaleDateString("en-US", { month: "short", ...UTC });
  const start = `${mon(s)} ${s.getUTCDate()}`;
  const end = s.getUTCMonth() === e.getUTCMonth() ? `${e.getUTCDate()}` : `${mon(e)} ${e.getUTCDate()}`;
  return `${start}–${end}, ${e.getUTCFullYear()}`;
}
