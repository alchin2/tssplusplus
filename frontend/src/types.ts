export type MainView = "home" | "search" | "planner" | "overview" | "map";
export type DayCode = "M" | "Tu" | "W" | "Th" | "F";

export interface Meeting {
  type: "LE" | "DI" | "LA";
  days: DayCode[];
  start: number;
  end: number;
  room: string;
}

export interface Section {
  id: string;
  instructor: string;
  meetings: Meeting[];
  enrolled: number;
  capacity: number;
  waitlist: number;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  units: number;
  dept: string;
  description: string;
  offeredThisQuarter: boolean;
  sections: Section[];
  color: string;
}

export interface PlannedItem {
  course: Course;
  section: Section;
}
