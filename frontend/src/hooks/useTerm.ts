import { createContext, useCallback, useContext, useState } from "react";
import type { Meta } from "../lib/api";
import { LEGACY_KEY, LEGACY_TERM } from "./usePlannedItems";

const STORAGE_KEY = "tss-term";

// The term the user picked in the header dropdown, provided app-wide so the
// drawers, prerequisite graph, finals views and .ics export all follow it
// without threading a prop through every layer. null until /api/meta loads.
export const TermContext = createContext<string | null>(null);

export function useTerm(): string | null {
  return useContext(TermContext);
}

function readStored(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    // A plan saved before terms were selectable is for LEGACY_TERM; open
    // there so it doesn't look lost behind a newer default term.
    if (localStorage.getItem(LEGACY_KEY) !== null) {
      localStorage.setItem(STORAGE_KEY, LEGACY_TERM);
      return LEGACY_TERM;
    }
  } catch {}
  return null;
}

// The selected term code (e.g. "wi27"), remembered per browser. A remembered
// term the backend no longer serves falls back to the backend's default.
export function useSelectedTerm(meta: Meta | null): [string | null, (term: string) => void] {
  const [picked, setPicked] = useState<string | null>(readStored);

  const select = useCallback((term: string) => {
    setPicked(term);
    try { localStorage.setItem(STORAGE_KEY, term); } catch {}
  }, []);

  if (!meta) return [null, select];
  return [picked && meta.terms.includes(picked) ? picked : meta.default_term, select];
}
