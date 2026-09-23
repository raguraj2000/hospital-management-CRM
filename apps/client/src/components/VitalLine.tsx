// The one deliberate visual flourish in the app: a restrained heartbeat
// trace for the login screen's brand panel. Grounded in the subject matter
// (a hospital), used exactly once, not repeated as a pattern elsewhere.
export function VitalLine() {
  return (
    <svg className="vital-line" viewBox="0 0 800 80" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points="0,40 140,40 165,40 180,10 200,70 220,40 260,40 300,40 320,20 340,60 360,40 800,40"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
