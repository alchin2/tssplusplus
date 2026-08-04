import { useEffect, useState } from "react";
import { fetchBuildings, type BuildingInfo } from "../lib/api";

// Fetch-once: the building list only changes when the scraper re-runs, not
// per-session, so there's no reason to refetch on every MapView mount.
let cache: Record<string, BuildingInfo> | null = null;

export function useBuildings(): Record<string, BuildingInfo> {
  const [buildings, setBuildings] = useState<Record<string, BuildingInfo>>(cache ?? {});

  useEffect(() => {
    if (cache) return;
    let alive = true;
    fetchBuildings()
      .then(b => { cache = b; if (alive) setBuildings(b); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return buildings;
}
