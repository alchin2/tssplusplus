import { CircleHelp, FileUp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Planner-toolbar control for importing an enrolled schedule from a TSS
// "My Courses" PDF. Sibling in spirit to TranscriptUpload.tsx: purely
// presentational -- the parent (App.tsx) owns the extract -> parse -> resolve
// flow. Importing *replaces* the planner (see handleScheduleImportFile), so the
// info popover sets that expectation up front.
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
    <div ref={wrapRef} className="relative flex items-center">
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleChange} />

      <div className="flex" style={{ border: "1px solid #514fb0" }}>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={loading}
          title="Import your enrolled courses from a TSS My Courses PDF"
          className="flex items-center gap-1 px-2 py-1 text-[0.692rem] font-bold text-white disabled:opacity-60 hover:brightness-110"
          style={{ backgroundColor: "#6261c0" }}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
          Import PDF
        </button>
        <button type="button" onClick={() => setHelpOpen(o => !o)} aria-label="How to import"
          className="flex items-center px-1.5 py-1 text-white border-l hover:brightness-110"
          style={{ backgroundColor: "#6261c0", borderColor: "#514fb0" }}>
          <CircleHelp className="w-3 h-3" />
        </button>
      </div>

      {helpOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 p-3 text-[0.692rem] leading-snug text-gray-700 shadow-lg"
          style={{ backgroundColor: "#fff", border: "1px solid #6261c0" }}>
          <div className="font-bold text-[0.769rem] text-[#0b4a67] mb-1.5">Import your enrolled courses</div>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Open <b>My Courses</b> in TSS.</li>
            <li> <b>Print (Cntrl + P) </b> → <b>Save as PDF</b>.</li>
            <li>Upload it here</li>
          </ol>
          <p className="mt-2 text-gray-500">
            <b>Warning:</b> This <b>replaces</b> your current planner. Only courses offered this quarter can be matched.
          </p>
        </div>
      )}
    </div>
  );
}
