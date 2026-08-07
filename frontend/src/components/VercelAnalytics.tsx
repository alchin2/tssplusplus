import { useEffect } from "react";

/** Loads Vercel Web Analytics only when explicitly enabled for a deployment. */
export function VercelAnalytics() {
  useEffect(() => {
    if (import.meta.env.VITE_ANALYTICS_ENABLED !== "true") return;
    if (document.querySelector('script[data-tss-vercel-analytics]')) return;

    const script = document.createElement("script");
    script.defer = true;
    script.src = "/_vercel/insights/script.js";
    script.dataset.tssVercelAnalytics = "true";
    document.head.appendChild(script);
  }, []);

  return null;
}
