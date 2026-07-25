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
