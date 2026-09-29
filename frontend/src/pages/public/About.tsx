import { Milk, ShieldCheck, ScanSearch, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import {
  EditorialHero,
  HeroCta,
  ColourBlock,
  EditorialSectionHead,
  FeatureGrid,
} from "../../components/public/Editorial";
import { Reveal } from "../../components/ui/Reveal";
import { BRAND } from "../../lib/constants";

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Trust over claims",
    text: "We show farm records, sensor histories and model confidence — and we label estimates as estimates. Proof beats marketing.",
  },
  {
    icon: ScanSearch,
    title: "Traceability by default",
    text: "Every batch carries a unique code from milking to doorstep. If it can't be traced, it doesn't ship.",
  },
  {
    icon: FlaskConical,
    title: "Science, honestly applied",
    text: "AI predicts freshness; screening flags adulteration. We publish what the models can and can't do.",
  },
  {
    icon: Milk,
    title: "Fairness for farmers",
    text: "Transparent pricing and direct market access mean farmers keep the value their milk deserves.",
  },
];

export function About() {
  return (
    <div>
      <EditorialHero
        eyebrow="About"
        title={"Freshness you\ncan trust"}
        lede={BRAND.subline}
        actions={
          <>
            <HeroCta to="/how-it-works" label="How the network works" variant="light" />
            <HeroCta to="/contact" label="Get in touch" variant="outline" />
          </>
        }
      />

      <ColourBlock tone="ivory">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-moss">
              Why ApnaDairy exists
            </p>
            <h2 className="mt-4 font-condensed text-[clamp(2rem,4.5vw,3.5rem)] uppercase leading-[0.92] text-ink">
              The problem was never the milk
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-lg leading-relaxed text-muted">
              Milk changes hands many times between farm and home, and at each step nobody can
              say where it&apos;s been or how fresh it is. ApnaDairy replaces that opacity with
              a connected network: verified farms, batch-level traceability, IoT cold-chain
              monitoring, and AI freshness prediction — so every glass comes with its story.
            </p>
          </Reveal>
        </div>
      </ColourBlock>

      <ColourBlock tone="white">
        <EditorialSectionHead
          eyebrow="What we stand for"
          title="Values, not slogans"
        />
        <FeatureGrid items={VALUES} />
      </ColourBlock>

      <ColourBlock tone="forest">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#DDF06A]">
            The network
          </p>
          <h2 className="mt-4 font-condensed text-[clamp(2.2rem,5vw,4rem)] uppercase leading-[0.9] text-ivory">
            Verified farms. Traceable batches. Honest numbers.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/how-it-works"
              className="btn-lift inline-flex h-12 items-center rounded-full bg-[#DDF06A] px-7 text-sm font-semibold text-brand-forest hover:brightness-105"
            >
              How the network works
            </Link>
            <Link
              to="/contact"
              className="btn-lift inline-flex h-12 items-center rounded-full border border-white/30 px-7 text-sm font-semibold text-ivory hover:border-white hover:bg-white/10"
            >
              Get in touch
            </Link>
          </div>
        </Reveal>
      </ColourBlock>
    </div>
  );
}
