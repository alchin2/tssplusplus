import { FileUp, Loader2, TriangleAlert, X } from "lucide-react";
import { useRef } from "react";
import type { TranscriptRecord } from "./transcriptParse";

// Upload control for a UCSD academic-history PDF. Purely presentational: the
// parent owns the file -> extract -> parse flow (App.tsx) so the parsed record
// persists across drawers, and the completed/in-progress courses tint the
// prerequisite graph. The counts reuse the graph's legend colors.
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.846rem]" style={{ color: "var(--wr-muted)" }}>
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleChange} />

      <button type="button" onClick={() => inputRef.current?.click()} disabled={loading} className="wr-btn is-sm"
        title="Upload your academic history PDF to mark completed and in-progress prerequisites">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <FileUp className="w-3 h-3" aria-hidden="true" />}
        {fileName ? "Replace transcript" : "Upload transcript"}
      </button>

      {loading && <span>Reading PDF…</span>}
      {!loading && !fileName && !hasData && <span>Marks completed and in-progress prerequisites (academic history PDF).</span>}
      {!loading && fileName && <span className="truncate max-w-[14rem]" title={fileName}>{fileName}</span>}

      {hasData && !loading && (
        <span className="inline-flex gap-2">
          {record.completed.size > 0 && <span style={{ color: "#2e7d32" }}><b>{record.completed.size}</b> completed</span>}
          {record.inProgress.size > 0 && <span style={{ color: "#8a5a00" }}><b>{record.inProgress.size}</b> in progress</span>}
          {record.planned.size > 0 && <span style={{ color: "var(--wr-link)" }}><b>{record.planned.size}</b> planned</span>}
        </span>
      )}

      {(fileName || hasData) && !loading && (
        <button type="button" onClick={onClear} className="wr-linkbtn is-quiet inline-flex items-center gap-0.5" title="Clear transcript">
          <X className="w-3 h-3" aria-hidden="true" /> Clear
        </button>
      )}

      {error && (
        <span className="inline-flex items-center gap-1" style={{ color: "var(--wr-danger)" }}>
          <TriangleAlert className="w-3 h-3" aria-hidden="true" /> {error}
        </span>
      )}
    </div>
  );
}
