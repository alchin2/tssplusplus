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
