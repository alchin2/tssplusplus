import { RaccoonLogo } from "./RaccoonLogo";

const SEP = <span className="px-2" style={{ color: "var(--wr-faint)" }}>|</span>;

export function SiteFooter() {
  return (
    <footer className="wr-footer mt-8 print:hidden">
      <div className="wr-page flex items-start justify-between gap-6 py-4">
        <div className="space-y-1 leading-snug">
          <p>TSS++ is an independent, open-source planner and is not affiliated with UC San Diego or the Registrar.</p>
          <p>Course data comes from the public Schedule of Classes and catalog; your planner lives only in this browser.</p>
          <p className="pt-1">
            <a href="https://github.com/alchin2/tssplusplus/issues/new" target="_blank" rel="noopener noreferrer">Report a problem</a>
            {SEP}
            <a href="https://github.com/alchin2/tssplusplus" target="_blank" rel="noopener noreferrer">GitHub</a>
            {SEP}
            <a href="https://github.com/alchin2/tssplusplus/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a>
          </p>
        </div>
        <div className="flex-shrink-0 opacity-60" style={{ filter: "grayscale(1)" }} aria-hidden="true">
          <RaccoonLogo width={44} stickerOutline={false} />
        </div>
      </div>
    </footer>
  );
}
