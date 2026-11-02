import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { useBuildings } from "../hooks/useBuildings";
import { fetchRoute } from "../lib/api";
import { getCachedRoute, routeCacheKey, setCachedRoute } from "../lib/routeCache";
import { DAY_CODES, DAY_LABELS, fmt, splitRoom } from "../lib/schedule";
import type { Course, DayCode, Meeting, PlannedItem, Section } from "../types";

const UCSD_CENTER: [number, number] = [32.8801, -117.2340];
const ROUTE_COLOR = "#1f6a9b";

// Basemap tiles. Carto's public basemaps started answering browser requests
// with a "key required" placeholder, so the default is OpenStreetMap's
// standard tiles (no key; see https://operations.osmfoundation.org/policies/tiles/).
// Override with VITE_TILE_URL / VITE_TILE_ATTRIBUTION to use another
// provider, e.g. Esri's light gray canvas:
//   https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}
const TILE_URL = import.meta.env.VITE_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = import.meta.env.VITE_TILE_ATTRIBUTION
  || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_MAX_ZOOM = 19;

function makePinIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:32px;height:38px">
      <div style="position:absolute;top:0;left:0;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);color:white;font-size:10px;font-weight:bold;font-family:Helvetica,Arial,sans-serif">${label}</span>
      </div>
    </div>`,
    iconSize:   [32, 38],
    iconAnchor: [16, 38],
    popupAnchor:[0, -40],
  });
}

type RouteStatus = "idle" | "loading" | "ok" | "error";

// The Map tab: a weekday strip, then a Leaflet map with a numbered pin per
// meeting that day and the walking route between them.
export function MapView({ items }: { items: PlannedItem[] }) {
  const [selDay, setSelDay] = useState<DayCode>("M");
  const buildings = useBuildings();

  const dayMeetings = useMemo(() => {
    const out: { course: Course; section: Section; meeting: Meeting; bldg: string }[] = [];
    for (const { course, section } of items) {
      for (const meeting of section.meetings) {
        if (meeting.days.includes(selDay)) {
          out.push({ course, section, meeting, bldg: splitRoom(meeting.room).building });
        }
      }
    }
    return out.sort((a, b) => a.meeting.start - b.meeting.start);
  }, [items, selDay]);

  // Unique stop locations in time order for the route
  const stopLatLngs = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    for (const { bldg } of dayMeetings) {
      const info = buildings[bldg];
      if (info?.lat == null || info?.lng == null) continue;
      const ll: [number, number] = [info.lat, info.lng];
      if (pts.length === 0 || pts[pts.length - 1][0] !== ll[0] || pts[pts.length - 1][1] !== ll[1]) {
        pts.push(ll);
      }
    }
    return pts;
  }, [dayMeetings, buildings]);

  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceM: number | null; durationS: number | null } | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>("idle");

  useEffect(() => {
    if (stopLatLngs.length < 2) {
      setRouteGeometry(null);
      setRouteInfo(null);
      setRouteStatus("idle");
      return;
    }

    const key = routeCacheKey(stopLatLngs);
    const cached = getCachedRoute(key);
    if (cached) {
      setRouteGeometry(cached.geometry);
      setRouteInfo({ distanceM: cached.distanceM, durationS: cached.durationS });
      setRouteStatus("ok");
      return;
    }

    let alive = true;
    setRouteStatus("loading");
    fetchRoute(stopLatLngs).then(route => {
      if (!alive) return;
      if (route) {
        setCachedRoute(key, route);
        setRouteGeometry(route.geometry);
        setRouteInfo({ distanceM: route.distanceM, durationS: route.durationS });
        setRouteStatus("ok");
      } else {
        setRouteGeometry(null);
        setRouteInfo(null);
        setRouteStatus("error");
      }
    });
    return () => { alive = false; };
  }, [stopLatLngs]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Day strip ── */}
      <div className="flex-shrink-0 flex" style={{ borderBottom: "1px solid var(--wr-rule)" }} role="tablist" aria-label="Weekday">
        {DAY_CODES.slice(0, 5).map((d, i) => {
          const active = selDay === d;
          return (
            <button key={d} type="button" role="tab" aria-selected={active} onClick={() => setSelDay(d)}
              className="flex-1 py-1.5 text-[0.923rem] font-bold transition-colors"
              style={{
                backgroundColor: active ? "var(--wr-bar)" : "#f4f4f4",
                color: active ? "#fff" : "var(--wr-bar)",
                borderRight: i < 4 ? "1px solid var(--wr-rule)" : "none",
              }}>
              {DAY_LABELS[i]}
            </button>
          );
        })}
      </div>

      {/* ── Leaflet map fills the rest ── */}
      <div className="flex-1 relative" style={{ zIndex: 0 }}>
        {dayMeetings.length === 0 ? (
          <div className="absolute inset-x-0 top-3 z-[1000] flex justify-center pointer-events-none">
            <div className="wr-help px-3 py-1.5" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid var(--wr-rule)", borderRadius: 3 }}>
              {items.length === 0 ? "Plan a class to see its building here." : `No classes meet on ${DAY_LABELS[DAY_CODES.indexOf(selDay)]}.`}
            </div>
          </div>
        ) : (
          <div className="absolute top-2 right-2 z-[1000] max-h-[calc(100%-1rem)] w-52 overflow-y-auto wr-scroll-x"
            style={{ background: "rgba(255,255,255,0.96)", border: "1px solid var(--wr-rule)", borderRadius: 3 }}>
            <div className="wr-panel-head" style={{ padding: "0.3rem 0.6rem" }}>{DAY_LABELS[DAY_CODES.indexOf(selDay)]} stops</div>
            {dayMeetings.map(({ course, meeting }, i) => (
              <div key={i} className="flex gap-2 px-2 py-1.5 items-start" style={{ borderTop: i ? "1px solid var(--wr-rule-hair)" : "none" }}>
                <div className="w-4 h-4 mt-0.5 rounded-full flex items-center justify-center text-white text-[0.615rem] font-bold flex-shrink-0"
                  style={{ backgroundColor: course.color }}>{i + 1}</div>
                <div className="min-w-0 leading-tight text-[0.769rem]">
                  <div className="font-bold" style={{ color: course.color }}>{course.code} <span className="font-normal" style={{ color: "var(--wr-muted)" }}>{meeting.type}</span></div>
                  <div style={{ color: "var(--wr-text-soft)" }}>{fmt(meeting.start)} – {fmt(meeting.end)}</div>
                  <div className="truncate" style={{ color: "var(--wr-muted)" }} title={meeting.room}>{meeting.room}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {stopLatLngs.length > 1 && (
          <div className="absolute bottom-2 left-2 z-[1000] px-3 py-1.5 text-[0.769rem] flex items-center gap-1.5 pointer-events-none"
            style={{ background: "rgba(255,255,255,0.96)", border: "1px solid var(--wr-rule)", borderRadius: 3, color: "var(--wr-text-soft)" }}>
            <Navigation className="w-3 h-3 flex-shrink-0" style={{ color: ROUTE_COLOR }} aria-hidden="true" />
            <span>
              {stopLatLngs.length} stops
              {routeStatus === "loading" && " · Calculating walking route…"}
              {routeStatus === "ok" && routeInfo?.distanceM != null && routeInfo?.durationS != null && (
                <> · {(routeInfo.distanceM / 1609.34).toFixed(1)} mi · {Math.round(routeInfo.durationS / 60)} min walk</>
              )}
              {routeStatus === "error" && " · Routing unavailable, straight-line estimate shown"}
            </span>
          </div>
        )}

        <MapContainer center={UCSD_CENTER} zoom={16} style={{ height: "100%", width: "100%" }} zoomControl={true}>
          <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={TILE_MAX_ZOOM} />

          {dayMeetings.map(({ course, section, meeting, bldg }, i) => {
            const info = buildings[bldg];
            if (info?.lat == null || info?.lng == null) return null;
            const ll: [number, number] = [info.lat, info.lng];
            return (
              <Marker key={`${bldg}-${i}`} position={ll} icon={makePinIcon(course.color, String(i + 1))}>
                <Popup>
                  <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12, minWidth: 160 }}>
                    <div style={{ fontWeight: "bold", color: course.color, marginBottom: 4 }}>{course.code} — {meeting.type}</div>
                    <div style={{ color: "#333", marginBottom: 2 }}>{info.name ?? bldg}</div>
                    <div style={{ color: "#6b6b6b", fontSize: 11 }}>{meeting.room}</div>
                    <div style={{ color: "#6b6b6b", fontSize: 11 }}>{fmt(meeting.start)} – {fmt(meeting.end)}</div>
                    <div style={{ color: "#9a9a9a", fontSize: 11, marginTop: 2 }}>{section.instructor}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Route polyline: real walking directions when available, a
              straight-line estimate while loading or if routing failed */}
          {stopLatLngs.length > 1 && (
            <Polyline
              positions={routeGeometry ?? stopLatLngs}
              pathOptions={{
                color: ROUTE_COLOR,
                weight: 3,
                opacity: 0.85,
                ...(routeGeometry ? {} : { dashArray: "8 6" }),
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
