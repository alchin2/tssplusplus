import { BookOpen, Calendar, GitBranch, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COURSES } from "../data/courses";

export function HomeView({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    onSearch(q.trim());
  }

  useEffect(() => { inputRef.current?.focus(); }, []);

  const offered = COURSES.filter(c => c.offeredThisQuarter).length;
  const depts   = [...new Set(COURSES.map(c => c.dept))].length;
  const sections = COURSES.reduce((s, c) => s + c.sections.length, 0);

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero */}
      <div className="flex-shrink-0 px-6 py-12 flex flex-col items-center text-center"
        style={{ background: "linear-gradient(160deg, #0b4a67 0%, #16395e 60%, #1a1a4a 100%)" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-3xl tracking-tight">
            TSS<span style={{ color: "#f5c842" }}>++</span>
          </span>
        </div>

        <h1 className="text-white font-bold text-xl mb-2">
          The UCSD course browser you actually want
        </h1>
        <p className="text-white/65 text-sm max-w-lg mb-8 leading-relaxed">
          Search every course, inspect section availability, visualize prerequisite chains, and build your schedule — faster and cleaner than WebReg.
        </p>

        {/* Search bar */}
        <div className="w-full max-w-xl">
          <div className="flex border-2 border-white/20 focus-within:border-[#f5c842] transition-colors bg-white"
            style={{ borderRadius: 2 }}>
            <div className="flex items-center pl-3.5">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="Search by course code, title, or department..."
              className="flex-1 px-3 py-3 text-sm focus:outline-none text-gray-800 placeholder-gray-400 bg-transparent"
            />
            <button
              onClick={submit}
              className="px-5 py-3 font-bold text-sm border-l border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ background: "linear-gradient(to bottom, #f5c842, #e6a800)", color: "#333", borderLeft: "1px solid #c8900a" }}>
              Search
            </button>
          </div>
          <div className="flex justify-center gap-4 mt-3 text-[11px] text-white/50">
            <span>Try: <button onClick={() => { setQ("CSE 100"); onSearch("CSE 100"); }} className="text-white/70 hover:text-white underline underline-offset-2">CSE 100</button></span>
            <span><button onClick={() => { setQ("MATH"); onSearch("MATH"); }} className="text-white/70 hover:text-white underline underline-offset-2">MATH</button></span>
            <span><button onClick={() => { setQ("algorithms"); onSearch("algorithms"); }} className="text-white/70 hover:text-white underline underline-offset-2">algorithms</button></span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex gap-6 mt-8 text-center">
          {[
            { value: COURSES.length, label: "Courses" },
            { value: offered,        label: "Offered SP25" },
            { value: sections,       label: "Sections" },
            { value: depts,          label: "Departments" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-[11px] text-white/50">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 px-6 py-8" style={{ backgroundColor: "#f5f6fa" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">What you can do</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Search,
                color: "#6261c0",
                title: "Course Search",
                desc: "Filter by department, division, and availability. See seat counts, waitlists, and section schedules at a glance.",
              },
              {
                icon: GitBranch,
                color: "#0b4a67",
                title: "Prerequisite Graph",
                desc: "Visualize the full prerequisite tree for any course. Expand branches, see which courses you've completed, and plan ahead.",
              },
              {
                icon: Calendar,
                color: "#d56a03",
                title: "Schedule Planner",
                desc: "Add sections to your weekly calendar. Conflicts are flagged automatically. Export your final schedule as an ICS file.",
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-white border border-[#c0c0c0] p-4"
                style={{ borderTop: `3px solid ${color}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="font-bold text-xs" style={{ color: "#0b4a67" }}>{title}</span>
                </div>
                <p className="text-[12px] text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* About blurb */}
          <div className="mt-6 p-4 border border-[#c0c0c0] bg-white text-xs text-gray-600 leading-relaxed">
            <strong className="text-gray-800">About TSS++</strong> — TSS++ (TritonSearchService++) is an unofficial reimplementation of UCSD WebReg built for speed and clarity.
            It provides the same course data as the Schedule of Classes, but with a modernized interface: instant search, interactive prerequisite trees, and a drag-free visual planner.
            Data reflects the Spring 2025 quarter. This is a student-made demo and is not affiliated with UC San Diego.
          </div>
        </div>
      </div>
    </div>
  );
}
