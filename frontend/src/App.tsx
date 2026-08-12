import { useEffect, useMemo, useState } from "react";
import { Calendar, Github, LayoutGrid, Map as MapIcon, Search } from "lucide-react";
import { Toaster, toast } from "sonner";
import { RaccoonLogo } from "./components/RaccoonLogo";
import { CommandPalette } from "./components/CommandPalette";
import { ContextDock, type DockTab } from "./components/ContextDock";
import { PlannerView } from "./components/PlannerView";
import { usePlannedItems } from "./hooks/usePlannedItems";
import { fetchCourses } from "./lib/api";
import { conflictsWith } from "./lib/schedule";
import type { Course, Section } from "./types";

// Mobile shows one zone at a time; desktop shows both side by side.
type MobileZone = "calendar" | "dock";

export default function App() {
  const [query, setQuery]             = useState("");
  const [deptFilter, setDept]         = useState("ALL");
  const [offeredFilter, setOff]       = useState(false);
  const [divFilter, setDiv]           = useState<"all" | "lower" | "upper">("all");
  const [selectedCourse, setSelected] = useState<Course | null>(null);
  const [plannedItems, updatePlanned] = usePlannedItems();

  const [courses, setCourses]         = useState<Course[]>([]);
  const [searchLoading, setLoading]   = useState(true);
  const [searchError, setError]       = useState<string | null>(null);

  // Workbench UI state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dockTab, setDockTab]         = useState<DockTab>("detail");
  const [mobileZone, setMobileZone]   = useState<MobileZone>("calendar");

  // Server-side search/filter per the /api/courses contract, debounced so
  // typing doesn't fire a request per keystroke. State stays lifted here and
  // feeds the CommandPalette; results survive the palette closing/reopening.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const timer = setTimeout(() => {
      fetchCourses({ dept: deptFilter, offered: offeredFilter, q: query })
        .then(result => { if (alive) { setCourses(result); setError(null); } })
        .catch(err => { if (alive) { setCourses([]); setError(err instanceof Error ? err.message : "Request failed"); } })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, deptFilter, offeredFilter]);

  // Lower/upper division stays client-side -- the backend doesn't model it.
  const filtered = useMemo(() => courses.filter(c => {
    if (divFilter === "all") return true;
    const num = parseInt(c.code.split(" ")[1]);
    if (Number.isNaN(num)) return true;
    return divFilter === "lower" ? num < 100 : num >= 100;
  }), [courses, divFilter]);

  // ⌘K / Ctrl-K toggles the command palette; Escape closes it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(o => !o);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openCourse(course: Course) {
    setSelected(course);
    setDockTab("detail");
    setMobileZone("dock");
    setPaletteOpen(false);
  }

  // Calendar events carry a courseId; resolve it to the planned Course.
  function selectByCourseId(courseId: string) {
    const item = plannedItems.find(i => i.course.id === courseId);
    if (item) openCourse(item.course);
  }

  function handleAdd(course: Course, section: Section) {
    if (plannedItems.some(i => i.course.id === course.id)) { toast.error(`${course.code} already in planner`); return; }
    const conflict = conflictsWith(section, plannedItems);
    updatePlanned(prev => [...prev, { course, section }]);
    if (conflict) toast.warning(`Added ${course.code} – ${section.id} — time conflict with an existing course`);
    else toast.success(`Added ${course.code} – ${section.id}`);
  }

  function handleRemove(courseId: string) {
    updatePlanned(prev => prev.filter(i => i.course.id !== courseId));
  }

  return (
    <div className="h-dvh flex flex-col app-shell" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "1rem", backgroundColor: "#dde1ec" }}>
      <Toaster position="top-right" richColors />

      {/* ── Top bar ── */}
      <nav className="flex-shrink-0 h-10 flex items-center gap-2 px-2 z-10" style={{ backgroundColor: "#0b4a67" }}>
        <div className="flex items-center gap-2 pr-2">
          <span style={{ display: "flex", flexShrink: 0, transform: "rotate(-4deg)", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }}>
            <RaccoonLogo width={32} />
          </span>
          <span className="font-bold text-white text-sm tracking-tight">TSS<span style={{ color: "#f5c842" }}>++</span></span>
        </div>

        {/* ⌘K search trigger */}
        <button onClick={() => setPaletteOpen(true)}
          className="flex-1 max-w-md flex items-center gap-2 px-2.5 py-1 text-white/70 hover:text-white transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)" }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs">Search courses…</span>
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5" style={{ backgroundColor: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.25)" }}>⌘K</span>
        </button>

        <div className="ml-auto flex items-center gap-1">
          {plannedItems.length > 0 && (
            <button onClick={() => { setDockTab("overview"); setMobileZone("dock"); }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-white text-[0.769rem] font-bold"
              style={{ backgroundColor: "#d56a03", border: "1px solid #c86000" }}>
              <Calendar className="w-3 h-3" />
              {plannedItems.length} course{plannedItems.length !== 1 ? "s" : ""}
            </button>
          )}
          <a href="https://github.com/alchin2/tssplusplus" target="_blank" rel="noopener noreferrer"
            className="p-1.5 text-white/70 hover:text-white transition-colors">
            <Github className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      <div style={{ height: 3, backgroundColor: "#6261c0", flexShrink: 0 }} />

      {/* ── Two zones: calendar canvas + context dock ── */}
      <main className="flex-1 flex overflow-hidden" style={{ backgroundColor: "#fff" }}>
        {/* Calendar canvas */}
        <div className={`${mobileZone === "calendar" ? "flex" : "hidden"} md:flex flex-1 min-w-0 flex-col pb-16 md:pb-0`}>
          <PlannerView items={plannedItems} onRemove={handleRemove} onBrowse={() => setPaletteOpen(true)} onSelectCourse={selectByCourseId} />
        </div>

        {/* Context dock */}
        <div className={`${mobileZone === "dock" ? "flex" : "hidden"} md:flex w-full md:w-[440px] flex-shrink-0 flex-col pb-16 md:pb-0`}>
          <ContextDock
            tab={dockTab} onTab={setDockTab}
            selectedCourse={selectedCourse}
            plannedItems={plannedItems}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onClearSelection={() => setSelected(null)}
          />
        </div>
      </main>

      {/* ── Mobile bottom nav (zone switcher) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 flex border-t border-[#c0c0c0] z-40"
        style={{ backgroundColor: "#0b4a67", paddingBottom: "var(--safe-area-bottom)" }}>
        <button onClick={() => setPaletteOpen(true)}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[0.769rem] font-bold text-white/70">
          <Search className="w-4 h-4" /> Search
        </button>
        <button onClick={() => setMobileZone("calendar")}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[0.769rem] font-bold transition-colors"
          style={{ color: mobileZone === "calendar" ? "#f5c842" : "rgba(255,255,255,0.7)" }}>
          <Calendar className="w-4 h-4" /> Calendar
        </button>
        <button onClick={() => setMobileZone("dock")}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[0.769rem] font-bold transition-colors"
          style={{ color: mobileZone === "dock" ? "#f5c842" : "rgba(255,255,255,0.7)" }}>
          {dockTab === "map" ? <MapIcon className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />} Dock
        </button>
      </nav>

      {/* ── ⌘K command palette ── */}
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          query={query} onQuery={setQuery}
          deptFilter={deptFilter} onDeptFilter={setDept}
          offeredFilter={offeredFilter} onOfferedFilter={setOff}
          divFilter={divFilter} onDivFilter={setDiv}
          courses={filtered}
          loading={searchLoading}
          error={searchError}
          selectedCourseId={selectedCourse?.id ?? null}
          onOpenCourse={openCourse}
        />
      )}
    </div>
  );
}
