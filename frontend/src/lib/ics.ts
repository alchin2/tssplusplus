import { computeFinal } from "./schedule";
import { FINALS_WEEK, REG_WEEK } from "./plannerEvents";
import type { DayCode, PlannedItem } from "../types";

const TZID = "America/Los_Angeles";
const BYDAY: Record<DayCode, string> = { M: "MO", Tu: "TU", W: "WE", Th: "TH", F: "FR" };
const DAY_ORDER: DayCode[] = ["M", "Tu", "W", "Th", "F"];
// Weeks of recurrence per meeting — a standard 10-week quarter.
const WEEKS = 10;

// "2025-06-02" → "20250602" (ICS date-time basic format).
const icsDate = (iso: string) => iso.replaceAll("-", "");

function icsTime(h: number): string {
  const total = Math.round(h * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}00`;
}

// RFC 5545 text escaping: backslash, semicolon, comma, newline.
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildICS(items: PlannedItem[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TSS++//Schedule Planner//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const { course, section } of items) {
    section.meetings.forEach((m, i) => {
      if (m.days.length === 0 || m.end <= m.start) return;
      const first = DAY_ORDER.find(d => m.days.includes(d))!;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${course.id}-${section.id}-${m.type}-${i}@tssplusplus`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=${TZID}:${icsDate(REG_WEEK[first])}T${icsTime(m.start)}`,
        `DTEND;TZID=${TZID}:${icsDate(REG_WEEK[first])}T${icsTime(m.end)}`,
        `RRULE:FREQ=WEEKLY;COUNT=${m.days.length * WEEKS};BYDAY=${m.days.map(d => BYDAY[d]).join(",")}`,
        `SUMMARY:${esc(`${course.code} ${m.type}`)}`,
        `LOCATION:${esc(m.room)}`,
        "END:VEVENT",
      );
    });
    const fi = computeFinal(section);
    if (fi) {
      const room = section.meetings.find(m => m.type === "LE")?.room ?? "TBD";
      lines.push(
        "BEGIN:VEVENT",
        `UID:${course.id}-${section.id}-final@tssplusplus`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=${TZID}:${icsDate(FINALS_WEEK[fi.colIdx])}T${icsTime(fi.startH)}`,
        `DTEND;TZID=${TZID}:${icsDate(FINALS_WEEK[fi.colIdx])}T${icsTime(fi.endH)}`,
        `SUMMARY:${esc(`${course.code} FINAL`)}`,
        `LOCATION:${esc(room)}`,
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function downloadICS(items: PlannedItem[]): void {
  const blob = new Blob([buildICS(items)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tss-schedule.ics";
  a.click();
  URL.revokeObjectURL(url);
}
