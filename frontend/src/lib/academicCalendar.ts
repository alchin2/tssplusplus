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
  // Fall 2026 -- blink.ucsd.edu/instructors/resources/academic/calendars/2026.html
  fa26: {
    instructionStart: "2026-09-24",
    instructionEnd: "2026-12-04",
    finalsMonday: "2026-12-07",
    holidays: ["2026-11-11", "2026-11-26", "2026-11-27"],
  },
};
