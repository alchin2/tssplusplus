import { TriangleAlert } from "lucide-react";
import type { ConflictPair } from "../lib/schedule";

// WebReg's pink "You have scheduling conflicts!" box, listed pair by pair so
// the student knows exactly which two classes collide.
export function ConflictNotice({ pairs }: { pairs: ConflictPair[] }) {
  if (pairs.length === 0) return null;
  return (
    <div className="wr-notice is-danger" role="alert">
      <div className="wr-notice-title">
        <TriangleAlert className="w-4 h-4" aria-hidden="true" />
        You have scheduling conflicts!
      </div>
      <ul>
        {pairs.map(p => (
          <li key={`${p.a}|${p.b}|${p.final ? "f" : "m"}`}>
            {p.a}{p.final ? " Final" : ""} and {p.b}{p.final ? " Final" : ""}
          </li>
        ))}
      </ul>
      <p className="mt-2">
        Resolve overlaps before your enrollment appointment. Check the Calendar and Finals tabs, or switch one of the sections from its search drawer.
      </p>
    </div>
  );
}
