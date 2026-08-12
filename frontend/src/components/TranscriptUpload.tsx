import { FileUp, Loader2, TriangleAlert, X } from "lucide-react";
import { useRef } from "react";
import type { TranscriptRecord } from "../types";

// Upload control for a UCSD academic-history PDF, adapted from ClassGraph's
// src/components/TranscriptUpload.jsx into TSS++'s flat/dense style. Purely
// presentational: the parent owns the file -> extract -> parse flow (App.tsx)
// so the parsed record persists across course selections, and the parsed
// completed/in-progress courses tint the prerequisite graph. The detected
// counts here reuse the graph's legend colors so the mapping reads at a glance.
export function TranscriptUpload(
  { fileName, loading, error, record, onPick, onClear }: {
    fileName: string | null;
    loading: boolean;
    error: string | null;
    record: TranscriptRecord;
    onPick: (file: File) => void;
    onClear: () => void;
  },
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasData = record.completed.size > 0 || record.inProgress.size > 0 || record.planned.size > 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onPick(f);
    e.target.value = ""; // allow re-picking the same file
  }

  return (
    <div className="mb-3">
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleChange} />

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={loading}
          className="flex items-center gap-1.5 px-2 py-1 text-[0.769rem] font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: "#6261c0", border: "1px solid #514fb0" }}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
          Upload transcript
        </button>
        <span className="text-[0.769rem] text-gray-500 truncate flex-1 min-w-0" title={fileName ?? undefined}>
          {loading ? "Reading PDF…" : fileName ?? "Highlight completed & in-progress prereqs (PDF)"}
        </span>
        {(fileName || hasData) && !loading && (
          <button type="button" onClick={onClear} title="Clear transcript"
            className="flex-shrink-0 flex items-center gap-0.5 text-[0.769rem] text-gray-500 hover:text-gray-800">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[0.769rem] text-amber-800">
          <TriangleAlert className="w-3 h-3 flex-shrink-0" /> {error}
        </div>
      )}

      {hasData && !loading && (
        <div className="mt-1.5 flex items-center gap-3 text-[0.769rem]">
          {record.completed.size > 0 && (
            <span style={{ color: "#16a34a" }}><b>{record.completed.size}</b> completed</span>
          )}
          {record.inProgress.size > 0 && (
            <span style={{ color: "#d97706" }}><b>{record.inProgress.size}</b> in progress</span>
          )}
          {record.planned.size > 0 && (
            <span style={{ color: "#2563eb" }}><b>{record.planned.size}</b> planned</span>
          )}
        </div>
      )}
    </div>
  );
}
