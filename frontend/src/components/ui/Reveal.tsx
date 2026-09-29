import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Scroll-triggered reveal: fades + rises content into view once.
 * Renders a plain element (no animation) when the user prefers reduced motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Stagger offset in seconds — pass i * 0.06 from list maps. */
  delay?: number;
  y?: number;
  /** Render as an <li> to keep list semantics valid. */
  as?: "div" | "li";
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return as === "li" ? (
      <li className={className}>{children}</li>
    ) : (
      <div className={className}>{children}</div>
    );
  }
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}
