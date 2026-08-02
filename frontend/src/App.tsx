import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Calendar, Github, LayoutGrid, Map as MapIcon, Search, Settings } from "lucide-react";
import { Toaster, toast } from "sonner";
import { CourseDetailPanel } from "./components/CourseDetailPanel";
import { RaccoonLogo } from "./components/RaccoonLogo";
import { HomeView } from "./components/HomeView";
import { MapView } from "./components/MapView";
import { OverviewView } from "./components/OverviewView";
import { PlannerView } from "./components/PlannerView";
import { SearchView } from "./components/SearchView";
import { usePlannedItems } from "./hooks/usePlannedItems";
import { fetchCourses } from "./lib/api";
import { conflictsWith } from "./lib/schedule";
import type { Course, MainView, Section } from "./types";

export default function App() {
  const [mainView, setMainView]       = useState<MainView>("home");
  const [query, setQuery]             = useState("");
  const [deptFilter, setDept]         = useState("ALL");
  const [offeredFilter, setOff]       = useState(false);
  const [divFilter, setDiv]           = useState<"all" | "lower" | "upper">("all");
  const [selectedCourse, setSelected] = useState<Course | null>(null);
  const [plannedItems, updatePlanned] = usePlannedItems();

  const [courses, setCourses]         = useState<Course[]>([]);
  const [searchLoading, setLoading]   = useState(true);
  const [searchError, setError]       = useState<string | null>(null);

  // Server-side search/filter per the design doc's /api/courses contract,
  // debounced so typing doesn't fire a request per keystroke.
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

  function goSearch(q?: string) {
    if (q !== undefined) setQuery(q);
    setMainView("search");
    setSelected(null);
  }

  function openCourse(course: Course) {
    setSelected(prev => prev?.id === course.id ? null : course);
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

  const showPanel = selectedCourse !== null && mainView === "search";

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "1rem", backgroundColor: "#dde1ec" }}>
      <Toaster position="top-right" richColors />

      {/* Nav */}
      <nav className="flex-shrink-0 h-10 flex items-stretch z-10" style={{ backgroundColor: "#0b4a67" }}>
        <button
          onClick={() => { setMainView("home"); setSelected(null); }}
          className="flex items-center gap-2 px-4 border-r border-white/20 hover:bg-white/10 transition-colors">
          <span style={{ display: "flex", flexShrink: 0, transform: "rotate(-4deg)", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }}>
            <RaccoonLogo width={36} />
          </span>
          <span className="font-bold text-white text-sm tracking-tight">TSS<span style={{ color: "#f5c842" }}>++</span></span>
        </button>

        {([
          { id: "search"   as const, label: "Course Search"    },
          { id: "planner"  as const, label: "Schedule Planner" },
          { id: "overview" as const, label: "Overview"         },
          { id: "map"      as const, label: "Map"              },
        ] as const).map(({ id, label }) => {
          const active = mainView === id;
          return (
            <button key={id}
              onClick={() => { if (id === "search") goSearch(); else { setMainView(id); setSelected(null); } }}
              className="hidden md:block px-4 text-xs font-bold border-r border-white/20 transition-colors"
              style={{ backgroundColor: active ? "#d56a03" : "transparent", color: "#fff" }}
              onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.backgroundColor = "transparent"; }}>
              {label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-1 px-3">
          {plannedItems.length > 0 && (
            <button onClick={() => { setMainView("planner"); setSelected(null); }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-white text-[0.769rem] font-bold mr-1"
              style={{ backgroundColor: "#d56a03", border: "1px solid #c86000" }}>
              <Calendar className="w-3 h-3" />
              {plannedItems.length} course{plannedItems.length !== 1 ? "s" : ""}
            </button>
          )}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"
            className="p-1.5 text-white/70 hover:text-white transition-colors">
            <Github className="w-3.5 h-3.5" />
          </a>
          <button className="p-1.5 text-white/70 hover:text-white transition-colors">
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      <div style={{ height: 3, backgroundColor: "#6261c0", flexShrink: 0 }} />

      {/* Main */}
      <main className="flex-1 flex overflow-hidden" style={{ backgroundColor: "#fff" }}>

        {/* Content area — shrinks when panel is open */}
        {/* pb-16 keeps content clear of the fixed mobile bottom nav */}
        <div className="flex-1 min-w-0 overflow-auto transition-all duration-200 pb-16 md:pb-0">
          {mainView === "home" && <HomeView onSearch={goSearch} />}
          {mainView === "search" && (
            <SearchView
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
          {mainView === "planner" && (
            <PlannerView items={plannedItems} onRemove={handleRemove} />
          )}
          {mainView === "overview" && (
            <OverviewView items={plannedItems} />
          )}
          {mainView === "map" && (
            <MapView items={plannedItems} />
          )}
        </div>

        {/* Side detail panel */}
        <AnimatePresence>
          {showPanel && selectedCourse && (
            <motion.div
              key="detail-panel"
              initial={{ x: 520, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 520, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ width: 520, flexShrink: 0, borderLeft: "2px solid #6261c0" }}
              className="overflow-hidden shadow-xl"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCourse.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="h-full"
                >
                  <CourseDetailPanel
                    course={selectedCourse}
                    plannedItems={plannedItems}
                    onAdd={handleAdd}
                    onClose={() => setSelected(null)}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 flex border-t border-[#c0c0c0] z-50"
        style={{ backgroundColor: "#0b4a67" }}>
        {[
          { id: "home"     as const, label: "Home",     icon: BookOpen   },
          { id: "search"   as const, label: "Search",   icon: Search     },
          { id: "planner"  as const, label: "Planner",  icon: Calendar   },
          { id: "overview" as const, label: "Overview", icon: LayoutGrid },
          { id: "map"      as const, label: "Map",      icon: MapIcon    },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => id === "search" ? goSearch() : (setMainView(id), setSelected(null))}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[0.769rem] font-bold transition-colors"
            style={{ color: mainView === id ? "#f5c842" : "rgba(255,255,255,0.7)" }}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
