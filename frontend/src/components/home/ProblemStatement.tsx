import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, MotionValue } from "framer-motion";
import { Activity, FlaskConical, Truck } from "lucide-react";
import { Reveal } from "../ui/Reveal";
import { DemoBadge } from "../public/Editorial";
import { DEMO_LABELS } from "../../lib/constants";
import { cn } from "../../lib/cn";

/**
 * Editorial problem statement (brief §10).
 * - Oversized condensed heading: "MILK REACHED THE MARKET. TRANSPARENCY DIDN'T."
 * - The second sentence reveals word-by-word from muted grey to deep emerald
 *   as the reader scrolls (static deep emerald under reduced motion).
 * - Three capability cards (Monitor / Predict / Deliver) with clearly labelled
 *   demo data — no fake statistics, no testimonials.
 */

function RevealWord({
  word,
  progress,
  range,
  reduce,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
  reduce: boolean;
}) {
  const color = useTransform(progress, range, ["#a9b3ae", "#0B3D33"]);
  return (
    <motion.span style={reduce ? { color: "#0B3D33" } : { color }} className="inline-block">
      {word}
      {"\u00A0"}
    </motion.span>
  );
}

function ScrollRevealSentence({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.5"],
  });
  const words = text.split(" ");
  return (
    <span ref={ref} className="block" aria-label={text}>
      {words.map((w, i) => (
        <RevealWord
          key={i}
          word={w}
          progress={scrollYProgress}
          range={[i / words.length, Math.min(1, (i + 1.5) / words.length)]}
          reduce={Boolean(reduce)}
        />
      ))}
    </span>
  );
}

const CAPABILITIES = [
  {
    icon: Activity,
    title: "Monitor",
    text: "IoT readings, collection time and batch conditions — one shared picture of the cold chain for farmers and customers.",
    demo: "Chiller A · 3.8°C · collected 06:12",
    badge: DEMO_LABELS.iot,
  },
  {
    icon: FlaskConical,
    title: "Predict",
    text: "Freshness score, shelf-life estimate, quality class and anomaly flags — shown with probabilities, never as certification.",
    demo: "Freshness 94/100 · ~38h remaining · Class A",
    badge: DEMO_LABELS.ai,
  },
  {
    icon: Truck,
    title: "Deliver",
    text: "Product listing, order fulfilment, delivery tracking and customer confirmation — every handoff recorded.",
    demo: "Batch AD-1042 · In transit · ETA 14:20",
    badge: "Demo data",
  },
];

export function ProblemStatement() {
  const reduce = useReducedMotion();
  return (
    <section aria-label="The problem ApnaDairy solves" className="bg-ivory">
      <div className="container-x py-20 sm:py-28">
        <Reveal>
          <p className="eyebrow">The problem</p>
        </Reveal>
        <h2 className="display-lg mt-4 max-w-5xl text-ink">
          <span className="block">Milk reached the market.</span>
          <ScrollRevealSentence text="Transparency didn't." />
        </h2>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Customers and businesses often cannot verify a milk batch&apos;s origin,
            storage conditions or freshness before they buy. ApnaDairy makes every
            litre traceable — from milking to doorstep.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:mt-16 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => (
            <Reveal
              key={c.title}
              delay={Math.min(i * 0.07, 0.25)}
              className={cn(
                "card-lift flex flex-col rounded-3xl border border-line bg-white p-7 shadow-card sm:p-8",
                !reduce && "transition-shadow",
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-brand-pine">
                <c.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="display mt-5 text-2xl uppercase text-ink">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{c.text}</p>
              <p className="mt-5 rounded-xl bg-palegreen px-4 py-3 font-tech text-xs text-brand-pine">
                {c.demo}
              </p>
              <div className="mt-3">
                <DemoBadge label={c.badge} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
