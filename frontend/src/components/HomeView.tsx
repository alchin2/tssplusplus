import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COURSES } from "../data/courses";
import { GeiselLogo } from "./GeiselLogo";

export function HomeView({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  function submit() { onSearch(q.trim()); }
  useEffect(() => { inputRef.current?.focus(); }, []);

  const offered  = COURSES.filter(c => c.offeredThisQuarter).length;
  const depts    = [...new Set(COURSES.map(c => c.dept))].length;
  const sections = COURSES.reduce((s, c) => s + c.sections.length, 0);

  return (
    <div className="relative flex-1 min-h-full overflow-hidden flex items-center"
      style={{ backgroundColor: "#f4f5ff" }}>

      {/* ── main content ── */}
      <div className="relative flex items-center w-full px-14 py-12 gap-8 flex-wrap">

        {/* ─ Left: copy + search ─ */}
        <div className="flex-1" style={{ minWidth: 280, maxWidth: 460 }}>

          <h1 style={{ fontSize: 58, fontWeight: 800, color: "#0f172a", lineHeight: 1.0, marginBottom: 20, letterSpacing: "-1.5px" }}>
            TSS<span style={{ color: "#e6a800" }}>++</span>
          </h1>

          <p style={{ fontSize: 15, color: "#4a5875", lineHeight: 1.7, marginBottom: 36, maxWidth: 400 }}>
            Search every course, inspect section availability, visualize prerequisite chains,
            and build your schedule —{" "}
            <span style={{ color: "#0b4a67", fontWeight: 700 }}>faster and cleaner than TSS.</span>
          </p>

          {/* search bar */}
          <div className="flex mb-10" style={{ border: "2px solid #0b4a67", borderRadius: 3, overflow: "hidden", maxWidth: 450, background: "#fff" }}>
            <div className="flex items-center pl-4">
              <Search className="w-4 h-4" style={{ color: "#94a3b8" }} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="Search courses, codes, professors…"
              className="flex-1 px-3 text-sm focus:outline-none text-gray-800 placeholder-gray-400"
              style={{ paddingTop: 14, paddingBottom: 14 }}
            />
            <button
              onClick={submit}
              style={{ paddingLeft: 22, paddingRight: 22, fontWeight: 700, fontSize: 13, background: "linear-gradient(to bottom, #0d70ac, #0b4a67)", color: "#fff", borderLeft: "1px solid #083858", cursor: "pointer" }}
            >
              Search
            </button>
          </div>

          {/* stats */}
          <div className="flex gap-8">
            {[
              { value: COURSES.length, label: "Courses" },
              { value: offered,        label: "Offered SP25" },
              { value: sections,       label: "Sections" },
              { value: depts,          label: "Departments" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#0b4a67", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─ Right: Geisel sticker ─ */}
        <div className="flex-shrink-0 relative flex items-center justify-center" style={{ width: 480, height: 400 }}>

          {/* ── Geisel sticker ── */}
          <div style={{ transform: "rotate(-4deg)", zIndex: 10, filter: "drop-shadow(0 8px 20px rgba(11,74,103,0.18))" }}>
            <GeiselLogo width={440} />
          </div>

        </div>

      </div>
    </div>
  );
}
