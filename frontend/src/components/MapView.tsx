import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Map as MapIcon, MapPin, Navigation } from "lucide-react";
import { useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { BLDG_LATLNG, BLDG_NAMES, UCSD_CENTER, buildingFromRoom } from "../data/buildings";
import { DAY_CODES, DAY_LABELS, fmt } from "../lib/schedule";
import type { Course, DayCode, Meeting, PlannedItem, Section } from "../types";

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

function makeGeiselIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="background:#7b68c8;color:white;border:2px solid white;border-radius:4px;padding:2px 5px;font-size:9px;font-weight:bold;font-family:Arial;box-shadow:0 2px 6px rgba(0,0,0,.3);white-space:nowrap">Geisel</div>`,
    iconSize:   [52, 22],
    iconAnchor: [26, 11],
  });
}

export function MapView({ items }: { items: PlannedItem[] }) {
  const [selDay, setSelDay] = useState<DayCode>("M");

  const dayMeetings = useMemo(() => {
    const out: { course: Course; section: Section; meeting: Meeting; bldg: string }[] = [];
    for (const { course, section } of items) {
      for (const meeting of section.meetings) {
        if (meeting.days.includes(selDay)) {
          out.push({ course, section, meeting, bldg: buildingFromRoom(meeting.room) });
        }
      }
    }
    return out.sort((a, b) => a.meeting.start - b.meeting.start);
  }, [items, selDay]);

  // Unique stop locations in time order for the route
  const routeLatLngs = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    for (const { bldg } of dayMeetings) {
      const ll = BLDG_LATLNG[bldg];
      if (ll && (pts.length === 0 || pts[pts.length-1][0] !== ll[0] || pts[pts.length-1][1] !== ll[1])) {
        pts.push(ll);
      }
    }
    return pts;
  }, [dayMeetings]);

  return (
    <div className="flex h-full">

      {/* ── left sidebar ── */}
      <aside className="w-56 flex-shrink-0 border-r border-[#c0c0c0] bg-white flex flex-col z-10">
        <div className="px-3 py-2 border-b border-[#c0c0c0]" style={{ backgroundColor: "#6261c0" }}>
          <h3 className="font-bold text-white text-xs flex items-center gap-1.5"><MapIcon className="w-3.5 h-3.5" />Campus Map</h3>
          <p className="text-white/70 text-[0.769rem] mt-0.5">Select a day to see your route</p>
        </div>

        {/* day selector */}
        <div className="flex border-b border-[#c0c0c0]">
          {DAY_CODES.map((d, i) => (
            <button key={d} onClick={() => setSelDay(d)}
              className="flex-1 py-2 text-[0.846rem] font-bold border-r border-[#c0c0c0] last:border-r-0 transition-colors"
              style={{ backgroundColor: selDay === d ? "#0b4a67" : "#f5f5fa", color: selDay === d ? "#fff" : "#4a5875" }}>
              {DAY_LABELS[i]}
            </button>
          ))}
        </div>

        {/* class list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {dayMeetings.length === 0
            ? <p className="text-[0.846rem] text-gray-400 text-center py-6">No classes on {DAY_LABELS[DAY_CODES.indexOf(selDay)]}</p>
            : dayMeetings.map(({ course, meeting }, i) => (
              <div key={i} className="flex gap-2 p-2 border rounded text-[0.846rem]"
                style={{ borderColor: course.color + "60", backgroundColor: course.color + "0e" }}>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[0.692rem] font-bold flex-shrink-0"
                    style={{ backgroundColor: course.color }}>{i + 1}</div>
                  {i < dayMeetings.length - 1 && <div className="w-px flex-1 min-h-[12px]" style={{ backgroundColor: course.color + "50" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-bold" style={{ color: course.color }}>{course.code}</div>
                  <div className="text-gray-600">{meeting.type} · {fmt(meeting.start)}</div>
                  <div className="text-gray-400 flex items-center gap-0.5 text-[0.769rem]">
                    <MapPin className="w-2.5 h-2.5" />{meeting.room}
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {routeLatLngs.length > 1 && (
          <div className="p-2 border-t border-[#c0c0c0] text-[0.769rem] text-gray-500 flex items-center gap-1.5">
            <Navigation className="w-3 h-3 text-[#6261c0]" />
            Route: {routeLatLngs.length} stops
          </div>
        )}
      </aside>

      {/* ── Leaflet map ── */}
      <div className="flex-1 relative" style={{ zIndex: 0 }}>
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

          {/* Geisel landmark */}
          <Marker position={BLDG_LATLNG["GEISEL"]} icon={makeGeiselIcon()}>
            <Popup><strong>Geisel Library</strong><br />UCSD Landmark</Popup>
          </Marker>

          {/* All course buildings for this day */}
          {dayMeetings.map(({ course, section, meeting, bldg }, i) => {
            const ll = BLDG_LATLNG[bldg];
            if (!ll) return null;
            return (
              <Marker key={`${bldg}-${i}`} position={ll} icon={makePinIcon(course.color, String(i + 1))}>
                <Popup>
                  <div style={{ fontFamily: "Arial", fontSize: 12, minWidth: 160 }}>
                    <div style={{ fontWeight: "bold", color: course.color, marginBottom: 4 }}>{course.code} — {meeting.type}</div>
                    <div style={{ color: "#374151", marginBottom: 2 }}>{BLDG_NAMES[bldg] ?? bldg}</div>
                    <div style={{ color: "#6b7280", fontSize: 11 }}>{meeting.room}</div>
                    <div style={{ color: "#6b7280", fontSize: 11 }}>{fmt(meeting.start)} – {fmt(meeting.end)}</div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>{section.instructor}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Route polyline */}
          {routeLatLngs.length > 1 && (
            <Polyline
              positions={routeLatLngs}
              pathOptions={{ color: "#6261c0", weight: 3, opacity: 0.8, dashArray: "8 6" }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
