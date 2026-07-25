export const COURSE_INFO: Record<string, { title: string; units: number }> = {
  "CSE 100": { title: "Advanced Data Structures", units: 4 },
  "CSE 101": { title: "Algorithm Design", units: 4 },
  "CSE 110": { title: "Software Engineering", units: 4 },
  "CSE 120": { title: "Operating Systems", units: 4 },
  "CSE 130": { title: "Programming Languages", units: 4 },
  "CSE 12":  { title: "Basic Data Structures", units: 4 },
  "CSE 15L": { title: "Software Tools Lab", units: 2 },
  "CSE 11":  { title: "Intro to Programming", units: 4 },
  "CSE 8A":  { title: "Intro Programming A", units: 4 },
  "CSE 8B":  { title: "Intro Programming B", units: 4 },
  "CSE 21":  { title: "Math for Algorithms", units: 4 },
  "CSE 30":  { title: "Computer Organization", units: 4 },
  "MATH 20A":{ title: "Calculus I", units: 4 },
  "MATH 20B":{ title: "Calculus II", units: 4 },
  "MATH 20C":{ title: "Calculus III", units: 4 },
  "MATH 15A":{ title: "Combinatorics", units: 4 },
  "PHYS 2B": { title: "Physics: E&M", units: 4 },
  "COGS 9":  { title: "Intro to Data Science", units: 4 },
  "ECE 35":  { title: "Intro to Analog Design", units: 4 },
  "COGS 108":{ title: "Data Science in Practice", units: 4 },
};

export type Req = string | { or: string[] };

export const PREREQS: Record<string, Req[]> = {
  "CSE 100": ["CSE 12", "CSE 15L", "MATH 20C"],
  "CSE 101": ["CSE 100", { or: ["CSE 21", "MATH 15A"] }],
  "CSE 110": ["CSE 100"],
  "CSE 120": ["CSE 30", "CSE 100"],
  "CSE 130": ["CSE 30", "CSE 100"],
  "CSE 12":  [{ or: ["CSE 11", "CSE 8B"] }],
  "CSE 15L": [{ or: ["CSE 12", "CSE 11"] }],
  "CSE 30":  [{ or: ["CSE 11", "CSE 8B"] }],
  "MATH 20C":["MATH 20B"],
  "MATH 20B":["MATH 20A"],
  "ECE 35":  ["PHYS 2B", "MATH 20B"],
  "COGS 108":["COGS 9", { or: ["CSE 11", "CSE 8A"] }],
};

export const COMPLETED_COURSES = new Set(["CSE 11", "CSE 12", "CSE 15L", "CSE 30", "MATH 20A", "MATH 20B", "MATH 20C"]);
