// Parses the plain text of a UCSD academic-history PDF (as produced by
// pdfExtract.ts) into completed / in-progress / planned course-code sets,
// ported from ClassGraph's src/utils/transcriptParse.js
// (https://github.com/nehalc200/classgraph). The heuristics are line-oriented
// and UCSD-transcript-specific: term markers ("Fall Qtr"), a transfer-courses
// block whose UCSD equivalents follow an "LD" marker, and grade tokens that
// distinguish completed (a real grade) from in-progress ("IP"/blank) from
// no-credit (F/W/NP/U). Codes come back normalized as "SUBJ NUM" (e.g.
// "CSE 12"), matching the catalog's pretty codes used elsewhere in the app.
import type { TranscriptRecord } from "../types";

// The newest term a transcript can list -- the "planned" section is the block
// between the first two term markers, and only counts when the first marker is
// this term (i.e. the upcoming, not-yet-graded quarter). Bump each quarter.
const NEWEST_QUARTER = "Fall Qtr";

function normalizeCourse(subject: string, number: string): string {
  const subj = (subject || "").toUpperCase().trim();
  const num = (number || "").toUpperCase().trim();
  return `${subj} ${num}`.replace(/\s+/g, " ").trim();
}

// Grade tokens implying an outcome. Real grades => completed; IP/blank =>
// in-progress; NP/W/F/U => no credit (see the branches below).
const gradeTokenRe = /\b(A\+|A|A-|B\+|B|B-|C\+|C|C-|D\+|D|D-|F|P|NP|S|U|W|IP)\b/;

const UCSD_SUBJECTS = new Set([
  "AAPI", "AIP", "ANTH", "ASTR", "AWP", "BENG", "BIOM", "CAT", "CCE", "CCS", "CGS", "CHEM", "CHIN", "CLAS", "CLIN", "CLRE", "COGS", "COMM", "CONT", "CSE", "CSS",
  "DOC", "DSC", "DSGN", "ECE", "ECON", "EDS", "ENG", "ENVR", "ERC", "ESYS", "ETHN", "FMPH", "GLBH", "GSS", "HDS", "HILD", "HMNR", "HUM", "INTL", "JAPN", "JWSP",
  "LATI", "LAWS", "LHCO", "LIT", "MAE", "MATH", "MATS", "MBC", "MCWP", "MGT", "MMW", "MSED", "MUS", "NANO", "NEU", "PH", "PHIL", "PHYS", "POLI", "PSYC", "RELI",
  "REV", "SE", "SEV", "SIO", "SXTH", "SYN", "TMC", "USP", "VIS", "WARR",
]);

const UCSD_SUBJECTS_PATTERN = [...UCSD_SUBJECTS].join("|");
// Global (used with matchAll / repeated exec): a subject followed by a course
// number like 12, 20D, 100A.
const courseTokenRe = new RegExp(`\\b(${UCSD_SUBJECTS_PATTERN})\\s*(\\d{1,3}[A-Z]{0,2})\\b`, "g");

// Tokens that share the SUBJ shape but are grade/summary words, not courses.
const bannedSubjects = new Set([
  "NP", "W", "F", "P", "S", "U", "IP",
  "GPA", "TERM", "TOTAL", "UNITS", "POINTS", "GRADE", "REPEAT",
]);

// Term markers delimit each quarter's course block.
const termMarkerRe = /\b(Fall|Winter|Spring)\s+Qtr\b|\bSum\s+Ses\s+(I|II)\b/gi;

// Planned courses are the block between the first two term markers, but only
// when the first marker is the newest (upcoming) quarter -- otherwise the first
// block is already-graded history, not a plan.
function extractPlannedCourses(text: string): Set<string> {
  const planned = new Set<string>();

  const markers = [...text.matchAll(termMarkerRe)];
  if (markers.length < 2) return planned;

  const firstMarkerText = markers[0][0].trim();
  if (firstMarkerText.toLowerCase() !== NEWEST_QUARTER.toLowerCase()) return planned;

  const firstMarkerEnd = markers[0].index! + markers[0][0].length;
  const secondMarkerStart = markers[1].index!;
  const plannedSection = text.slice(firstMarkerEnd, secondMarkerStart);

  for (const m of plannedSection.matchAll(courseTokenRe)) {
    const subj = m[1].toUpperCase().trim();
    const num = m[2].toUpperCase().trim();
    if (bannedSubjects.has(subj)) continue;
    planned.add(normalizeCourse(subj, num));
  }

  return planned;
}

export function parseAcademicHistoryText(text: string): TranscriptRecord {
  const completed = new Set<string>();
  const inProgress = new Set<string>();
  const planned = extractPlannedCourses(text);

  const lines = text
    .split(/\r?\n/)
    .map(l => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  let inTransferBlock = false;
  // A course seen on a line with no grade yet; a following grade-only line
  // completes it (transcripts wrap a course and its grade across two rows).
  let pendingCourse: string | null = null;
  let pendingSecondEquivalent = false;

  for (const line of lines) {
    // Transfer-block boundaries (heuristic).
    if (/Transfer Courses/i.test(line)) inTransferBlock = true;
    if (/UCSD Undergraduate Courses by Term/i.test(line)) {
      pendingSecondEquivalent = false;
      inTransferBlock = false;
    }

    if (inTransferBlock) {
      if (/\bLD\b/.test(line)) {
        // The UCSD equivalent for a transfer course follows the "LD" marker.
        const afterLD = line.split(/\bLD\b/)[1];
        courseTokenRe.lastIndex = 0;
        const m = courseTokenRe.exec(afterLD);
        if (m) completed.add(normalizeCourse(m[1], m[2]));
        pendingSecondEquivalent = true; // the next line may hold a second equivalent
        continue;
      }

      if (pendingSecondEquivalent) {
        pendingSecondEquivalent = false;
        const matches = [...line.matchAll(courseTokenRe)];
        if (matches.length > 0) {
          const last = matches[matches.length - 1];
          completed.add(normalizeCourse(last[1], last[2]));
        }
        continue;
      }
    }

    const matches = [...line.matchAll(courseTokenRe)];
    const candidates = matches
      .map(m => normalizeCourse(m[1], m[2]))
      .filter(c => !bannedSubjects.has(c.split(" ")[0]));

    const grade = line.match(gradeTokenRe)?.[1] ?? null;

    // Grade-only line following a course line: resolve the pending course.
    if (candidates.length === 0 && grade && pendingCourse) {
      if (grade === "NP" || grade === "U" || grade === "F" || grade === "W") {
        // no credit
      } else if (grade === "IP") {
        inProgress.add(pendingCourse);
      } else {
        completed.add(pendingCourse);
      }
      pendingCourse = null;
      continue;
    }

    if (candidates.length === 0) continue;

    if (inTransferBlock) {
      for (const course of extractTransferEquivalents(line)) completed.add(course);
      continue;
    }

    // UCSD term course. A grade on the same line resolves it immediately;
    // otherwise it's tentatively in-progress and may be completed by a
    // following grade-only line.
    if (grade) {
      if (grade === "NP" || grade === "U" || grade === "F" || grade === "W") {
        // no credit
      } else if (grade === "IP") {
        inProgress.add(candidates[0]);
      } else {
        completed.add(candidates[0]);
      }
      pendingCourse = null;
    } else {
      pendingCourse = candidates[0];
      inProgress.add(candidates[0]);
    }
  }

  // Completed wins over a tentative in-progress mark; planned is its own state.
  for (const c of completed) inProgress.delete(c);
  for (const c of planned) inProgress.delete(c);

  return { completed, inProgress, planned };
}

// UCSD equivalents in a transfer row follow "LD" markers; within one chunk they
// run until the next non-UCSD subject (the following transfer row's course).
function extractTransferEquivalents(text: string): Set<string> {
  const equivalents = new Set<string>();
  const chunks = text.split(/\bLD\b/);

  for (let i = 1; i < chunks.length; i++) {
    for (const m of chunks[i].matchAll(courseTokenRe)) {
      const subj = m[1].toUpperCase().trim();
      if (!UCSD_SUBJECTS.has(subj)) break;
      equivalents.add(normalizeCourse(subj, m[2]));
    }
  }

  return equivalents;
}
