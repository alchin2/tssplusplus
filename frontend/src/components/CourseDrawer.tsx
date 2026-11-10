import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useBuildings } from "../hooks/useBuildings";
import { useTerm } from "../hooks/useTerm";
import { ApiError, fetchCourseDetail } from "../lib/api";
import { computeFinal, conflictsWith, finalDateShort, fmtRange, splitRoom } from "../lib/schedule";
import type { Course, CourseDetail, PlannedItem, Section } from "../types";
import { PrereqGraph } from "./PrereqGraph";
import { ScrollX } from "./ScrollX";

// One WebReg search-result drawer: a gray row with a caret, the course code
// and title; expanded, it shows the sections table with Plan buttons, the
// catalog description, and the prerequisite tree.
export function CourseDrawer({
  course, expanded, onToggle, plannedItems, onAdd, onRemove,
  termLabel, termName,
}: {
  course: Course;
  expanded: boolean;
  onToggle: () => void;
  plannedItems: PlannedItem[];
  onAdd: (c: Course, s: Section) => void;
  onRemove: (courseId: string) => void;
  termLabel: string;
  termName: string;
}) {
  const planned = plannedItems.find(i => i.course.id === course.id);
  const bodyId = `drawer-${course.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  return (
    <div className="wr-drawer" data-course-id={course.id}>
      <button type="button" className="wr-drawer-row" aria-expanded={expanded} aria-controls={bodyId} onClick={onToggle}>
        <span className="wr-caret" aria-hidden="true" />
        {/* Cross-listed codes (BENG/BIMM/CSE/CHEM 182) wrap after each slash. */}
        <span className="wr-code">{course.code.split("/").map((part, i, all) => (
          <span key={i}>{part}{i < all.length - 1 && <>/<wbr /></>}</span>
        ))}</span>
        <span className="wr-drawer-title" title={course.title}>{course.title}</span>
        {planned
          ? <span className="wr-drawer-meta is-planned">Planned · {planned.section.id}</span>
          : course.offeredThisQuarter
            ? <span className="wr-drawer-meta">{termLabel || "Offered"}</span>
            : <span className="wr-drawer-meta">Not offered</span>}
      </button>
      {expanded && (
        <div className="wr-drawer-body" id={bodyId}>
          {course.moduleId === null ? (
            <div className="wr-notice is-warn">
              <div className="wr-notice-title">Not offered in {termName}</div>
              <p className="mt-1">No sections are scheduled for {course.code} this term. It stays in the catalog, so you can still read its prerequisites below once it is offered.</p>
            </div>
          ) : (
            <DrawerDetail course={course} moduleId={course.moduleId} plannedItems={plannedItems} onAdd={onAdd} onRemove={onRemove} />
          )}
        </div>
      )}
    </div>
  );
}

function DrawerDetail({ course, moduleId, plannedItems, onAdd, onRemove }: {
  course: Course; moduleId: string; plannedItems: PlannedItem[];
  onAdd: (c: Course, s: Section) => void;
  onRemove: (courseId: string) => void;
}) {
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDesc, setShowDesc] = useState(true);
  const [showPrereq, setShowPrereq] = useState(true);
  const buildings = useBuildings();
  const abbr = (building: string) => buildings[building]?.abbr ?? building;
  const term = useTerm();

  useEffect(() => {
    setDetail(null);
    setError(null);
    let alive = true;
    fetchCourseDetail(moduleId, term)
      .then(d => { if (alive) setDetail(d); })
      .catch(err => {
        if (!alive) return;
        setError(err instanceof ApiError && err.status === 503
          ? "Live section data is temporarily unavailable. Try again in a minute."
          : err instanceof Error ? err.message : "Failed to load course detail.");
      });
    return () => { alive = false; };
  }, [moduleId, term]);

  if (error) {
    return (
      <div className="wr-notice is-warn">
        <div className="wr-notice-title">Could not load sections</div>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-2 py-1" aria-busy="true" aria-label="Loading sections">
        <span className="wr-skel" style={{ width: "40%" }} />
        <span className="wr-skel" style={{ width: "92%" }} />
        <span className="wr-skel" style={{ width: "86%" }} />
        <span className="wr-skel" style={{ width: "64%" }} />
      </div>
    );
  }

  const plannedSection = plannedItems.find(i => i.course.id === course.id)?.section;
  // Conflict checks ignore this course's own planned section so switching
  // between its sections isn't reported as conflicting with itself.
  const otherItems = plannedItems.filter(i => i.course.id !== course.id);
  const plannedCodes = new Set(plannedItems.map(i => i.course.code));
  const dept = course.dept.toLowerCase();

  return (
    <div>
      <div className="wr-drawer-links">
        <button type="button" className="wr-linkbtn" aria-pressed={showDesc} onClick={() => setShowDesc(s => !s)}>
          {showDesc ? "Hide description" : "Description"}
        </button>
        <button type="button" className="wr-linkbtn" aria-pressed={showPrereq} onClick={() => setShowPrereq(s => !s)}>
          {showPrereq ? "Hide prerequisites" : "Prerequisites"}
        </button>
        <a href={`https://catalog.ucsd.edu/courses/${dept}.html`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1">
          Catalog <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      </div>

      <ScrollX>
        <table className="wr-table" style={{ minWidth: "52rem" }}>
          <thead>
            <tr>
              <th>Section</th>
              <th>Meeting<br />Type</th>
              <th>Days</th>
              <th>Time</th>
              <th>Building</th>
              <th>Room</th>
              <th className="is-left">Instructor</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {detail.sections.length === 0 && (
              <tr><td colSpan={9} className="is-muted" style={{ padding: "0.8rem" }}>No section data available for this course.</td></tr>
            )}
            {detail.sections.map((sec, si) => {
              const isPlanned = plannedSection?.id === sec.id;
              const conflict = !isPlanned && conflictsWith(sec, otherItems);
              const fi = computeFinal(sec);
              const meetings = sec.meetings.length > 0 ? sec.meetings : [null];
              const span = meetings.length + (fi ? 1 : 0);
              const rowClass = isPlanned ? "is-planned" : si % 2 === 1 ? "is-stripe" : "";
              const finalRoom = fi?.room ?? sec.meetings.find(m => m.type === "LE")?.room;

              const rows = meetings.map((m, i) => {
                const loc = m ? splitRoom(m.room) : { building: "TBA", room: "" };
                const tba = !m || (m.days.length === 0 && m.start === m.end);
                return (
                  <tr key={`${sec.id}-${i}`} className={`${rowClass} ${i === 0 ? "is-group-start" : ""}`}>
                    {i === 0 && <td className="wr-code" rowSpan={span} style={{ verticalAlign: "top" }}>{sec.id}</td>}
                    <td><span className={`wr-type is-${m?.type ?? "LE"}`}>{m?.type ?? "—"}</span></td>
                    <td className="is-nowrap">{tba ? <span className="is-muted">TBA</span> : m!.days.join("")}</td>
                    <td className="is-nowrap">{tba ? <span className="is-muted">TBA</span> : fmtRange(m!.start, m!.end)}</td>
                    <td className="is-nowrap" title={loc.building}>{tba ? <span className="is-muted">TBA</span> : abbr(loc.building)}</td>
                    <td className="is-nowrap">{tba ? <span className="is-muted">TBA</span> : loc.room || <span className="is-muted">—</span>}</td>
                    {i === 0 && (
                      <>
                        <td className="is-left" rowSpan={span} style={{ verticalAlign: "top" }}>{sec.instructor}</td>
                        <td rowSpan={span} style={{ verticalAlign: "top" }}>
                          {isPlanned
                            ? <span className="wr-status is-planned">Planned</span>
                            : conflict
                              ? <span className="wr-status is-conflict">Conflict</span>
                              : <span className="wr-status is-none">—</span>}
                        </td>
                        <td rowSpan={span} style={{ verticalAlign: "top" }}>
                          <div className="wr-actions">
                            {isPlanned
                              ? <button type="button" className="wr-btn is-sm" onClick={() => onRemove(course.id)}>Remove</button>
                              : <button type="button" className="wr-btn is-sm is-primary" onClick={() => onAdd(detail, sec)}
                                  title={conflict ? "Plan anyway; the conflict stays flagged on your schedule" : undefined}>
                                  {plannedSection ? "Change" : "Plan"}
                                </button>}
                            {sec.bookUrl && (
                              <a href={sec.bookUrl} target="_blank" rel="noopener noreferrer" className="wr-btn is-sm"
                                title={`Book ${sec.id} on TSS (opens in a new tab)`}>
                                Book <ExternalLink className="w-3 h-3" aria-hidden="true" />
                              </a>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              });

              if (fi) {
                const loc = finalRoom ? splitRoom(finalRoom) : { building: "TBA", room: "" };
                rows.push(
                  <tr key={`${sec.id}-final`} className={`${rowClass} wr-final`}>
                    <td><span className="wr-type is-FI">FINAL</span></td>
                    <td className="is-nowrap">{finalDateShort(fi.colIdx, term)}</td>
                    <td className="is-nowrap">{fmtRange(fi.startH, fi.endH)}</td>
                    <td className="is-nowrap" title={loc.building}>{finalRoom ? abbr(loc.building) : "TBA"}</td>
                    <td className="is-nowrap">{loc.room || <span className="is-muted">TBA</span>}</td>
                  </tr>,
                );
              }
              return rows;
            })}
          </tbody>
        </table>
      </ScrollX>

      {showDesc && detail.description && (
        <p className="mt-3 text-[0.923rem] leading-relaxed" style={{ color: "var(--wr-text-soft)", maxWidth: "78ch" }}>
          {detail.description}
        </p>
      )}

      {showPrereq && (
        <div className="mt-3">
          <div className="mb-1.5">
            <span className="wr-label text-[0.923rem]">Prerequisites</span>
          </div>
          <PrereqGraph moduleId={detail.moduleId} plannedCodes={plannedCodes} />
        </div>
      )}
    </div>
  );
}
