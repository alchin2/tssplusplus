import { Github } from "lucide-react";
import { RaccoonLogo } from "./RaccoonLogo";

// The TritonLink-style header band: brand on the left, GitHub on the right.
export function SiteHeader() {
  return (
    <header className="wr-header print:hidden">
      <div className="wr-page flex items-center gap-3" style={{ height: "3.4rem" }}>
        <a href="/" className="flex items-center gap-2.5 text-white hover:no-underline hover:text-white" aria-label="TSS++ home">
          <span className="flex flex-shrink-0" style={{ transform: "rotate(-4deg)" }}>
            <RaccoonLogo width={34} />
          </span>
          <span className="font-bold tracking-tight" style={{ fontSize: "1.23rem" }}>
            TSS<span style={{ color: "var(--wr-gold)" }}>++</span>
          </span>
          <span className="hidden sm:inline text-[0.846rem] font-bold uppercase tracking-[0.08em] text-white/80 pl-1">
            Course Planner
          </span>
        </a>
        <a href="https://github.com/alchin2/tssplusplus" target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 text-[0.923rem] text-white/85 hover:text-white font-bold">
          <Github className="w-4 h-4" aria-hidden="true" /> GitHub
        </a>
      </div>
    </header>
  );
}
