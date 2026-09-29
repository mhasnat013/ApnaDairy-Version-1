import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/cn";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface WordSegment {
  text: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Masked word-by-word headline reveal (split-text style).
 * Each word rises out of an overflow-hidden mask — responsive-safe, no JS line measuring.
 * - `segments`: styled runs of text; words are split per segment.
 * - `scroll`: false = animate on mount (hero); true = animate when scrolled into view.
 * Reduced motion renders plain text.
 */
export function SplitWords({
  segments,
  className,
  delay = 0,
  stagger = 0.045,
  duration = 0.75,
  scroll = false,
  as = "span",
}: {
  segments: WordSegment[];
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  scroll?: boolean;
  as?: "span" | "h1" | "h2" | "p";
}) {
  const reduce = useReducedMotion();
  const plain = segments.map((s) => s.text).join(" ");
  if (reduce) {
    const Tag = as as "span";
    return (
      <Tag className={className}>
        {segments.map((s, i) => (
          <span key={i} className={s.className} style={s.style}>
            {s.text}
            {i < segments.length - 1 ? " " : ""}
          </span>
        ))}
      </Tag>
    );
  }
  const Tag = (motion as unknown as Record<string, typeof motion.span>)[as] ?? motion.span;
  let wordIndex = 0;
  const viewportProps = scroll
    ? { whileInView: "show", viewport: { once: true, margin: "-64px" } }
    : { animate: "show" };
  return (
    <Tag
      className={className}
      aria-label={plain}
      initial="hidden"
      {...viewportProps}
      variants={{ hidden: {}, show: {} }}
    >
      {segments.map((seg, si) => (
        <span key={si} className={cn("inline", seg.className)} style={seg.style} aria-hidden="true">
          {seg.text.split(" ").map((word, wi, arr) => {
            const d = delay + wordIndex * stagger;
            wordIndex += 1;
            return (
              <span
                key={wi}
                className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom"
              >
                <motion.span
                  className="inline-block will-change-transform"
                  variants={{
                    hidden: { y: "112%" },
                    show: { y: "0%", transition: { duration, delay: d, ease: EASE } },
                  }}
                >
                  {word}
                </motion.span>
                {wi < arr.length - 1 ? " " : si < segments.length - 1 ? " " : ""}
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}

/** Convenience wrapper: single string, one style. */
export function SplitTitle({
  text,
  className,
  ...rest
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  scroll?: boolean;
  as?: "span" | "h1" | "h2" | "p";
}) {
  return <SplitWords segments={[{ text }]} className={className} {...rest} />;
}

/** Eyebrow kicker that slides in from the left with a small rule. */
export function EyebrowReveal({
  children,
  className,
  dark = false,
  scroll = true,
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
  scroll?: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce || !scroll) {
    return <p className={cn(dark ? "eyebrow-night" : "eyebrow", className)}>{children}</p>;
  }
  return (
    <motion.p
      className={cn(dark ? "eyebrow-night" : "eyebrow", className)}
      initial={{ opacity: 0, x: -18 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      {children}
    </motion.p>
  );
}
