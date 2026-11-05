import { useState } from "react";
import { toast } from "sonner";
import { useTerm } from "../hooks/useTerm";
import { downloadICS } from "../lib/ics";
import { finalsRangeLabel } from "../lib/schedule";
import { MapView } from "./MapView";
import { PlannerView } from "./PlannerView";
import { ScheduleList } from "./ScheduleList";
import type { PlannedItem } from "../types";

export type ScheduleTab = "list" | "calendar" | "finals" | "map";

const TABS: { id: ScheduleTab; label: string }[] = [
  { id: "list",     label: "List"     },
  { id: "calendar", label: "Calendar" },
  { id: "finals",   label: "Finals"   },
  { id: "map",      label: "Map"      },
];

// WebReg's "My Schedule" block: a navy tab bar with white tabs (the active
// one in orange), Print and Export on the right, and the chosen view inside
// a bordered panel.
export function ScheduleTabs({ tab, onTab, items, conflictIds, selectedCourseId, onRemove, onSelectCourse }: {
  tab: ScheduleTab;
  onTab: (t: ScheduleTab) => void;
  items: PlannedItem[];
  conflictIds: Set<string>;
  selectedCourseId: string | null;
  onRemove: (courseId: string) => void;
  onSelectCourse: (courseId: string) => void;
}) {
  const empty = items.length === 0;
  const term = useTerm();
  // Keep the map mounted once visited so Leaflet doesn't re-tile on each tab.
  const [mapVisited, setMapVisited] = useState(tab === "map");
  function select(t: ScheduleTab) {
    if (t === "map") setMapVisited(true);
    onTab(t);
  }

  function exportIcs() {
    downloadICS(items, term);
    toast.success("Schedule exported. Look for tss-schedule.ics in your downloads.");
  }

  return (
    <section aria-label="My schedule" id="my-schedule">
      <div className="flex items-end justify-between gap-3 mb-1.5">
        <h2 className="wr-label" style={{ fontSize: "1rem" }}>My Schedule</h2>
        <span className="wr-help">
          {empty ? "Nothing planned yet." : `${items.length} class${items.length !== 1 ? "es" : ""} planned`}
          {tab === "finals" && ` · Finals week ${finalsRangeLabel(term)}`}
        </span>
      </div>

      <div className="wr-tabbar" role="tablist" aria-label="Schedule views">
        <div className="wr-tabs">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab" className="wr-tab"
              id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
              onClick={() => select(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="wr-tabbar-right print:hidden">
          <button type="button" className="wr-linkbtn" onClick={() => window.print()} disabled={empty} title="Print this view">
            Print Schedule
          </button>
          <button type="button" className="wr-linkbtn" onClick={exportIcs} disabled={empty} title="Download an .ics file for your calendar app">
            Export .ics
          </button>
        </div>
      </div>

      <div className="wr-tabpanel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "list" && (
          <ScheduleList items={items} conflictIds={conflictIds} selectedCourseId={selectedCourseId}
            onRemove={onRemove} onSelectCourse={onSelectCourse} />
        )}
        {tab === "calendar" && (
          <PlannerView mode="week" items={items} onSelectCourse={onSelectCourse} />
        )}
        {tab === "finals" && (
          <PlannerView mode="finals" items={items} onSelectCourse={onSelectCourse} />
        )}
        {mapVisited && (
          <div style={{ display: tab === "map" ? "block" : "none", height: "40rem" }}>
            <MapView items={items} />
          </div>
        )}
        {(tab === "calendar" || tab === "finals") && empty && (
          <p className="wr-help px-3 py-2" style={{ borderTop: "1px solid var(--wr-rule-soft)" }}>
            Planned classes appear here as blocks; click one to open its drawer. Conflicting blocks get a red outline.
          </p>
        )}
      </div>
    </section>
  );
}
