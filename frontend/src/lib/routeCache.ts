// localStorage cache for computed walking routes, keyed by their ordered
// stop coordinates. A student's Monday route is the same every Monday for
// the whole quarter, so after the first render it's cache-only -- no
// repeat calls to /api/route.

import type { RouteResult } from "./api";

const CACHE_KEY = "tss-route-cache-v1";
const MAX_ENTRIES = 50;

function readCache(): Record<string, RouteResult> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, RouteResult>): void {
  const entries = Object.entries(cache);
  const trimmed = entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
  } catch {
    // Storage full/unavailable -- caching is a pure optimization, safe to drop.
  }
}

export function routeCacheKey(stops: [number, number][]): string {
  return stops.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join("|");
}

export function getCachedRoute(key: string): RouteResult | null {
  return readCache()[key] ?? null;
}

export function setCachedRoute(key: string, route: RouteResult): void {
  const cache = readCache();
  delete cache[key]; // re-insert at the end so eviction is oldest-first
  cache[key] = route;
  writeCache(cache);
}
