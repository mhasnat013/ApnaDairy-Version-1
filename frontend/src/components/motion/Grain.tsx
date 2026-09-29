/**
 * Subtle cinematic film grain overlaying the whole public site.
 * Static SVG turbulence texture at very low opacity — no animation,
 * pointer-events disabled. In-palette: emerald-tinted grain.
 */
export function Grain() {
  return (
    <div
      aria-hidden="true"
      className="grain-overlay pointer-events-none fixed inset-0 z-[70]"
    />
  );
}
