import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { useBuildings } from "../hooks/useBuildings";
import { fetchRoute } from "../lib/api";
import { getCachedRoute, routeCacheKey, setCachedRoute } from "../lib/routeCache";
import { DAY_CODES, DAY_LABELS, fmt } from "../lib/schedule";
import type { Course, DayCode, Meeting, PlannedItem, Section } from "../types";

const UCSD_CENTER: [number, number] = [32.8801, -117.2340];

// Real meeting.room values are full building names + room number, e.g.
// "Peterson Hall Room 110" (see lib/api.ts's parseSched). Stripping the
// "Room ..." suffix gives the same building-name key
// scrapers/build_buildings.py used to build data/buildings.json, so this
// is a direct dict lookup -- no fuzzy matching needed.
function buildingKeyFromRoom(room: string): string {
  return room.replace(/\s+Room\s+.*$/, "").trim();
}

function makePinIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:32px;height:38px">
      <div style="position:absolute;top:0;left:0;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);color:white;font-size:9px;font-weight:bold;font-family:Arial">${label}</span>
      </div>
    </div>`,
    iconSize:   [32, 38],
    iconAnchor: [16, 38],
    popupAnchor:[0, -40],
  });
}



type RouteStatus = "idle" | "loading" | "ok" | "error";

export function MapView({ items }: { items: PlannedItem[] }) {
  const [selDay, setSelDay] = useState<DayCode>("M");
  const buildings = useBuildings();

  const dayMeetings = useMemo(() => {
    const out: { course: Course; section: Section; meeting: Meeting; bldg: string }[] = [];
    for (const { course, section } of items) {
      for (const meeting of section.meetings) {
        if (meeting.days.includes(selDay)) {
          out.push({ course, section, meeting, bldg: buildingKeyFromRoom(meeting.room) });
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

      {/* ── day selector: full-width horizontal bar, weekdays only ── */}
      <div className="flex-shrink-0 flex border-b border-[#c0c0c0]">
        {DAY_CODES.slice(0, 5).map((d, i) => (
          <button key={d} onClick={() => setSelDay(d)}
            className="flex-1 py-2 text-[0.846rem] font-bold border-r border-[#c0c0c0] last:border-r-0 transition-colors"
            style={{ backgroundColor: selDay === d ? "#0b4a67" : "#f5f5fa", color: selDay === d ? "#fff" : "#4a5875" }}>
            {DAY_LABELS[i]}
          </button>
        ))}
      </div>

      {/* ── Leaflet map fills all remaining space ── */}
      <div className="flex-1 relative" style={{ zIndex: 0 }}>

        {/* class legend overlay */}
        {dayMeetings.length > 0 && (
          <div className="absolute top-2 right-2 z-[1000] max-h-[calc(100%-1rem)] w-48 overflow-y-auto rounded-md bg-white/95 shadow-md border border-[#c0c0c0] divide-y divide-gray-100">
            {dayMeetings.map(({ course, meeting }, i) => (
              <div key={i} className="flex gap-2 px-2 py-1.5 items-start">
                <div className="w-4 h-4 mt-0.5 rounded-full flex items-center justify-center text-white text-[0.615rem] font-bold flex-shrink-0"
                  style={{ backgroundColor: course.color }}>{i + 1}</div>
                <div className="min-w-0 leading-tight">
                  <div className="font-mono font-bold text-[0.769rem]" style={{ color: course.color }}>{course.code}</div>
                  <div className="text-gray-500 text-[0.692rem]">{fmt(meeting.start)}</div>
                  <div className="text-gray-400 text-[0.692rem] truncate">{meeting.room}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* route stat overlay */}
        {stopLatLngs.length > 1 && (
          <div className="absolute bottom-2 left-2 z-[1000] px-3 py-1.5 rounded-md bg-white/95 shadow-md border border-[#c0c0c0] text-[0.769rem] text-gray-600 flex items-center gap-1.5 pointer-events-none">
            <Navigation className="w-3 h-3 text-[#6261c0] flex-shrink-0" />
            <span>
              {stopLatLngs.length} stops
              {routeStatus === "loading" && " · Calculating route…"}
              {routeStatus === "ok" && routeInfo?.distanceM != null && routeInfo?.durationS != null && (
                <> · {(routeInfo.distanceM / 1609.34).toFixed(1)} mi · {Math.round(routeInfo.durationS / 60)} min walk</>
              )}
              {routeStatus === "error" && " · Routing unavailable — straight-line estimate"}
            </span>
          </div>
        )}

        <MapContainer
          center={UCSD_CENTER}
          zoom={16}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CartoDB</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />



          {/* All course buildings for this day */}
          {dayMeetings.map(({ course, section, meeting, bldg }, i) => {
            const info = buildings[bldg];
            if (info?.lat == null || info?.lng == null) return null;
            const ll: [number, number] = [info.lat, info.lng];
            return (
              <Marker key={`${bldg}-${i}`} position={ll} icon={makePinIcon(course.color, String(i + 1))}>
                <Popup>
                  <div style={{ fontFamily: "Arial", fontSize: 12, minWidth: 160 }}>
                    <div style={{ fontWeight: "bold", color: course.color, marginBottom: 4 }}>{course.code} — {meeting.type}</div>
                    <div style={{ color: "#374151", marginBottom: 2 }}>{info.name ?? bldg}</div>
                    <div style={{ color: "#6b7280", fontSize: 11 }}>{meeting.room}</div>
                    <div style={{ color: "#6b7280", fontSize: 11 }}>{fmt(meeting.start)} – {fmt(meeting.end)}</div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>{section.instructor}</div>
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
                color: "#6261c0",
                weight: 3,
                opacity: 0.8,
                ...(routeGeometry ? {} : { dashArray: "8 6" }),
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
