import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";
import { SplitWords, EyebrowReveal } from "../motion/SplitWords";

/**
 * Marketing section wrapper.
 * - dark (night): full-bleed deep-forest chapter — mono kicker, oversized
 *   condensed uppercase headline, ivory lede.
 * - light (default): unchanged light card-section for portal pages.
 */
export function Section({
  eyebrow,
  title,
  lede,
  children,
  className,
  id,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: ReactNode;
  className?: string;
  id?: string;
  dark?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-24",
        dark ? "border-t border-white/10 bg-brand-forest" : "",
        className,
      )}
    >
      <div className="container-x">
        <div className="max-w-2xl">
          {eyebrow && (
            <EyebrowReveal dark={dark}>{dark ? `// ${eyebrow}` : eyebrow}</EyebrowReveal>
          )}
          <SplitWords
            as="h2"
            scroll
            className={cn(
              "mt-3 block",
              dark
                ? "font-condensed text-4xl uppercase leading-[0.95] tracking-wide text-ivory sm:text-5xl"
                : "font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl",
            )}
            segments={[{ text: title }]}
            stagger={0.03}
            duration={0.6}
          />
          {/* Animated underline draw — decorative, respects reduced motion */}
          <motion.span
            aria-hidden="true"
            style={{ transformOrigin: "left center" }}
            initial={reduce ? false : { scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true, margin: "-48px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn("mt-4 block h-1 w-12 rounded-full", dark ? "bg-[#00A878]" : "bg-brand")}
          />
          {lede && (
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-48px" }}
              transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "mt-4 text-base leading-relaxed sm:text-lg",
                dark ? "text-ivory/65" : "text-muted",
              )}
            >
              {lede}
            </motion.p>
          )}
        </div>
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}

/**
 * Page header for app + marketing pages.
 * - dark: night variant (mono kicker, condensed title, ivory text).
 * - light (default): unchanged, for portal pages.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          {eyebrow && (
            <EyebrowReveal dark={dark} scroll={false}>
              {dark ? `// ${eyebrow}` : eyebrow}
            </EyebrowReveal>
          )}
          <SplitWords
            as="h1"
            className={cn(
              "mt-2 block",
              dark
                ? "font-condensed text-4xl uppercase leading-[0.95] tracking-wide text-ivory sm:text-5xl"
                : "font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl",
            )}
            segments={[{ text: title }]}
            stagger={0.03}
            duration={0.6}
          />
          {description && (
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={cn("mt-3 leading-relaxed", dark ? "text-ivory/65" : "text-muted")}
            >
              {description}
            </motion.p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  );
}
