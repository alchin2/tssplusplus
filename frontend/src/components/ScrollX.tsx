import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// Horizontal-scroll wrapper for wide tables. When the content overflows and
// more columns sit off to the right, a fade marks the edge and a one-line
// hint says so; both vanish at the end of the scroll or when nothing
// overflows, so the affordance never lies.
export function ScrollX({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"none" | "more" | "end">("none");

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 1;
    if (!overflow) setState("none");
    else setState(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 ? "end" : "more");
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener("scroll", update, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener("scroll", update); };
  }, [update]);

  return (
    <div className="wr-scrollx-wrap" data-scroll={state}>
      <div ref={ref} className="wr-scroll-x">{children}</div>
      <p className="wr-scrollx-hint" aria-hidden="true">Scroll sideways for more columns</p>
    </div>
  );
}
