/** Shared animation vocabulary: framer-motion variants + reduced-motion helpers.
 *  Every animation in the app must respect prefers-reduced-motion — use
 *  `useReducedMotion()` from framer-motion and render static states when true.
 */
import { useReducedMotion, type Variants } from "framer-motion";

export { useReducedMotion };

/** Standard rise-in used by Reveal and hero entrance pieces. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

/** Parent variant that staggers any children using `fadeUp`. */
export const staggerParent = (stagger = 0.09, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

/** Snappy micro-interaction for buttons/cards (hover lift handled in CSS). */
export const pressable: Variants = {
  idle: { scale: 1 },
  pressed: { scale: 0.97, transition: { duration: 0.12 } },
};
