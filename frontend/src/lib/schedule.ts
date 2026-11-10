import type { DayCode, PlannedItem, Section } from "../types";
import { finalsSpanISO, finalsWeekISO } from "./academicCalendar";

export function fmt(h: number): string {
  const hr = Math.floor(h), min = Math.round((h - hr) * 60);
  const ap = hr >= 12 ? "pm" : "am", h12 = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return `${h12}:${min.toString().padStart(2, "0")}${ap}`;
}

// WebReg's compact clock: "8:00a", "12:30p".
export function fmtShort(h: number): string {
  const hr = Math.floor(h), min = Math.round((h - hr) * 60);
  const ap = hr >= 12 ? "p" : "a", h12 = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return `${h12}:${min.toString().padStart(2, "0")}${ap}`;
}

export function fmtRange(start: number, end: number): string {
  return `${fmtShort(start)}-${fmtShort(end)}`;
}

// "Peterson Hall Room 110" -> { building: "Peterson Hall", room: "110" }.
// Rooms without the "Room" marker keep the whole string as the building.
export function splitRoom(room: string): { building: string; room: string } {
  const m = /^(.*?)\s+Room\s+(.+)$/.exec(room);
  if (m) return { building: m[1].trim(), room: m[2].trim() };
  return { building: room || "TBA", room: "" };
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

// Every colliding pair of planned courses, meetings and finals separately,
// in planner order -- the list WebReg prints in its conflict notice.
export interface ConflictPair { a: string; b: string; final: boolean }

export function conflictPairs(items: PlannedItem[], term?: string | null): ConflictPair[] {
  const out: ConflictPair[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const A = items[i], B = items[j];
      if (conflictsWith(A.section, [B])) out.push({ a: A.course.code, b: B.course.code, final: false });
      const fa = computeFinal(A.section, term), fb = computeFinal(B.section, term);
      if (fa && fb && fa.date === fb.date && fa.startH < fb.endH && fb.startH < fa.endH) {
        out.push({ a: A.course.code, b: B.course.code, final: true });
      }
    }
  }
  return out;
}

// ─── Finals ─────────────────────────────────────────────────────────────────
// A section's final is TSS's scheduled final (Section.final) when there is
// one. Otherwise it's guessed from its lecture's meeting pattern (MWF vs
// TuTh) and start time, mirroring the campus finals matrix, and flagged
// `estimated` so the UI can say so. `date` is the exam's ISO date; `room` is
// TSS's exam room, when it gives one.

export interface FinalInfo { date: string; startH: number; endH: number; room?: string | null; estimated: boolean; }

export function computeFinal(section: Section, term?: string | null): FinalInfo | null {
  const f = section.final;
  if (f) return { date: f.date, startH: f.start, endH: f.end, room: f.room, estimated: false };
  const m = matrixFinal(section);
  return m && { date: finalsWeekISO(term)[m.colIdx], startH: m.startH, endH: m.endH, estimated: true };
}

// `colIdx` is the finals-week column (0 = Monday of finals week … 5 =
// Saturday), resolved to a date against the selected term (see finalsWeekISO
// in academicCalendar.ts).
interface MatrixFinal { colIdx: number; startH: number; endH: number; }

function matrixFinal(section: Section): MatrixFinal | null {
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

// Human label for a final's day (e.g. "Mon Dec 8").
export function finalDateLabel(iso: string): string {
  return asDate(iso)
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...UTC })
    .replace(",", "");
}

// WebReg-style numeric date for a final's day, e.g. "Sa 12/13/2026".
export function finalDateShort(iso: string): string {
  const d = asDate(iso);
  const wd = d.toLocaleDateString("en-US", { weekday: "short", ...UTC });
  const code = wd === "Tue" ? "Tu" : wd === "Thu" ? "Th" : wd === "Sat" ? "Sa" : wd === "Sun" ? "Su" : wd[0];
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${code} ${mm}/${dd}/${d.getUTCFullYear()}`;
}

// Range label for the days the Finals tab shows (e.g. "Dec 5–12, 2026"), for headings.
export function finalsRangeLabel(term?: string | null): string {
  const week = finalsSpanISO(term);
  const s = asDate(week[0]), e = asDate(week[week.length - 1]);
  const mon = (d: Date) => d.toLocaleDateString("en-US", { month: "short", ...UTC });
  const start = `${mon(s)} ${s.getUTCDate()}`;
  const end = s.getUTCMonth() === e.getUTCMonth() ? `${e.getUTCDate()}` : `${mon(e)} ${e.getUTCDate()}`;
  return `${start}–${end}, ${e.getUTCFullYear()}`;
}
