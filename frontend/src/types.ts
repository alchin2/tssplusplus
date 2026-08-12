export type DayCode = "M" | "Tu" | "W" | "Th" | "F" | "Sa" | "Su";

export interface Meeting {
  // TSS teaching-method codes: LE/DI/LA plus others (SE, FI, ...).
  type: string;
  days: DayCode[];
  start: number;
  end: number;
  room: string;
}

export interface Section {
  id: string;
  instructor: string;
  meetings: Meeting[];
  enrolled: number | null;
  capacity: number | null;
  waitlist: number | null;
}

export interface Course {
  // module_id when offered this term, else the catalog code.
  id: string;
  // null for courses not offered this term -- no detail/sections exist.
  moduleId: string | null;
  code: string;
  title: string;
  dept: string;
  offeredThisQuarter: boolean;
  color: string;
}

export interface CourseDetail extends Course {
  // Narrower than Course.moduleId -- a CourseDetail can only be
  // fetched for a course that's offered this term (see fetchCourseDetail).
  moduleId: string;
  description: string | null;
  rawPrereq: string | null;
  sections: Section[];
}

export interface PlannedItem {
  course: Course;
  section: Section;
}

// Courses parsed out of an uploaded academic-history PDF (see
// lib/transcriptParse.ts). Codes are normalized "SUBJ NUM" strings (e.g.
// "CSE 12") so they match catalog codes used elsewhere; the sets are disjoint.
export interface TranscriptRecord {
  completed: Set<string>;
  inProgress: Set<string>;
  planned: Set<string>;
}

// GET /api/courses/{module_id}/prereqs -- resolved, fully transitive
// prerequisite tree. An OR group is a node with code "OR" whose
// children are the alternatives; every other node is a real course.
export interface PrereqNode {
  code: string;
  type: "ROOT" | "CHILD";
  title: string | null;
  children: PrereqNode[];
}
