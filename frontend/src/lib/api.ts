// Typed client for the FastAPI backend (backend/app). DTO shapes mirror
// backend/app/schemas.py; mappers convert them into the frontend's
// Course/Section/Meeting types so the planner's conflict/finals logic
// keeps working unchanged.

import type { Course, CourseDetail, DayCode, Meeting, Section } from "../types";

const API_BASE = "/api";

// ─── DTOs (backend/app/schemas.py) ──────────────────────────────────────────

interface CourseSummaryDto {
  module_id: string | null;
  code: string;
  name: string;
  dept: string;
  offered_this_qtr: boolean;
}

interface MeetingDto {
  teaching_method: string | null;
  instructor_name: string | null;
  location: string | null;
  sched: string | null;
}

interface SectionDto {
  event_pkg_objid: string | null;
  section_code: string | null;
  section_label: string | null;
  limit: number | null;
  seats_available: number | null;
  num_on_waitlist: number | null;
  meetings: MeetingDto[];
}

interface CourseDetailDto extends CourseSummaryDto {
  description: string | null;
  module_id: string;
  raw_prereq: string | null;
  sections: SectionDto[];
}

export interface Meta {
  term: string;
  depts: string[];
  course_count: number;
  offered_count: number;
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch { /* non-JSON body */ }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export function fetchMeta(): Promise<Meta> {
  return getJson<Meta>("/meta");
}

export async function fetchCourses(params: { dept?: string; offered?: boolean; q?: string }): Promise<Course[]> {
  const search = new URLSearchParams();
  if (params.dept && params.dept !== "ALL") search.set("dept", params.dept);
  if (params.offered) search.set("offered", "true");
  if (params.q) search.set("q", params.q);
  const qs = search.toString();
  const dtos = await getJson<CourseSummaryDto[]>(`/courses${qs ? `?${qs}` : ""}`);
  return dtos.map(toCourse);
}

export async function fetchCourseDetail(moduleId: string): Promise<CourseDetail> {
  const dto = await getJson<CourseDetailDto>(`/courses/${encodeURIComponent(moduleId)}`);
  return {
    ...toCourse(dto),
    description: dto.description,
    rawPrereq: dto.raw_prereq,
    sections: dto.sections.map(toSection),
  };
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

// Deterministic per-course color for planner/map chips, same role as the
// old mock data's hand-picked hex values.
const COURSE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6"];

function colorFor(code: string): string {
  let hash = 0;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

function toCourse(dto: CourseSummaryDto): Course {
  return {
    id: dto.module_id ?? dto.code,
    moduleId: dto.module_id,
    code: dto.code,
    title: dto.name,
    dept: dto.dept,
    offeredThisQuarter: dto.offered_this_qtr,
    color: colorFor(dto.code),
  };
}

function toSection(dto: SectionDto): Section {
  const lecture = dto.meetings.find(m => m.teaching_method === "LE");
  const instructor = (lecture ?? dto.meetings.find(m => m.instructor_name))?.instructor_name ?? "STAFF";
  const enrolled =
    dto.limit !== null && dto.seats_available !== null ? Math.max(0, dto.limit - dto.seats_available) : null;
  return {
    id: dto.section_code ?? dto.event_pkg_objid ?? dto.section_label ?? "?",
    instructor,
    meetings: dto.meetings.map(toMeeting),
    enrolled,
    capacity: dto.limit,
    waitlist: dto.num_on_waitlist,
  };
}

function toMeeting(dto: MeetingDto): Meeting {
  const sched = parseSched(dto.sched);
  return {
    type: dto.teaching_method ?? "??",
    days: sched.days,
    start: sched.start,
    end: sched.end,
    room: sched.location ?? dto.location ?? "TBA",
  };
}

// ─── Sched-string parser ─────────────────────────────────────────────────────
// TS port of scrapers/tss_scraper/tools/events_parser.py for the meeting
// line, e.g. "M, W, F 08:00 AM - 08:50 AM In Person @ Peterson Hall Room 110".
// Times become decimal hours (8.833 = 8:50) to match lib/schedule.ts.

const DAY_TOKEN_RE = /Su|Tu|Th|Sa|M|W|F/g;
const TIME_RE = /\d{1,2}:\d{2}\s*[AP]M/;
const TAIL_RE = /(\d{1,2}:\d{2})\s*([AP]M)\s*-\s*(\d{1,2}:\d{2})\s*([AP]M)\s+[A-Za-z ]+?(?:\s*@\s*(.+))?$/;

function toDecimalHours(hhmm: string, ampm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  let hour = h % 12;
  if (ampm === "PM") hour += 12;
  return hour + m / 60;
}

interface ParsedSched {
  days: DayCode[];
  start: number;
  end: number;
  location: string | null;
}

export function parseSched(sched: string | null): ParsedSched {
  const empty: ParsedSched = { days: [], start: 0, end: 0, location: null };
  const firstLine = (sched ?? "").split("\n")[0].trim();
  if (!firstLine) return empty;

  const timeMatch = TIME_RE.exec(firstLine);
  if (!timeMatch) return empty;

  const tail = TAIL_RE.exec(firstLine.slice(timeMatch.index));
  if (!tail) return empty;

  const daysStr = firstLine.slice(0, timeMatch.index).replace(/[,\s]/g, "");
  const dayTokens: string[] = daysStr.match(DAY_TOKEN_RE) ?? [];
  // Sa/Su drop out here -- the planner grid and DayCode are Mon-Fri only.
  const days = dayTokens.filter((d): d is DayCode => ["M", "Tu", "W", "Th", "F"].includes(d));

  return {
    days,
    start: toDecimalHours(tail[1], tail[2]),
    end: toDecimalHours(tail[3], tail[4]),
    location: tail[5]?.trim() ?? null,
  };
}
