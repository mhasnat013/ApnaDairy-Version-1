import { Link } from "react-router-dom";
import { FlaskConical, Gauge, ShieldAlert, Thermometer } from "lucide-react";
import {
  EditorialHero,
  HeroCta,
  ColourBlock,
  EditorialSectionHead,
  DemoBadge,
} from "../../components/public/Editorial";
import { Reveal } from "../../components/ui/Reveal";
import { DEMO_LABELS } from "../../lib/constants";

const INPUTS = [
  "Time since milking (hours)",
  "Average, minimum and maximum temperature (°C)",
  "Temperature variability (standard deviation)",
  "Hours above 5°C and above 10°C",
  "Cold-chain breach (excursion) count",
];

const OUTPUTS = [
  {
    title: "Remaining shelf life",
    text: "Estimated fresh hours left for the batch, predicted from its temperature history.",
  },
  {
    title: "Spoilage risk",
    text: "Low, Medium or High — with the probability behind each class shown openly.",
  },
  {
    title: "Freshness score",
    text: "A 0–100 score derived from the model's confidence, shown with its meaning, not as a lab certificate.",
  },
  {
    title: "Adulteration screening",
    text: "Composition analysis flags added substances (bicarbonate, starch, sucrose and others) when detected.",
  },
  {
    title: "Anomaly flags",
    text: "Batches are flagged when spoilage risk is High, adulteration is detected, or the cold chain is breached.",
  },
];

export function FreshnessEngine() {
  return (
    <div>
      <EditorialHero
        eyebrow="Freshness engine"
        title={"AI that watches\nyour milk"}
        lede="Machine-learning models turn cold-chain sensor data into freshness insight — with probabilities, confidence levels and honest labels on every result."
        actions={
          <>
            <HeroCta to="/for-farmers" label="Open farmer experience" variant="light" />
            <HeroCta to="/for-farmers" label="For farmers" variant="outline" />
          </>
        }
        note={<DemoBadge label={DEMO_LABELS.ai} className="bg-white/10 text-ivory ring-white/25" />}
        media={
          <img
            src="/media/dairy-facility.png"
            alt="Verified dairy facility — batch intake"
            className="h-auto w-full object-cover"
            loading="eager"
          />
        }
        mediaCaption="Verified dairy facility — batch intake"
      />

      <ColourBlock tone="ivory">
        <EditorialSectionHead
          eyebrow="Inputs & outputs"
          title="What goes in, what comes out"
          lede="For each batch, the engine aggregates its sensor history into cold-chain features, then predicts freshness from them."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal className="card-lift rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-brand-pine">
                <Thermometer className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="font-condensed text-3xl uppercase leading-none text-ink">
                What goes in
              </h2>
            </div>
            <ul className="mt-5 space-y-2.5">
              {INPUTS.map((i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-ink">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  {i}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <DemoBadge label={DEMO_LABELS.iot} />
              <p className="mt-2 text-xs text-muted">
                Readings shown in this demo are simulated — the pipeline is real.
              </p>
            </div>
          </Reveal>

          <Reveal
            delay={0.08}
            className="card-lift rounded-2xl border border-brand/25 bg-white p-6 shadow-card sm:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
                <Gauge className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="font-condensed text-3xl uppercase leading-none text-ink">
                What comes out
              </h2>
            </div>
            <ul className="mt-5 space-y-4">
              {OUTPUTS.map((o) => (
                <li key={o.title}>
                  <h3 className="text-sm font-semibold text-ink">{o.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{o.text}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </ColourBlock>

      <ColourBlock tone="forest">
        <EditorialSectionHead
          dark
          eyebrow="Limits, stated plainly"
          title="What the engine doesn't claim"
          lede="Trust comes from honesty about limits. The freshness engine is a decision-support tool, not a laboratory."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-6 sm:p-7">
            <FlaskConical className="h-6 w-6 shrink-0 text-[#DDF06A]" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-ivory/70">
              Scores are <strong className="text-ivory">demonstration estimates</strong> from
              trained models — they are not laboratory certification, government verification,
              or a guarantee of shelf life.{" "}
              <strong className="text-ivory">
                Demonstration prediction — not laboratory certification.
              </strong>
            </p>
          </Reveal>
          <Reveal
            delay={0.08}
            className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-6 sm:p-7"
          >
            <ShieldAlert className="h-6 w-6 shrink-0 text-amber" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-ivory/70">
              Low-confidence predictions are flagged as{" "}
              <strong className="text-ivory">uncertain — retest</strong> rather than reported
              as fact. When the model isn&apos;t sure, we say so.
            </p>
          </Reveal>
        </div>
        <Reveal className="mt-10">
          <Link
            to="/for-farmers"
            className="btn-lift inline-flex h-12 items-center rounded-full bg-[#DDF06A] px-7 text-sm font-semibold text-brand-forest hover:brightness-105"
          >
            See how farmers use it
          </Link>
        </Reveal>
      </ColourBlock>
    </div>
  );
}
