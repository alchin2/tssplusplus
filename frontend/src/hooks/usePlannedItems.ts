import { useCallback, useEffect, useState } from "react";
import { COURSES } from "../data/courses";
import type { PlannedItem } from "../types";

function resolve(parsed: Array<{ courseId: string; sectionId: string }>): PlannedItem[] {
  const result: PlannedItem[] = [];
  for (const { courseId, sectionId } of parsed) {
    const course = COURSES.find(c => c.id === courseId);
    const section = course?.sections.find(s => s.id === sectionId);
    if (course && section) result.push({ course, section });
  }
  return result;
}

export function usePlannedItems(): [PlannedItem[], (updater: (prev: PlannedItem[]) => PlannedItem[]) => void] {
  const [items, setItems] = useState<PlannedItem[]>(() => {
    try {
      const raw = localStorage.getItem("tss-planned");
      if (!raw) return [];
      return resolve(JSON.parse(raw));
    } catch { return []; }
  });

  const update = useCallback((updater: (prev: PlannedItem[]) => PlannedItem[]) => {
    setItems(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem("tss-planned", JSON.stringify(
          next.map(i => ({ courseId: i.course.id, sectionId: i.section.id }))
        ));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== "tss-planned") return;
      try {
        setItems(e.newValue ? resolve(JSON.parse(e.newValue)) : []);
      } catch {}
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [items, update];
}
