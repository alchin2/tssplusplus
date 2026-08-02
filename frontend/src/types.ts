export type MainView = "home" | "search" | "planner" | "overview" | "map";
export type DayCode = "M" | "Tu" | "W" | "Th" | "F";

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
  rawPrereq: string | null;
  sections: Section[];
}

export interface PlannedItem {
  course: Course;
  section: Section;
}
