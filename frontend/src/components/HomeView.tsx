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
    <div className="relative flex-1 min-h-full overflow-hidden flex items-center"
      style={{ backgroundColor: "#f4f5ff" }}>

      {/* ── main content: centered, fluid two-column that stacks on phones ── */}
      <div className="relative flex items-center justify-center w-full max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-14 py-10 gap-8 flex-wrap">

        {/* ─ Left: copy + search ─ */}
        <div style={{ flex: "1 1 320px", maxWidth: 520 }}>

          <h1 style={{ fontSize: "clamp(44px, 5.5vw, 72px)", fontWeight: 800, color: "#0f172a", lineHeight: 1.0, marginBottom: 20, letterSpacing: "-0.025em" }}>
            TSS<span style={{ color: "#e6a800" }}>++</span>
          </h1>

          <p style={{ fontSize: "clamp(14px, 0.6vw + 8px, 17px)", color: "#4a5875", lineHeight: 1.7, marginBottom: 36, maxWidth: "44ch" }}>
            Search every course, inspect section availability, visualize prerequisite chains,
            and build your schedule —{" "}
            <span style={{ color: "#0b4a67", fontWeight: 700 }}>faster and cleaner than TSS.</span>
          </p>

          {/* search bar */}
          <div className="flex mb-10" style={{ border: "2px solid #0b4a67", borderRadius: 3, overflow: "hidden", maxWidth: 480, background: "#fff" }}>
            <div className="flex items-center pl-4">
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#94a3b8" }} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="Search courses, codes, professors…"
              className="flex-1 min-w-0 px-3 focus:outline-none text-gray-800 placeholder-gray-400"
              style={{ paddingTop: 14, paddingBottom: 14, fontSize: "clamp(13px, 0.5vw + 8px, 15px)" }}
            />
            <button
              onClick={submit}
              style={{ paddingLeft: 22, paddingRight: 22, fontWeight: 700, fontSize: "clamp(12px, 0.5vw + 7px, 14px)", background: "linear-gradient(to bottom, #0d70ac, #0b4a67)", color: "#fff", borderLeft: "1px solid #083858", cursor: "pointer" }}
            >
              Search
            </button>
          </div>

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
          style={{ flex: "0 1 460px", minWidth: 240, maxWidth: 460 }}>

          {/* ── raccoon sticker ── */}
          <div className="w-full" style={{ transform: "rotate(-4deg)", zIndex: 10, filter: "drop-shadow(0 8px 20px rgba(11,74,103,0.18))", padding: "6% 4%" }}>
            <RaccoonLogo width="100%" />
          </div>

        </div>

      </div>
    </div>
  );
}
