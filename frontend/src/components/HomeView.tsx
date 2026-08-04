import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { termLabel, useMeta } from "../hooks/useMeta";
import { RaccoonLogo } from "./RaccoonLogo";

export function HomeView({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  function submit() { onSearch(q.trim()); }
  useEffect(() => { inputRef.current?.focus(); }, []);

  const meta = useMeta();
  const term = termLabel(meta);

return (
  <div className="relative flex-1 min-h-screen overflow-hidden flex items-center justify-center"
    style={{ backgroundColor: "#f4f5ff" }}>


      {/* ── main content: centered, fluid two-column that stacks on phones ── */}
      <div className="relative flex items-center justify-center w-full max-w-[1100px] mx-auto px-4 sm:px-10 lg:px-14 py-10 gap-8 flex-wrap">

        {/* ─ Left: copy + search ─ */}
        <div style={{ flex: "1 0 320px", maxWidth: 520 }}>

          <h1 style={{ fontSize: "clamp(44px, 5.5vw, 72px)", fontWeight: 800, color: "#0f172a", lineHeight: 1.0, marginBottom: 20, letterSpacing: "-0.025em" }}>
            TSS<span style={{ color: "#e6a800" }}>++</span>
          </h1>

          <p style={{ fontSize: "clamp(14px, 0.6vw + 8px, 17px)", color: "#4a5875", lineHeight: 1.7, marginBottom: 36, maxWidth: "44ch" }}>
            Search courses, inspect section availability, visualize prerequisites,
            and build your schedule.
          </p>

          {/* get started button */}
          <button
            onClick={submit}
            className="flex mb-10 items-center justify-center"
            style={{ 
              border: "2px solid #0b4a67", 
              borderRadius: 3, 
              maxWidth: 300, 
              width: "100%",
              paddingTop: 14, 
              paddingBottom: 14,
              paddingLeft: 22, 
              paddingRight: 22, 
              fontWeight: 700, 
              fontSize: "clamp(12px, 0.5vw + 7px, 14px)", 
              background: "linear-gradient(to bottom, #0d70ac, #0b4a67)", 
              color: "#fff", 
              cursor: "pointer" 
            }}
          >
            Get Started
          </button>


          {/* stats */}
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {[
              { value: meta?.course_count ?? "—",  label: "Courses" },
              { value: meta?.offered_count ?? "—", label: term ? `Offered ${term}` : "Offered" },
              { value: meta?.depts.length ?? "—",  label: "Departments" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div style={{ fontSize: "clamp(22px, 1.8vw, 30px)", fontWeight: 800, color: "#0b4a67", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─ Right: raccoon mascot sticker (scales with the viewport) ─ */}
        <div className="relative flex items-center justify-center"
          style={{ flex: "1 0 460px", minWidth: 240, maxWidth: 460 }}>

          {/* ── raccoon sticker ── */}
          <div className="w-full" style={{ transform: "rotate(-4deg)", zIndex: 10, filter: "drop-shadow(0 8px 20px rgba(11,74,103,0.18))", padding: "6% 4%" }}>
            <RaccoonLogo width="100%" />
          </div>

        </div>

      </div>
    </div>
  );
}
