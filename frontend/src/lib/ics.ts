import { computeFinal } from "./schedule";
import { FINALS_WEEK, REG_WEEK } from "./plannerEvents";
import { currentTermDates } from "./academicCalendar";
import type { DayCode, PlannedItem } from "../types";

const TZID = "America/Los_Angeles";
const BYDAY: Record<DayCode, string> = { M: "MO", Tu: "TU", W: "WE", Th: "TH", F: "FR", Sa: "SA", Su: "SU" };
// Date#getUTCDay() convention: Sun=0 ... Sat=6.
const WEEKDAY: Record<DayCode, number> = { M: 1, Tu: 2, W: 3, Th: 4, F: 5, Sa: 6, Su: 0 };
const DAY_ORDER: DayCode[] = ["M", "Tu", "W", "Th", "F", "Sa", "Su"];
// Weeks of recurrence per meeting when the term's real dates aren't known
// (see academicCalendar.ts) — a standard 10-week quarter.
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

// RFC 5545 §3.1: content lines over 75 octets must be folded onto multiple
// physical lines, each continuation prefixed with one space.
function foldLine(line: string): string[] {
  if (line.length <= 75) return [line];
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    let split = rest.lastIndexOf(" ", 74);
    if (split <= 0) split = 74;
    parts.push(rest.slice(0, split));
    rest = " " + rest.slice(split).trimStart();
  }
  parts.push(rest);
  return parts;
}

// Calendar-date-only arithmetic done entirely in UTC so it can't drift a day
// depending on the browser's local timezone.
function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}
function firstOnOrAfter(start: Date, weekday: number): Date {
  let d = start;
  while (d.getUTCDay() !== weekday) d = addDays(d, 1);
  return d;
}

export function buildICS(items: PlannedItem[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  // Anchor on the term matching today's date, not the backend's served term.
  const cal = currentTermDates();

  const lines: string[] = [];
  const push = (line: string) => lines.push(...foldLine(line));

  push("BEGIN:VCALENDAR");
  push("VERSION:2.0");
  push("PRODID:-//TSS++//Schedule Planner//EN");
  push("CALSCALE:GREGORIAN");

  for (const { course, section } of items) {
    section.meetings.forEach((m, i) => {
      if (m.days.length === 0 || m.end <= m.start) return;

      push("BEGIN:VEVENT");
      push(`UID:${course.id}-${section.id}-${m.type}-${i}@tssplusplus`);
      push(`DTSTAMP:${stamp}`);

      if (cal) {
        // Real quarter dates: DTSTART is whichever meeting day's first real
        // occurrence falls earliest (not just the alphabetically-first day),
        // since the quarter's first day of instruction can land mid-week —
        // picking the wrong anchor would silently drop that first session.
        const instrStart = parseISO(cal.instructionStart);
        const instrEnd = parseISO(cal.instructionEnd);
        const dStart = m.days
          .map(d => firstOnOrAfter(instrStart, WEEKDAY[d]))
          .reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
        const dStartIso = toISO(dStart);
        push(`DTSTART;TZID=${TZID}:${icsDate(dStartIso)}T${icsTime(m.start)}`);
        push(`DTEND;TZID=${TZID}:${icsDate(dStartIso)}T${icsTime(m.end)}`);
        push(`RRULE:FREQ=WEEKLY;UNTIL=${icsDate(cal.instructionEnd)}T235959Z;BYDAY=${m.days.map(d => BYDAY[d]).join(",")}`);
        for (const day of m.days) {
          for (const h of cal.holidays) {
            const hd = parseISO(h);
            if (hd.getUTCDay() === WEEKDAY[day] && hd.getTime() >= dStart.getTime() && hd.getTime() <= instrEnd.getTime()) {
              push(`EXDATE;TZID=${TZID}:${icsDate(h)}T${icsTime(m.start)}`);
            }
          }
        }
      } else {
        // Term's real calendar isn't in academicCalendar.ts yet — fall back
        // to a generic WEEKS-week span anchored on the planner's reference week.
        const first = DAY_ORDER.find(d => m.days.includes(d))!;
        push(`DTSTART;TZID=${TZID}:${icsDate(REG_WEEK[first])}T${icsTime(m.start)}`);
        push(`DTEND;TZID=${TZID}:${icsDate(REG_WEEK[first])}T${icsTime(m.end)}`);
        push(`RRULE:FREQ=WEEKLY;COUNT=${m.days.length * WEEKS};BYDAY=${m.days.map(d => BYDAY[d]).join(",")}`);
      }

      push(`SUMMARY:${esc(`${course.code} ${m.type}`)}`);
      push(`LOCATION:${esc(m.room)}`);
      if (m.type === "LE" && section.instructor) {
        push(`DESCRIPTION:${esc(`${course.title} with instructor: ${section.instructor}`)}`);
      }
      push("STATUS:CONFIRMED");
      push("END:VEVENT");
    });

    const fi = computeFinal(section);
    if (fi) {
      const room = section.meetings.find(m => m.type === "LE")?.room ?? "TBD";
      const finalIso = cal ? toISO(addDays(parseISO(cal.finalsMonday), fi.colIdx)) : FINALS_WEEK[fi.colIdx];
      push("BEGIN:VEVENT");
      push(`UID:${course.id}-${section.id}-final@tssplusplus`);
      push(`DTSTAMP:${stamp}`);
      push(`DTSTART;TZID=${TZID}:${icsDate(finalIso)}T${icsTime(fi.startH)}`);
      push(`DTEND;TZID=${TZID}:${icsDate(finalIso)}T${icsTime(fi.endH)}`);
      push(`SUMMARY:${esc(`${course.code} FINAL`)}`);
      push(`LOCATION:${esc(room)}`);
      push("STATUS:CONFIRMED");
      push("END:VEVENT");
    }
  }
  push("END:VCALENDAR");
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
