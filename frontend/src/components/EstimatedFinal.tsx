import { ESTIMATED_FINAL_NOTE } from "../lib/schedule";

// Marks a final guessed from the campus finals matrix (TSS lists none for
// the section), so nobody mistakes the guess for the registrar's schedule.
export function EstimatedFinalTag() {
  return <span className="wr-est" title={ESTIMATED_FINAL_NOTE}>Est.</span>;
}

// The visible explanation for EstimatedFinalTag -- the tag's tooltip alone
// never shows on touch screens.
export function EstimatedFinalsNote({ className = "" }: { className?: string }) {
  return (
    <p className={`wr-help ${className}`} role="note">
      <EstimatedFinalTag /> TSS doesn't list these finals, so their times are estimated from the campus
      finals schedule and may be wrong. Confirm them with your instructor.
    </p>
  );
}
