import { CircleHelp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Title-row action for importing an enrolled schedule from a TSS "My
// Courses" PDF. Purely presentational -- the parent (App.tsx) owns the
// extract -> parse -> resolve flow. Importing *replaces* the planner (see
// handleScheduleImportFile), so the help popover sets that expectation.
export function ScheduleImportButton({ onPick, loading }: {
  onPick: (file: File) => void;
  loading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // Close the popover on outside-click or Escape.
  useEffect(() => {
    if (!helpOpen) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setHelpOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setHelpOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [helpOpen]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onPick(f);
    e.target.value = ""; // allow re-picking the same file
  }

  return (
    <div ref={wrapRef} className="relative inline-flex items-center gap-1">
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleChange} />
      <button type="button" className="wr-linkbtn inline-flex items-center gap-1" onClick={() => inputRef.current?.click()} disabled={loading}
        title="Import your enrolled courses from a TSS My Courses PDF">
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
        {loading ? "Importing…" : "Import from TSS"}
      </button>
      <button type="button" onClick={() => setHelpOpen(o => !o)} aria-label="How to import from TSS" aria-expanded={helpOpen}
        className="inline-flex items-center" style={{ color: "var(--wr-link)" }}>
        <CircleHelp className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {helpOpen && (
        <div className="wr-popover" style={{ top: "100%", right: 0, marginTop: 4 }} role="dialog" aria-label="How to import from TSS">
          <p className="font-bold text-[0.923rem] mb-1.5" style={{ color: "var(--wr-text)" }}>Import your enrolled courses</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Open <b>My Courses</b> in TSS.</li>
            <li>Print the page (<b>Ctrl/⌘ + P</b>) and choose <b>Save as PDF</b>.</li>
            <li>Upload that PDF here.</li>
          </ol>
          <p className="mt-2">
            <b>This replaces your current planner.</b> Only courses offered this quarter can be matched; anything else is listed as unmatched.
          </p>
        </div>
      )}
    </div>
  );
}
