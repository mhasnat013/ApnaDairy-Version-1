import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/cn";

import desktopPng from "../../assets/hero/apnadairy-hero-desktop.png";
import desktopWebp from "../../assets/hero/apnadairy-hero-desktop.webp";
import desktopWebp1200 from "../../assets/hero/apnadairy-hero-desktop-1200.webp";
import desktopAvif from "../../assets/hero/apnadairy-hero-desktop.avif";
import desktopAvif1200 from "../../assets/hero/apnadairy-hero-desktop-1200.avif";
import mobilePng from "../../assets/hero/apnadairy-hero-mobile.png";
import mobileWebp from "../../assets/hero/apnadairy-hero-mobile.webp";
import mobileAvif from "../../assets/hero/apnadairy-hero-mobile.avif";

/**
 * Homepage hero (Ploy-inspired, brief §6).
 * - Nearly full-screen rounded media container inside 24–32px outer margins.
 * - Responsive <picture>: landscape asset for desktop/tablet, portrait for mobile.
 * - The male ApnaDairy specialist stays on the right (never cropped out);
 *   white copy sits over the dark left side under a controlled emerald overlay.
 * - Entrance ≈1.2s: image 1.04→1, headline line-by-line, description fade-up,
 *   staggered CTAs, announcement card slides up. Static under reduced motion.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const HERO_ALT =
  "ApnaDairy specialist in emerald workwear checking milk collection on a tablet at a partner dairy farm at sunrise";

function MaskedLine({
  children,
  delay,
  reduce,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  reduce: boolean;
  className?: string;
}) {
  if (reduce) return <span className={cn("block", className)}>{children}</span>;
  return (
    <span className="block overflow-hidden pb-[0.06em] -mb-[0.06em]">
      <motion.span
        className={cn("block", className)}
        initial={{ y: "112%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.72, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Rise({
  children,
  delay,
  reduce,
  className,
  y = 18,
}: {
  children: React.ReactNode;
  delay: number;
  reduce: boolean;
  className?: string;
  y?: number;
}) {
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.62, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function PloyHero() {
  const reduce = useReducedMotion() ?? false;

  // Preload the correct hero asset early (brief §3): the browser picks the
  // candidate that matches the viewport via imagesrcset/imagesizes.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.setAttribute(
      "imagesrcset",
      `${desktopWebp} 1672w, ${desktopWebp1200} 1200w, ${mobileWebp} 941w`,
    );
    link.setAttribute("imagesizes", "(min-width: 768px) 100vw, 100vw");
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const scrollToJourney = () => {
    document.getElementById("journey")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section aria-label="ApnaDairy — Pakistan's connected dairy network" className="px-3 pt-3 sm:px-6 sm:pt-6 lg:px-8">
      <div className="relative min-h-[calc(100svh-76px)] overflow-hidden rounded-[1.75rem] bg-brand-forest sm:min-h-[calc(100svh-110px)] sm:rounded-[2.5rem]">
        {/* Responsive hero image — full cover, no layout shift (container has fixed min-height) */}
        {reduce ? (
          <picture className="absolute inset-0 block h-full w-full">
            <source media="(min-width: 768px)" type="image/avif" srcSet={`${desktopAvif1200} 1200w, ${desktopAvif} 1672w`} />
            <source media="(min-width: 768px)" type="image/webp" srcSet={`${desktopWebp1200} 1200w, ${desktopWebp} 1672w`} />
            <source media="(min-width: 768px)" srcSet={desktopPng} />
            <source type="image/avif" srcSet={mobileAvif} />
            <source type="image/webp" srcSet={mobileWebp} />
            <img src={mobilePng} alt={HERO_ALT} className="h-full w-full object-cover [object-position:72%_center] md:[object-position:center]" fetchPriority="high" />
          </picture>
        ) : (
          <motion.picture
            className="absolute inset-0 block h-full w-full"
            initial={{ scale: 1.04 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2, ease: EASE }}
          >
            <source media="(min-width: 768px)" type="image/avif" srcSet={`${desktopAvif1200} 1200w, ${desktopAvif} 1672w`} />
            <source media="(min-width: 768px)" type="image/webp" srcSet={`${desktopWebp1200} 1200w, ${desktopWebp} 1672w`} />
            <source media="(min-width: 768px)" srcSet={desktopPng} />
            <source type="image/avif" srcSet={mobileAvif} />
            <source type="image/webp" srcSet={mobileWebp} />
            <img src={mobilePng} alt={HERO_ALT} className="h-full w-full object-cover [object-position:72%_center] md:[object-position:center]" fetchPriority="high" />
          </motion.picture>
        )}

        {/* Controlled dark emerald overlay — readability over the bright right side,
            copy sits on the already-dark left. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#05231b]/92 via-[#0B3D33]/55 to-[#0B3D33]/5"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#05231b]/80 via-transparent to-[#05231b]/20"
        />
        <div aria-hidden="true" className="grain-overlay absolute inset-0" />

        {/* Copy */}
        <div className="relative z-10 flex min-h-[inherit] flex-col justify-end px-6 pb-8 pt-24 sm:p-12 sm:pb-12 lg:p-16">
          <div className="max-w-3xl">
            <Rise delay={0.08} reduce={reduce}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#DDF06A] sm:text-xs sm:tracking-[0.24em]">
                Pakistan&apos;s connected dairy network
              </p>
            </Rise>
            <h1 className="display-xl mt-5 text-white">
              <MaskedLine delay={0.16} reduce={reduce}>Fresh milk</MaskedLine>
              <MaskedLine delay={0.26} reduce={reduce}>should never</MaskedLine>
              <MaskedLine delay={0.36} reduce={reduce}>
                be a <span className="text-[#DDF06A]">guess.</span>
              </MaskedLine>
            </h1>
            <Rise delay={0.58} reduce={reduce}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                ApnaDairy connects verified farms, traceable milk batches and AI-assisted
                freshness insights—from collection to delivery.
              </p>
            </Rise>
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Rise delay={0.72} reduce={reduce}>
                <Link to="/register" className="btn-pill-light h-12 px-7 text-[15px]">
                  Join the Network
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Rise>
              <Rise delay={0.8} reduce={reduce}>
                <Link
                  to="/how-it-works"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/35 px-7 text-[15px] font-semibold text-white transition-all duration-200 hover:border-white hover:bg-white/10"
                >
                  See How It Works
                </Link>
              </Rise>
            </div>
            <Rise delay={0.94} reduce={reduce} y={16}>
              <Link
                to="/freshness-engine"
                className="group mt-8 flex max-w-sm items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 pr-5 backdrop-blur-md transition-colors duration-200 hover:border-white/40 hover:bg-white/15 sm:mt-10"
                aria-label="Freshness engine — see what is behind every litre"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DDF06A] text-brand-forest">
                  <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-[#DDF06A]">
                    Freshness engine
                  </span>
                  <span className="mt-1 block text-sm font-medium leading-snug text-white">
                    See what is behind every litre.
                  </span>
                </span>
              </Link>
            </Rise>

            {/* Circular action — scrolls to the farm-to-table journey.
                In-flow on mobile (below the announcement card); floating
                bottom-right on larger screens. */}
            <div className="mt-8 sm:absolute sm:bottom-12 sm:right-12 sm:top-auto sm:mt-0 lg:right-16">
          {reduce ? (
            <button
              type="button"
              onClick={scrollToJourney}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:h-28 sm:w-28"
              aria-label="Explore the journey — scroll to the farm-to-table section"
            >
              <ArrowDown className="h-5 w-5" aria-hidden="true" />
              <span className="px-3 text-center text-[9px] font-bold uppercase leading-tight tracking-[0.14em] sm:text-[10px]">
                Explore the journey
              </span>
            </button>
          ) : (
            <motion.button
              type="button"
              onClick={scrollToJourney}
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.02, ease: EASE }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:h-28 sm:w-28"
              aria-label="Explore the journey — scroll to the farm-to-table section"
            >
              <motion.span
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
              >
                <ArrowDown className="h-5 w-5" aria-hidden="true" />
              </motion.span>
              <span className="px-3 text-center text-[9px] font-bold uppercase leading-tight tracking-[0.14em] sm:text-[10px]">
                Explore the journey
              </span>
            </motion.button>
          )}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
