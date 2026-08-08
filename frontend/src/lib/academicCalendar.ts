// UCSD publishes each quarter's exact dates a year or more in advance
// (blink.ucsd.edu/instructors/resources/academic/calendars). ICS export
// needs real calendar dates -- unlike the planner grid, which anchors
// meetings on a fixed past reference week (see plannerEvents.ts) purely to
// give FullCalendar something to render. This table has to be extended by
// hand each quarter; buildICS() falls back to a generic 10-week span when
// the current term isn't listed here.
export interface TermDates {
  instructionStart: string; // ISO date, first day of instruction
  instructionEnd: string; // ISO date, last day of instruction
  finalsMonday: string; // ISO date, Monday of finals week (FinalInfo.colIdx 0)
  holidays: string[]; // ISO dates with no instruction, within [instructionStart, instructionEnd]
}

export const TERM_DATES: Record<string, TermDates> = {
  // .../calendars/2026.html
  fa26: {
    instructionStart: "2026-09-24",
    instructionEnd: "2026-12-04",
    finalsMonday: "2026-12-07",
    holidays: ["2026-11-11", "2026-11-26", "2026-11-27"],
  },
  wi27: {
    instructionStart: "2027-01-04",
    instructionEnd: "2027-03-12",
    finalsMonday: "2027-03-15",
    holidays: ["2027-01-18", "2027-02-15"],
  },
  sp27: {
    instructionStart: "2027-03-29",
    instructionEnd: "2027-06-04",
    finalsMonday: "2027-06-07",
    holidays: ["2027-05-31"],
  },
  // .../calendars/2027.html
  fa27: {
    instructionStart: "2027-09-23",
    instructionEnd: "2027-12-03",
    finalsMonday: "2027-12-06",
    holidays: ["2027-11-11", "2027-11-25", "2027-11-26"],
  },
  wi28: {
    instructionStart: "2028-01-10",
    instructionEnd: "2028-03-17",
    finalsMonday: "2028-03-20",
    holidays: ["2028-01-17", "2028-02-21"],
  },
  sp28: {
    instructionStart: "2028-04-03",
    instructionEnd: "2028-06-09",
    finalsMonday: "2028-06-12",
    holidays: ["2028-05-29"],
  },
  // .../calendars/2028.html
  fa28: {
    instructionStart: "2028-09-28",
    instructionEnd: "2028-12-08",
    finalsMonday: "2028-12-11",
    holidays: ["2028-11-10", "2028-11-23", "2028-11-24"],
  },
  wi29: {
    instructionStart: "2029-01-08",
    instructionEnd: "2029-03-16",
    finalsMonday: "2029-03-19",
    holidays: ["2029-01-15", "2029-02-19"],
  },
  sp29: {
    instructionStart: "2029-04-02",
    instructionEnd: "2029-06-08",
    finalsMonday: "2029-06-11",
    holidays: ["2029-05-28"],
  },
  // .../calendars/2029.html
  fa29: {
    instructionStart: "2029-09-27",
    instructionEnd: "2029-12-07",
    finalsMonday: "2029-12-10",
    holidays: ["2029-11-12", "2029-11-22", "2029-11-23"],
  },
  wi30: {
    instructionStart: "2030-01-07",
    instructionEnd: "2030-03-15",
    finalsMonday: "2030-03-18",
    holidays: ["2030-01-21", "2030-02-18"],
  },
  sp30: {
    instructionStart: "2030-04-01",
    instructionEnd: "2030-06-07",
    finalsMonday: "2030-06-10",
    holidays: ["2030-05-27"],
  },
  // .../calendars/2030.html
  fa30: {
    instructionStart: "2030-09-26",
    instructionEnd: "2030-12-06",
    finalsMonday: "2030-12-09",
    holidays: ["2030-11-11", "2030-11-28", "2030-11-29"],
  },
  wi31: {
    instructionStart: "2031-01-06",
    instructionEnd: "2031-03-14",
    finalsMonday: "2031-03-17",
    holidays: ["2031-01-20", "2031-02-17"],
  },
  sp31: {
    instructionStart: "2031-03-31",
    instructionEnd: "2031-06-06",
    finalsMonday: "2031-06-09",
    holidays: ["2031-05-26"],
  },
  // .../calendars/2031.html
  fa31: {
    instructionStart: "2031-09-25",
    instructionEnd: "2031-12-05",
    finalsMonday: "2031-12-08",
    holidays: ["2031-11-11", "2031-11-27", "2031-11-28"],
  },
  wi32: {
    instructionStart: "2032-01-05",
    instructionEnd: "2032-03-12",
    finalsMonday: "2032-03-15",
    holidays: ["2032-01-19", "2032-02-16"],
  },
  sp32: {
    instructionStart: "2032-03-29",
    instructionEnd: "2032-06-04",
    finalsMonday: "2032-06-07",
    holidays: ["2032-05-31"],
  },
  // .../calendars/2032.html
  fa32: {
    instructionStart: "2032-09-23",
    instructionEnd: "2032-12-03",
    finalsMonday: "2032-12-06",
    holidays: ["2032-11-11", "2032-11-25", "2032-11-26"],
  },
  wi33: {
    instructionStart: "2033-01-03",
    instructionEnd: "2033-03-11",
    finalsMonday: "2033-03-14",
    holidays: ["2033-01-17", "2033-02-21"],
  },
  sp33: {
    instructionStart: "2033-03-28",
    instructionEnd: "2033-06-03",
    finalsMonday: "2033-06-06",
    holidays: ["2033-05-30"],
  },
  // .../calendars/2033.html
  fa33: {
    instructionStart: "2033-09-22",
    instructionEnd: "2033-12-02",
    finalsMonday: "2033-12-05",
    holidays: ["2033-11-11", "2033-11-24", "2033-11-25"],
  },
  wi34: {
    instructionStart: "2034-01-09",
    instructionEnd: "2034-03-17",
    finalsMonday: "2034-03-20",
    holidays: ["2034-01-16", "2034-02-20"],
  },
  sp34: {
    instructionStart: "2034-04-03",
    instructionEnd: "2034-06-09",
    finalsMonday: "2034-06-12",
    holidays: ["2034-05-29"],
  },
};

// ISO date (YYYY-MM-DD) offset in UTC so it can't drift with the browser's
// local timezone. Lexicographic string compare already orders ISO dates
// correctly, so only the offset needs real Date math.
const addDaysISO = (iso: string, n: number): string =>
  new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86400000)
    .toISOString()
    .slice(0, 10);

// The browser's local calendar date -- "today" as the user sees it.
function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Selects which term an export anchors on from today's date rather than the
// backend's served term: whichever term is currently in session (first day of
// instruction through the Friday of finals week), or -- during a break, or
// before the table's first term -- the next term to begin, since a planner is
// used to schedule the term ahead. Returns undefined once today is past the
// last listed term, so buildICS() falls back to its generic 10-week span.
export function currentTermDates(today: string = todayISO()): TermDates | undefined {
  const terms = Object.values(TERM_DATES).sort((a, b) =>
    a.instructionStart.localeCompare(b.instructionStart),
  );
  const inSession = terms.find(
    t => today >= t.instructionStart && today <= addDaysISO(t.finalsMonday, 4),
  );
  return inSession ?? terms.find(t => t.instructionStart > today);
}

// Finals-week ISO dates when no current term applies -- the fixed June-2025
// reference week the planner grid used before term dates drove the finals view.
const FINALS_FALLBACK = [
  "2025-06-09", "2025-06-10", "2025-06-11",
  "2025-06-12", "2025-06-13", "2025-06-14",
];

// ISO dates for finals week, indexed by FinalInfo.colIdx (0 = Monday of finals
// week ... 5 = Saturday), derived from the current term's finalsMonday. Falls
// back to the fixed reference week once today is past the last listed term.
export function finalsWeekISO(today: string = todayISO()): string[] {
  const cal = currentTermDates(today);
  if (!cal) return FINALS_FALLBACK;
  return Array.from({ length: 6 }, (_, i) => addDaysISO(cal.finalsMonday, i));
}
