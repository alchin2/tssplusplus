import { useEffect, useState } from "react";
import { fetchMeta, type Meta } from "../lib/api";

// One shared fetch for the whole app; /api/meta is static per backend run.
let cached: Meta | null = null;
let inflight: Promise<Meta> | null = null;

export function useMeta(): Meta | null {
  const [meta, setMeta] = useState<Meta | null>(cached);

  useEffect(() => {
    if (cached) return;
    inflight ??= fetchMeta().then(m => (cached = m));
    let alive = true;
    inflight.then(m => { if (alive) setMeta(m); }).catch(() => { inflight = null; });
    return () => { alive = false; };
  }, []);

  return meta;
}

// "fa26" -> "FA26", the badge/label form used across the UI.
export function termLabel(meta: Meta | null): string {
  return (meta?.term ?? "").toUpperCase();
}

// "fa26" -> "Fall Quarter 2026", the way WebReg names a term. Unknown codes
// fall back to the uppercase label; no term yet reads as an ellipsis.
const TERM_NAMES: Record<string, string> = {
  fa: "Fall Quarter", wi: "Winter Quarter", sp: "Spring Quarter",
  su: "Summer Session", s1: "Summer Session I", s2: "Summer Session II", s3: "Special Summer Session",
};

export function termName(meta: Meta | null): string {
  const code = meta?.term;
  if (!code) return "…";
  const m = /^([a-z]\d|[a-z]{2})(\d{2})$/i.exec(code);
  if (!m) return code.toUpperCase();
  const name = TERM_NAMES[m[1].toLowerCase()];
  return name ? `${name} 20${m[2]}` : code.toUpperCase();
}
