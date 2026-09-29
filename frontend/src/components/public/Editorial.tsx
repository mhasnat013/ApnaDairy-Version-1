import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { Reveal } from "../ui/Reveal";

/**
 * Shared editorial kit for ApnaDairy's public pages (Ploy-inspired direction, brief §4).
 * - Condensed display headings (font-condensed / Anton), uppercase, tight leading.
 * - Inter body; max two font families on these surfaces.
 * - Colour-block rhythm: ivory, mint, sky, deep forest, controlled lime accent.
 * - All motion respects prefers-reduced-motion.
 */

/* ---------------------------------- Hero ---------------------------------- */

export function EditorialHero({
  eyebrow,
  title,
  lede,
  actions,
  note,
  media,
  mediaCaption,
}: {
  eyebrow: string;
  /** May contain "\n" for manual line breaks. */
  title: string;
  lede?: string;
  actions?: ReactNode;
  /** Honest demo label or other annotation under the CTAs. */
  note?: ReactNode;
  /** Optional right-side visual (compliant imagery only). */
  media?: ReactNode;
  mediaCaption?: string;
}) {
  const reduce = useReducedMotion();
  const lines = title.split("\n");
  return (
    <header className="px-3 pt-3 sm:px-5 sm:pt-5">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-brand-forest text-ivory sm:rounded-[2.5rem]">
        {/* emerald radial grade + grain */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(90%_120%_at_15%_20%,rgba(0,168,120,0.35)_0%,rgba(11,61,51,0)_55%),radial-gradient(70%_90%_at_90%_85%,rgba(221,240,106,0.10)_0%,rgba(11,61,51,0)_60%)]"
        />
        <div aria-hidden="true" className="grain-overlay absolute inset-0" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 sm:px-10 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-xs font-bold uppercase tracking-[0.22em] text-[#DDF06A]"
            >
              {eyebrow}
            </motion.p>
            <h1 className="mt-5 font-condensed text-[clamp(2.9rem,7.5vw,6.25rem)] uppercase leading-[0.88] tracking-[0.01em] text-ivory">
              {lines.map((line, i) => (
                <motion.span
                  key={i}
                  initial={reduce ? false : { opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.08 + i * 0.09,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="block"
                >
                  {line}
                </motion.span>
              ))}
            </h1>
            {lede && (
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 max-w-xl text-base leading-relaxed text-ivory/75 sm:text-lg"
              >
                {lede}
              </motion.p>
            )}
            {actions && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                {actions}
              </motion.div>
            )}
            {note && <div className="mt-6">{note}</div>}
          </div>
          {media && (
            <motion.figure
              initial={reduce ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-3xl border border-white/15 shadow-lift"
            >
              {media}
              {mediaCaption && (
                <figcaption className="bg-brand-forest px-5 py-3 text-xs text-ivory/60">
                  {mediaCaption}
                </figcaption>
              )}
            </motion.figure>
          )}
        </div>
      </div>
    </header>
  );
}

/** Ploy-style pill CTAs for hero bands. */
export function HeroCta({
  to,
  label,
  variant = "light",
}: {
  to: string;
  label: string;
  variant?: "light" | "outline" | "lime";
}) {
  return (
    <Link
      to={to}
      className={cn(
        "btn-lift inline-flex h-12 items-center rounded-full px-7 text-sm font-semibold transition-colors",
        variant === "light" && "bg-white text-brand-forest hover:bg-mint",
        variant === "outline" &&
          "border border-white/30 text-ivory hover:border-white hover:bg-white/10",
        variant === "lime" && "bg-[#DDF06A] text-brand-forest hover:brightness-105",
      )}
    >
      {label}
    </Link>
  );
}

/* ------------------------------- Colour block ------------------------------ */

type Tone = "ivory" | "white" | "mint" | "sky" | "forest" | "lime";

const TONE_CLASSES: Record<Tone, string> = {
  ivory: "bg-ivory text-ink",
  white: "bg-white text-ink",
  mint: "bg-mint text-ink",
  sky: "bg-sky text-ink",
  forest: "bg-brand-forest text-ivory",
  lime: "bg-[#DDF06A] text-brand-forest",
};

/** Full-bleed colour-block section — the editorial rhythm of the site. */
export function ColourBlock({
  tone = "ivory",
  children,
  className,
  id,
  rounded = false,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  id?: string;
  /** Ploy-style: pull the block into a rounded container with outer margins. */
  rounded?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        TONE_CLASSES[tone],
        rounded ? "mx-3 my-3 rounded-[1.75rem] sm:mx-5 sm:rounded-[2.5rem]" : "",
        className,
      )}
    >
      <div className="container-x py-16 sm:py-24">{children}</div>
    </section>
  );
}

/* ----------------------------- Section heading ----------------------------- */

export function EditorialSectionHead({
  eyebrow,
  title,
  lede,
  dark = false,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  dark?: boolean;
  align?: "left" | "center";
}) {
  return (
    <Reveal
      className={cn(
        "mb-10 max-w-3xl sm:mb-14",
        align === "center" && "mx-auto text-center",
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "text-xs font-bold uppercase tracking-[0.22em]",
            dark ? "text-[#DDF06A]" : "text-brand-moss",
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "mt-4 font-condensed text-[clamp(2rem,4.5vw,3.5rem)] uppercase leading-[0.92] tracking-[0.01em]",
          dark ? "text-ivory" : "text-ink",
        )}
      >
        {title}
      </h2>
      {lede && (
        <p
          className={cn(
            "mt-4 max-w-2xl text-base leading-relaxed sm:text-lg",
            dark ? "text-ivory/70" : "text-muted",
          )}
        >
          {lede}
        </p>
      )}
    </Reveal>
  );
}

/* ------------------------------ Feature cards ------------------------------ */

export function FeatureGrid({
  items,
  dark = false,
}: {
  items: Array<{ icon: LucideIcon; title: string; text: string }>;
  dark?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((f, i) => (
        <Reveal
          key={f.title}
          delay={Math.min(i * 0.06, 0.3)}
          className={cn(
            "card-lift rounded-2xl border p-6 shadow-card sm:p-7",
            dark
              ? "border-white/10 bg-white/[0.06]"
              : "border-line bg-white",
          )}
        >
          <span
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              dark ? "bg-[#DDF06A]/15 text-[#DDF06A]" : "bg-mint text-brand-pine",
            )}
          >
            <f.icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <h3
            className={cn(
              "mt-4 text-lg font-semibold",
              dark ? "text-ivory" : "text-ink",
            )}
          >
            {f.title}
          </h3>
          <p
            className={cn(
              "mt-2 text-sm leading-relaxed",
              dark ? "text-ivory/65" : "text-muted",
            )}
          >
            {f.text}
          </p>
        </Reveal>
      ))}
    </div>
  );
}

/* ---------------------------------- Steps ---------------------------------- */

export function StepsList({
  steps,
  dark = false,
}: {
  steps: Array<{ title: string; text: string }>;
  dark?: boolean;
}) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <Reveal
          as="li"
          key={s.title}
          delay={Math.min(i * 0.05, 0.25)}
          className={cn(
            "grid gap-4 rounded-2xl border p-6 shadow-card sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-7",
            dark ? "border-white/10 bg-white/[0.06]" : "border-line bg-white",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "font-condensed text-5xl leading-none tracking-wide sm:text-6xl",
              dark ? "text-[#DDF06A]/25" : "text-brand/15",
            )}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <h3
              className={cn(
                "text-xl font-semibold",
                dark ? "text-ivory" : "text-ink",
              )}
            >
              {s.title}
            </h3>
            <p
              className={cn(
                "mt-2 max-w-3xl leading-relaxed",
                dark ? "text-ivory/65" : "text-muted",
              )}
            >
              {s.text}
            </p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}

/* --------------------------------- CTA band --------------------------------- */

export function CtaBand({
  eyebrow,
  title,
  text,
  primary,
  secondary,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  primary: { to: string; label: string };
  secondary?: { to: string; label: string };
}) {
  return (
    <ColourBlock tone="lime" rounded className="overflow-hidden">
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-pine">
          {eyebrow}
        </p>
        <h2 className="mt-4 font-condensed text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.9] text-brand-forest">
          {title}
        </h2>
        {text && (
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-brand-forest/75">
            {text}
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to={primary.to}
            className="btn-lift inline-flex h-12 items-center rounded-full bg-brand-forest px-8 text-sm font-semibold text-ivory hover:bg-brand-pine"
          >
            {primary.label}
          </Link>
          {secondary && (
            <Link
              to={secondary.to}
              className="btn-lift inline-flex h-12 items-center rounded-full border border-brand-forest/30 px-8 text-sm font-semibold text-brand-forest hover:border-brand-forest hover:bg-white/40"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </Reveal>
    </ColourBlock>
  );
}

/* ------------------------------- Honest label ------------------------------ */

/** Amber honest-demo pill — brief §25 labels. */
export function DemoBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-3.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-amber/40",
        className,
      )}
    >
      {label}
    </span>
  );
}
