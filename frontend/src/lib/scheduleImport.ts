import type { Course, PlannedItem, Section } from "../types";
import { fetchCourseDetail, fetchCourses } from "./api";

export interface ImportPair {
  code: string;        // reconstructed pretty code, e.g. "COGS-118D"
  sectionCode: string; // parenthesized section id, e.g. "P-001-001"
}

// A "My Courses" row prints "SUBJ-NUM (X-000-000)", e.g.
// "COGS-118D (P-001-001)". Subject + number + a parenthesized section code.
const MY_COURSES_RE = /\b([A-Z]{2,4})-?\s*(\d{1,3}[A-Z]{0,2})\s*\(\s*([A-Z]-\d{3}-\d{3})\s*\)/g;


const CODE_RE = /^([A-Z]+)[\s-]*0*([0-9].*)$/;
export function normalizeCode(code: string): string {
  const upper = code.toUpperCase().trim();
  const m = CODE_RE.exec(upper);
  if (!m) return upper.replace(/[-\s]/g, "");
  return m[1] + m[2];
}

export function parseMyCoursesText(text: string): ImportPair[] {
  const seen = new Set<string>();
  const pairs: ImportPair[] = [];
  for (const m of text.matchAll(MY_COURSES_RE)) {
    const code = `${m[1].toUpperCase()}-${m[2].toUpperCase()}`;
    const sectionCode = m[3].toUpperCase();
    const key = `${code} ${sectionCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ code, sectionCode });
  }
  return pairs;
}

export type MissReason = "course-not-offered" | "section-not-found";

export interface ResolvedImport {
  matched: PlannedItem[];
  misses: { code: string; sectionCode: string; reason: MissReason }[];
}

// Injectable for tests; defaults to the real API client.
interface ResolveDeps {
  fetchCoursesByDept: (dept: string) => Promise<Course[]>;
  fetchDetail: (moduleId: string) => Promise<{ sections: Section[] }>;
}

const defaultDeps: ResolveDeps = {
  fetchCoursesByDept: dept => fetchCourses({ dept, offered: true }),
  fetchDetail: moduleId => fetchCourseDetail(moduleId),
};

// Resolves parsed pairs into planner-ready items. Fetches offered courses once
// per subject (normalized-code exact match, since the backend's substring
// search would both miss hyphenated codes and over-match "COGS 1" inside
// "COGS 118D"), then pulls each course's sections and matches by section code.
export async function resolveScheduleImport(
  pairs: ImportPair[],
  deps: ResolveDeps = defaultDeps,
): Promise<ResolvedImport> {
  const matched: PlannedItem[] = [];
  const misses: ResolvedImport["misses"] = [];

  // normalized code -> Course, per subject, fetched at most once.
  const subjectIndex = new Map<string, Map<string, Course>>();
  // module_id -> its sections, fetched at most once.
  const detailCache = new Map<string, Section[]>();

  async function indexForSubject(subject: string): Promise<Map<string, Course>> {
    const cached = subjectIndex.get(subject);
    if (cached) return cached;
    const index = new Map<string, Course>();
    try {
      for (const course of await deps.fetchCoursesByDept(subject)) {
        index.set(normalizeCode(course.code), course);
      }
    } catch {
      // Leave the index empty -- every pair in this subject becomes a miss.
    }
    subjectIndex.set(subject, index);
    return index;
  }

  for (const pair of pairs) {
    const subject = pair.code.split("-")[0];
    const index = await indexForSubject(subject);
    const course = index.get(normalizeCode(pair.code));
    if (!course?.moduleId) {
      misses.push({ ...pair, reason: "course-not-offered" });
      continue;
    }

    let sections = detailCache.get(course.moduleId);
    if (!sections) {
      try {
        sections = (await deps.fetchDetail(course.moduleId)).sections;
      } catch {
        sections = [];
      }
      detailCache.set(course.moduleId, sections);
    }

    const section = sections.find(s => s.id.toUpperCase() === pair.sectionCode);
    if (!section) {
      misses.push({ ...pair, reason: "section-not-found" });
      continue;
    }
    matched.push({ course, section });
  }

  return { matched, misses };
}
