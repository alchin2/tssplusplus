import type { DayCode, PlannedItem, Section } from "../types";

export function fmt(h: number): string {
  const hr = Math.floor(h), min = Math.round((h - hr) * 60);
  const ap = hr >= 12 ? "pm" : "am", h12 = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return `${h12}:${min.toString().padStart(2, "0")}${ap}`;
}

export const DAY_CODES: DayCode[] = ["M", "Tu", "W", "Th", "F"];
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const DEPTS = ["ALL", "CSE", "ECE", "MATH", "COGS"];

export function conflictsWith(s: Section, items: PlannedItem[]): boolean {
  for (const { section: b } of items)
    for (const ma of s.meetings)
      for (const mb of b.meetings)
        if (ma.days.some(d => mb.days.includes(d)) && ma.start < mb.end && mb.start < ma.end) return true;
  return false;
}

// ─── Finals ─────────────────────────────────────────────────────────────────
// UCSD finals week runs Mon Jun 9 – Sat Jun 14. A section's final slot is
// derived from its lecture's meeting pattern (MWF vs TuTh) and start time,
// mirroring the campus finals matrix. `colIdx` is the finals-week column
// (0 = Mon … 5 = Sat).

export interface FinalInfo { dateLabel: string; colIdx: number; startH: number; endH: number; }

export const FINALS_COLS = ["Mon Jun 9", "Tue Jun 10", "Wed Jun 11", "Thu Jun 12", "Fri Jun 13", "Sat Jun 14"];

export function computeFinal(section: Section): FinalInfo | null {
  const lec = section.meetings.find(m => m.type === "LE");
  if (!lec) return null;
  const { days, start: s } = lec;
  const mwf = days.includes("M") && days.includes("W");
  const tth = days.includes("Tu") && days.includes("Th");
  if (mwf) {
    if (s <  9)  return { dateLabel: "Sat Jun 14", colIdx: 5, startH: 8, endH: 11 };
    if (s < 10)  return { dateLabel: "Mon Jun 9",  colIdx: 0, startH: 8, endH: 11 };
    if (s < 11)  return { dateLabel: "Wed Jun 11", colIdx: 2, startH: 8, endH: 11 };
    if (s < 12)  return { dateLabel: "Fri Jun 13", colIdx: 4, startH: 8, endH: 11 };
    if (s < 13)  return { dateLabel: "Tue Jun 10", colIdx: 1, startH: 8, endH: 11 };
    if (s < 15)  return { dateLabel: "Thu Jun 12", colIdx: 3, startH: 8, endH: 11 };
  }
  if (tth) {
    if (s <  9.5) return { dateLabel: "Mon Jun 9",  colIdx: 0, startH: 11.5, endH: 14.5 };
    if (s < 11)   return { dateLabel: "Wed Jun 11", colIdx: 2, startH: 11.5, endH: 14.5 };
    if (s < 12.5) return { dateLabel: "Fri Jun 13", colIdx: 4, startH: 11.5, endH: 14.5 };
    if (s < 14)   return { dateLabel: "Tue Jun 10", colIdx: 1, startH: 11.5, endH: 14.5 };
    if (s < 16)   return { dateLabel: "Thu Jun 12", colIdx: 3, startH: 11.5, endH: 14.5 };
  }
  return null;
}
