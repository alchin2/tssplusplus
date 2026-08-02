import { useCallback, useEffect, useState } from "react";
import type { PlannedItem } from "../types";

// Full course+section objects are persisted (v2): with courses coming
// from the API there's no static COURSES list to re-resolve ids against.
// The pre-API format ({courseId, sectionId} refs) fails the shape check
// below and is silently dropped.
const STORAGE_KEY = "tss-planned-v2";

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

export function usePlannedItems(): [PlannedItem[], (updater: (prev: PlannedItem[]) => PlannedItem[]) => void] {
  const [items, setItems] = useState<PlannedItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? parse(raw) : [];
    } catch { return []; }
  });

  const update = useCallback((updater: (prev: PlannedItem[]) => PlannedItem[]) => {
    setItems(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setItems(e.newValue ? parse(e.newValue) : []);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [items, update];
}
