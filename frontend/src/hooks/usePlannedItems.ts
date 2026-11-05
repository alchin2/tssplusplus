import { useCallback, useEffect, useState } from "react";
import type { PlannedItem } from "../types";

// Full course+section objects are persisted, one list per term (sections,
// module_ids and meeting times all differ between terms).
const keyFor = (term: string) => `tss-planned-v2:${term}`;

// The single, unscoped list from before terms were selectable. Only fa26 was
// ever served then, so it migrates there. Older formats ({courseId,
// sectionId} refs) fail the shape check below and are silently dropped.
export const LEGACY_KEY = "tss-planned-v2";
export const LEGACY_TERM = "fa26";

function parse(raw: string): PlannedItem[] {
  try {
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    return items.filter(
      (i): i is PlannedItem =>
        typeof i?.course?.id === "string" &&
        typeof i?.course?.code === "string" &&
        typeof i?.section?.id === "string" &&
        Array.isArray(i?.section?.meetings)
    );
  } catch {
    return [];
  }
}

function migrateLegacy() {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === null) return;
    if (localStorage.getItem(keyFor(LEGACY_TERM)) === null) localStorage.setItem(keyFor(LEGACY_TERM), legacy);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

function load(term: string | null): PlannedItem[] {
  if (!term) return [];
  migrateLegacy();
  try {
    const raw = localStorage.getItem(keyFor(term));
    return raw ? parse(raw) : [];
  } catch { return []; }
}

// The selected term's planned sections. Empty (and updates are dropped)
// until the term is known.
export function usePlannedItems(term: string | null): [PlannedItem[], (updater: (prev: PlannedItem[]) => PlannedItem[]) => void] {
  const [state, setState] = useState(() => ({ term, items: load(term) }));
  // Switching terms swaps in that term's list during render, so a frame of
  // the previous term's schedule never shows.
  if (state.term !== term) setState({ term, items: load(term) });

  const update = useCallback((updater: (prev: PlannedItem[]) => PlannedItem[]) => {
    if (!term) return;
    setState(prev => {
      if (prev.term !== term) return prev;
      const items = updater(prev.items);
      try {
        localStorage.setItem(keyFor(term), JSON.stringify(items));
      } catch {}
      return { term, items };
    });
  }, [term]);

  useEffect(() => {
    if (!term) return;
    function onStorage(e: StorageEvent) {
      if (e.key !== keyFor(term!)) return;
      setState({ term, items: e.newValue ? parse(e.newValue) : [] });
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [term]);

  return [state.items, update];
}
