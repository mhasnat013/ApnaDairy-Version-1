import { useReducedMotion } from "framer-motion";
import { Sprout } from "lucide-react";

/**
 * Honest-labels marquee strip: text-only, no fake logos or invented stats.
 * Only claims that are true of the product/demo labelling.
 */
const ITEMS = [
  "Simulated IoT readings — always labelled",
  "Demonstration predictions — never lab-certified",
  "Demo payments — no real money charged",
  "Verified partner farms",
  "Every batch traceable",
  "Cold chain monitored",
];

export function HonestMarquee() {
  const reduce = useReducedMotion();
  const row = (ariaHidden: boolean) => (
    <div aria-hidden={ariaHidden} className="flex shrink-0 items-center">
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center">
          <span className="whitespace-nowrap px-6 text-[13px] font-semibold uppercase tracking-[0.16em] text-brand-pine">
            {item}
          </span>
          <Sprout className="h-4 w-4 shrink-0 text-brand/40" aria-hidden="true" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee overflow-hidden border-y border-line bg-palegreen/70 py-4">
      {reduce ? (
        <div className="flex flex-wrap items-center justify-center">{row(false)}</div>
      ) : (
        <div className="marquee-track flex w-max">
          {row(true)}
          {row(true)}
        </div>
      )}
    </div>
  );
}
