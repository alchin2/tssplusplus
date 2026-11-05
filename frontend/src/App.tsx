import { useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { ConflictNotice } from "./components/ConflictNotice";
import { ScheduleImportButton } from "./components/ScheduleImportButton";
import { ScheduleTabs, type ScheduleTab } from "./components/ScheduleTabs";
import { SearchPanel, type Div } from "./components/SearchPanel";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { usePlannedItems } from "./hooks/usePlannedItems";
import { termLabel, termName, useMeta } from "./hooks/useMeta";
import { TermContext, useSelectedTerm } from "./hooks/useTerm";
import { fetchCourses } from "./lib/api";
import { downloadICS } from "./lib/ics";
import { conflictPairs, conflictsWith } from "./lib/schedule";
import { conflictingCourseIds } from "./lib/plannerEvents";
import type { Course, Section, TranscriptRecord } from "./types";

const EMPTY_TRANSCRIPT: TranscriptRecord = { completed: new Set(), inProgress: new Set(), planned: new Set() };

export default function App() {
  const meta = useMeta();
  const [term, setTerm] = useSelectedTerm(meta);
  const termTag = termLabel(term);
  const termTitle = termName(term);
  const depts = useMemo(() => ["ALL", ...(meta?.depts ?? [])], [meta]);

  // Search state. The debounced fetch lives here; SearchPanel renders it.
  const [query, setQuery]             = useState("");
  const [deptFilter, setDept]         = useState("ALL");
  const [offeredFilter, setOff]       = useState(false);
  const [divFilter, setDiv]           = useState<Div>("all");
  const [courses, setCourses]         = useState<Course[]>([]);
  const [searchLoading, setLoading]   = useState(true);
  const [searchError, setError]       = useState<string | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  // A course opened from the schedule (List row or calendar block) is pinned
  // above the results so it is visible even when the search doesn't list it.
  const [pinned, setPinned]           = useState<Course | null>(null);
  const [scrollToken, setScrollToken] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const [plannedItems, updatePlanned] = usePlannedItems(term);
  const [tab, setTab]                 = useState<ScheduleTab>("list");

  // Uploaded academic history -- completed/in-progress courses tint every
  // prerequisite graph. Kept at app level so it persists across drawers.
  const [transcript, setTranscript] = useState<{
    fileName: string | null; loading: boolean; error: string | null; record: TranscriptRecord;
  }>({ fileName: null, loading: false, error: null, record: EMPTY_TRANSCRIPT });

  // Importing an enrolled schedule from a TSS "My Courses" PDF (replaces the
  // planner). Kept separate from the transcript upload above.
  const [scheduleImporting, setScheduleImporting] = useState(false);

  // Server-side search/filter per the /api/courses contract, debounced so
  // typing doesn't fire a request per keystroke. Waits for the term so the
  // first results aren't for the backend's default instead of the pick.
  useEffect(() => {
    if (!term) return;
    let alive = true;
    setLoading(true);
    const timer = setTimeout(() => {
      fetchCourses({ term, dept: deptFilter, offered: offeredFilter, q: query })
        .then(result => { if (alive) { setCourses(result); setError(null); } })
        .catch(err => { if (alive) { setCourses([]); setError(err instanceof Error ? err.message : "Request failed"); } })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [term, query, deptFilter, offeredFilter]);

  // Division stays client-side -- the backend doesn't model it.
  const filtered = useMemo(() => courses.filter(c => {
    if (divFilter === "all") return true;
    const num = parseInt(c.code.split(" ")[1]);
    if (Number.isNaN(num)) return true;
    if (divFilter === "lower") return num < 100;
    if (divFilter === "upper") return num >= 100 && num < 200;
    return num >= 200;
  }), [courses, divFilter]);

  // ⌘K / Ctrl-K jumps to the search box, as it always has.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const conflictIds = useMemo(() => conflictingCourseIds(plannedItems), [plannedItems]);
  const pairs = useMemo(() => conflictPairs(plannedItems), [plannedItems]);

  // Schedule rows and calendar blocks carry a courseId; open that course's
  // drawer above the schedule and scroll to it.
  function selectByCourseId(courseId: string) {
    const item = plannedItems.find(i => i.course.id === courseId);
    if (!item) return;
    setPinned(item.course);
    setExpandedId(item.course.id);
    setScrollToken(t => t + 1);
  }

  // An open or pinned drawer belongs to the old term's course list.
  function changeTerm(next: string) {
    setTerm(next);
    setPinned(null);
    setExpandedId(null);
  }

  function setSearchVisible(v: boolean) {
    setSearchActive(v);
    if (!v) { setPinned(null); setExpandedId(null); }
  }

  function handleAdd(course: Course, section: Section) {
    const existing = plannedItems.find(i => i.course.id === course.id);
    if (existing?.section.id === section.id) return; // already planned, nothing to do
    // Planning a section replaces any previously planned section of the same
    // course; conflict is checked against the other courses only.
    const others = plannedItems.filter(i => i.course.id !== course.id);
    const conflict = conflictsWith(section, others);
    updatePlanned(prev => [...prev.filter(i => i.course.id !== course.id), { course, section }]);
    if (existing) toast.success(`Changed ${course.code} to section ${section.id}.`);
    else if (conflict) toast.warning(`Planned ${course.code} section ${section.id}. It conflicts with another class on your schedule.`);
    else toast.success(`Planned ${course.code} section ${section.id}.`);
  }

  function handleRemove(courseId: string) {
    const item = plannedItems.find(i => i.course.id === courseId);
    updatePlanned(prev => prev.filter(i => i.course.id !== courseId));
    if (item) toast.success(`Removed ${item.course.code} from your schedule.`);
  }

  function exportIcs() {
    downloadICS(plannedItems, term);
    toast.success("Schedule exported. Look for tss-schedule.ics in your downloads.");
  }

  async function handleTranscriptFile(file: File) {
    setTranscript(t => ({ ...t, fileName: file.name, loading: true, error: null }));
    try {
      // Loaded on demand so pdf.js (~300 KB gzip) stays out of the initial bundle.
      const [{ extractTextFromPdf }, { parseAcademicHistoryText }] = await Promise.all([
        import("./lib/pdfExtract"),
        import("./lib/transcriptParse"),
      ]);
      const record = parseAcademicHistoryText(await extractTextFromPdf(file));
      setTranscript({ fileName: file.name, loading: false, error: null, record });
      const n = record.completed.size + record.inProgress.size + record.planned.size;
      if (n === 0) toast.warning("No UCSD courses were detected in that PDF.");
      else toast.success(`Detected ${record.completed.size} completed and ${record.inProgress.size} in-progress courses.`);
    } catch {
      setTranscript(t => ({ ...t, loading: false, error: "Could not read that PDF." }));
    }
  }

  function clearTranscript() {
    setTranscript({ fileName: null, loading: false, error: null, record: EMPTY_TRANSCRIPT });
  }

  // Import an enrolled schedule from a TSS "My Courses" PDF. The PDF only
  // supplies each course + section code; the real meeting times come from this
  // term's API (resolveScheduleImport). Importing *replaces* the planner -- but
  // only once at least one section actually resolves, so a stray/wrong PDF can't
  // silently wipe the user's schedule.
  async function handleScheduleImportFile(file: File) {
    setScheduleImporting(true);
    try {
      const [{ extractTextFromPdf }, { apiDeps, parseMyCoursesText, resolveScheduleImport }] = await Promise.all([
        import("./lib/pdfExtract"),
        import("./lib/scheduleImport"),
      ]);
      const pairsFound = parseMyCoursesText(await extractTextFromPdf(file));
      if (pairsFound.length === 0) {
        toast.warning("No courses were detected. Is this the TSS My Courses PDF?");
        return;
      }

      const { matched, misses } = await resolveScheduleImport(pairsFound, apiDeps(term));
      if (matched.length === 0) {
        toast.error(`None of those courses matched the ${termTitle} schedule.`);
        return;
      }

      updatePlanned(() => matched); // replace the planner
      const conflicts = conflictingCourseIds(matched).size;
      const parts = [`Imported ${matched.length} course${matched.length !== 1 ? "s" : ""} and replaced your planner.`];
      if (conflicts > 0) parts.push(`${conflicts} conflict${conflicts !== 1 ? "s" : ""} flagged.`);
      toast.success(parts.join(" "));
      if (misses.length > 0) {
        const label = misses.map(m => m.code).join(", ");
        toast.warning(`Could not match ${misses.length} course${misses.length !== 1 ? "s" : ""}: ${label}`);
      }
      setTab("list");
    } catch {
      toast.error("Could not read that PDF.");
    } finally {
      setScheduleImporting(false);
    }
  }

  const empty = plannedItems.length === 0;

  return (
    <TermContext.Provider value={term}>
    <div className="min-h-dvh flex flex-col">
      <Toaster position="bottom-right" richColors closeButton
        toastOptions={{ style: { borderRadius: 4, fontFamily: "inherit", fontSize: "0.923rem" } }} />

      <SiteHeader />

      <main className="wr-page flex-1 pt-5 pb-6">
        {/* ── Title row ── */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h1 className="wr-title">Course Enrollment</h1>
          <div className="wr-pipes print:hidden">
            <ScheduleImportButton onPick={handleScheduleImportFile} loading={scheduleImporting} />
            <button type="button" className="wr-linkbtn" onClick={exportIcs} disabled={empty}
              title={empty ? "Plan a class first" : "Download an .ics file for your calendar app"}>
              Export .ics
            </button>
            <label style={{ color: "var(--wr-text)" }}>
              <span className="font-normal" style={{ color: "var(--wr-muted)" }}>Term: </span>
              <select className="wr-select font-bold" style={{ height: "1.7rem", lineHeight: "1.7rem" }}
                value={term ?? ""} disabled={!meta} onChange={e => changeTerm(e.target.value)}>
                {meta
                  ? meta.terms.map(t => <option key={t} value={t}>{termName(t)}</option>)
                  : <option value="">{termTitle}</option>}
              </select>
            </label>
          </div>
        </div>

        {/* ── Search for Classes ── */}
        <div className="mt-5">
          <SearchPanel
            inputRef={searchRef}
            query={query} onQuery={setQuery}
            deptFilter={deptFilter} onDeptFilter={setDept}
            offeredFilter={offeredFilter} onOfferedFilter={setOff}
            divFilter={divFilter} onDivFilter={setDiv}
            depts={depts} termLabel={termTag} termName={termTitle}
            courses={filtered} loading={searchLoading} error={searchError}
            active={searchActive} onActive={setSearchVisible}
            expandedId={expandedId} onExpand={setExpandedId}
            pinned={pinned} scrollToken={scrollToken}
            plannedItems={plannedItems} onAdd={handleAdd} onRemove={handleRemove}
            transcript={transcript} onTranscriptFile={handleTranscriptFile} onTranscriptClear={clearTranscript}
          />
        </div>

        {/* ── Conflicts ── */}
        {pairs.length > 0 && (
          <div className="mt-5">
            <ConflictNotice pairs={pairs} />
          </div>
        )}

        {/* ── My Schedule ── */}
        <div className="mt-6">
          <ScheduleTabs tab={tab} onTab={setTab} items={plannedItems} conflictIds={conflictIds}
            selectedCourseId={pinned?.id ?? null} onRemove={handleRemove} onSelectCourse={selectByCourseId} />
        </div>
      </main>

      <SiteFooter />
    </div>
    </TermContext.Provider>
  );
}
