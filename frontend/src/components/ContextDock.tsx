import { BookOpen, LayoutGrid, Map as MapIcon, MousePointerClick } from "lucide-react";
import { CourseDetailPanel } from "./CourseDetailPanel";
import { OverviewView } from "./OverviewView";
import { MapView } from "./MapView";
import type { Course, PlannedItem, Section } from "../types";

export type DockTab = "detail" | "overview" | "map";

// The right-hand context dock: a segmented Detail / Overview / Map switcher
// that renders the existing views in place of the old tab navigation. The
// calendar canvas stays put to its left; nothing here navigates away from it.
export function ContextDock({ tab, onTab, selectedCourse, plannedItems, onAdd, onRemove, onClearSelection }: {
  tab: DockTab;
  onTab: (t: DockTab) => void;
  selectedCourse: Course | null;
  plannedItems: PlannedItem[];
  onAdd: (c: Course, s: Section) => void;
  onRemove: (courseId: string) => void;
  onClearSelection: () => void;
}) {
  const tabs: { id: DockTab; label: string; icon: typeof BookOpen }[] = [
    { id: "detail",   label: "Detail",   icon: BookOpen   },
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "map",      label: "Map",      icon: MapIcon    },
  ];

  return (
    <div className="h-full flex flex-col" style={{ borderLeft: "2px solid #6261c0", backgroundColor: "#f5f5fa" }}>
      {/* Segmented control */}
      <div className="flex-shrink-0 flex" style={{ backgroundColor: "#ececfa", borderBottom: "1px solid #c0c0c0" }}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => onTab(id)} aria-pressed={active}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-colors"
              style={{
                color: active ? "#0b4a67" : "#6b7280",
                borderBottom: active ? "2px solid #d56a03" : "2px solid transparent",
                backgroundColor: active ? "#fff" : "transparent",
              }}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto app-scroll">
        {tab === "detail" && (
          selectedCourse
            ? <CourseDetailPanel course={selectedCourse} plannedItems={plannedItems} onAdd={onAdd} onClose={onClearSelection} />
            : <DetailEmpty />
        )}
        {tab === "overview" && <OverviewView items={plannedItems} onRemove={onRemove} />}
        {tab === "map" && <MapView items={plannedItems} />}
      </div>
    </div>
  );
}

function DetailEmpty() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center text-gray-400">
      <MousePointerClick className="w-9 h-9 opacity-30" />
      <p className="text-sm font-bold" style={{ color: "#0b4a67" }}>No course selected</p>
      <p className="text-xs leading-relaxed">
        Press <b>⌘K</b> to search the catalog, or click a class on the calendar to open its details here.
      </p>
    </div>
  );
}
