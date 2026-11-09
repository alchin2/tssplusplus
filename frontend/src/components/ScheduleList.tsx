import { ExternalLink } from "lucide-react";
import { useBuildings } from "../hooks/useBuildings";
import { useTerm } from "../hooks/useTerm";
import { ScrollX } from "./ScrollX";
import { computeFinal, finalDateShort, fmtRange, splitRoom } from "../lib/schedule";
import type { PlannedItem } from "../types";

// WebReg's "List" tab: one bordered table, a row per meeting, a Final Exam
// row per course, status words in the Status column, Remove (and Book,
// when the section has a TSS link) in Action.
export function ScheduleList({ items, conflictIds, selectedCourseId, onRemove, onSelectCourse }: {
  items: PlannedItem[];
  conflictIds: Set<string>;
  selectedCourseId: string | null;
  onRemove: (courseId: string) => void;
  onSelectCourse: (courseId: string) => void;
}) {
  const buildings = useBuildings();
  const abbr = (building: string) => buildings[building]?.abbr ?? building;
  const term = useTerm();

  if (items.length === 0) {
    return (
      <div className="wr-empty">
        <p><b>No classes planned.</b></p>
        <p className="mt-1">Use <b>Search for Classes</b> above, open a course, and press <b>Plan</b> on a section.</p>
      </div>
    );
  }

  const totalHrs = items.reduce((s, { section }) =>
    s + section.meetings.reduce((ms, m) => ms + Math.max(0, m.end - m.start) * m.days.length, 0), 0);
  const buildingCount = new Set(items.flatMap(({ section }) =>
    section.meetings.map(m => splitRoom(m.room).building))).size;

  return (
    <div>
      <ScrollX>
        <table className="wr-table" style={{ minWidth: "64rem" }}>
          <thead>
            <tr>
              <th className="is-left">Subject Course</th>
              <th className="is-left">Title</th>
              <th>Section<br />Code</th>
              <th>Type</th>
              <th className="is-left">Instructor</th>
              <th>Days</th>
              <th>Time</th>
              <th>BLDG</th>
              <th>Room</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ course, section }, ci) => {
              const conflict = conflictIds.has(course.id);
              const selected = course.id === selectedCourseId;
              const rowClass = conflict ? "is-conflict" : selected ? "is-selected" : ci % 2 === 1 ? "is-stripe" : "";
              const fi = computeFinal(section);
              const lecRoom = section.meetings.find(m => m.type === "LE")?.room;
              const meetings = section.meetings.length > 0 ? section.meetings : null;
              const span = (meetings?.length ?? 1) + (fi ? 1 : 0);

              const first = (
                <>
                  <td className="is-left" rowSpan={span} style={{ verticalAlign: "top" }}>
                    <button type="button" className="wr-linkbtn" onClick={() => onSelectCourse(course.id)}
                      title={`Open ${course.code} in search results`}>
                      <span className="wr-code">{course.code}</span>
                    </button>
                  </td>
                  <td className="is-left" rowSpan={span} style={{ verticalAlign: "top" }}>{course.title}</td>
                </>
              );
              const tail = (
                <>
                  <td rowSpan={span} style={{ verticalAlign: "top" }}>
                    <span className={`wr-status ${conflict ? "is-conflict" : "is-planned"}`}>{conflict ? "Conflict" : "Planned"}</span>
                  </td>
                  <td rowSpan={span} style={{ verticalAlign: "top" }}>
                    <div className="wr-actions">
                      <button type="button" className="wr-btn is-sm" onClick={() => onRemove(course.id)} aria-label={`Remove ${course.code}`}>
                        Remove
                      </button>
                      {section.bookUrl && (
                        <a href={section.bookUrl} target="_blank" rel="noopener noreferrer" className="wr-btn is-sm"
                          title={`Book ${course.code} ${section.id} on TSS (opens in a new tab)`}>
                          Book <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </td>
                </>
              );

              const rows = (meetings ?? [null]).map((m, i) => {
                const loc = m ? splitRoom(m.room) : { building: "TBA", room: "" };
                const tba = !m || (m.days.length === 0 && m.start === m.end);
                return (
                  <tr key={`${course.id}-${i}`} className={`${rowClass} ${i === 0 ? "is-group-start" : ""}`}>
                    {i === 0 && first}
                    <td className="wr-code">{i === 0 ? section.id : ""}</td>
                    <td><span className={`wr-type is-${m?.type ?? "LE"}`}>{m?.type ?? "—"}</span></td>
                    <td className="is-left">{i === 0 ? section.instructor : ""}</td>
                    <td className="is-nowrap">{tba ? <span className="is-muted">TBA</span> : m!.days.join("")}</td>
                    <td className="is-nowrap">{tba ? <span className="is-muted">TBA</span> : fmtRange(m!.start, m!.end)}</td>
                    <td className="is-nowrap" title={loc.building}>{tba ? <span className="is-muted">TBA</span> : abbr(loc.building)}</td>
                    <td className="is-nowrap">{tba ? <span className="is-muted">TBA</span> : loc.room || <span className="is-muted">—</span>}</td>
                    {i === 0 && tail}
                  </tr>
                );
              });

              if (fi) {
                const loc = lecRoom ? splitRoom(lecRoom) : { building: "TBA", room: "" };
                rows.push(
                  <tr key={`${course.id}-final`} className={`${rowClass} wr-final`}>
                    <td className="is-left wr-final-label">Final Exam</td>
                    <td><span className="wr-type is-FI">FI</span></td>
                    <td />
                    <td className="is-nowrap">{finalDateShort(fi.colIdx, term)}</td>
                    <td className="is-nowrap">{fmtRange(fi.startH, fi.endH)}</td>
                    <td className="is-nowrap" title={loc.building}>{lecRoom ? abbr(loc.building) : "TBA"}</td>
                    <td className="is-nowrap">{loc.room || <span className="is-muted">TBA</span>}</td>
                  </tr>,
                );
              }
              return rows;
            })}
          </tbody>
        </table>
      </ScrollX>
      <p className="wr-help px-3 py-2" style={{ borderTop: "1px solid var(--wr-rule-soft)" }}>
        {items.length} class{items.length !== 1 ? "es" : ""} planned · {totalHrs.toFixed(1)} class hours per week · {buildingCount} building{buildingCount !== 1 ? "s" : ""}.
        Final exam times follow the campus finals matrix for the lecture's meeting pattern; confirm them in TSS.
      </p>
    </div>
  );
}
