import { Link } from "react-router-dom";
import { Clock, Gauge, MapPin, Sparkles } from "lucide-react";
import {
  EditorialHero,
  HeroCta,
  ColourBlock,
  EditorialSectionHead,
  DemoBadge,
} from "../../components/public/Editorial";
import { Reveal } from "../../components/ui/Reveal";
import { DEMO_LABELS } from "../../lib/constants";

const FACTORS = [
  {
    icon: Clock,
    title: "Time since milking",
    text: "Freshly collected milk is priced at its best; the price adjusts as the batch ages so older batches sell faster instead of spoiling.",
  },
  {
    icon: Gauge,
    title: "Freshness score",
    text: "Batches with higher AI freshness scores hold their price; lower scores unlock discounts that move stock before quality drops.",
  },
  {
    icon: MapPin,
    title: "Distance & delivery",
    text: "Closer farms and efficient routes mean fresher milk at a fairer price — the algorithm accounts for logistics cost.",
  },
  {
    icon: Sparkles,
    title: "Demand patterns",
    text: "Seasonal demand and order volume tune prices so farmers earn fairly and customers never overpay for yesterday's milk.",
  },
];

const TIERS = [
  {
    name: "Fresh",
    accent: "text-brand",
    chip: "bg-brand/10 text-brand-pine ring-brand/25",
    text: "Just milked and cold-chained. Full price — the best the batch will ever be.",
    example: "Rs 180 / litre",
  },
  {
    name: "Medium",
    accent: "text-amber",
    chip: "bg-amber/15 text-ink ring-amber/40",
    text: "A day into its journey, still well within safe limits. A modest freshness discount keeps it moving.",
    example: "Rs 165 / litre",
  },
  {
    name: "Near expiry",
    accent: "text-danger",
    chip: "bg-danger/10 text-danger ring-danger/25",
    text: "Approaching the end of its predicted shelf life. Deep discount — drink soon, waste nothing.",
    example: "Rs 140 / litre",
  },
];

export function DynamicPricing() {
  return (
    <div>
      <EditorialHero
        eyebrow="Dynamic pricing"
        title={"Fair prices that move\nwith freshness"}
        lede="Milk is a living product — its value changes by the hour. ApnaDairy prices reflect real freshness, not flat guesswork."
        actions={
          <HeroCta to="/marketplace" label="Browse live-priced dairy" variant="light" />
        }
        note={<DemoBadge label={DEMO_LABELS.ai} className="bg-white/10 text-ivory ring-white/25" />}
      />

      <ColourBlock tone="ivory">
        <EditorialSectionHead
          eyebrow="The factors"
          title="Four signals set the price"
          lede="The pricing engine reads the batch's real condition — not a spreadsheet guess — and farmers approve every final price."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACTORS.map((f, i) => (
            <Reveal
              key={f.title}
              delay={Math.min(i * 0.06, 0.2)}
              className="card-lift rounded-2xl border border-line bg-white p-6 shadow-card"
            >
              <f.icon className="h-7 w-7 text-brand" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-semibold text-ink">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
            </Reveal>
          ))}
        </div>
      </ColourBlock>

      <ColourBlock tone="white">
        <EditorialSectionHead
          eyebrow="The tiers"
          title="Fresh, medium, near expiry"
          lede="Shelf-life-based discounting moves milk before it spoils — farmers earn, customers save, waste drops."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal
              key={t.name}
              delay={Math.min(i * 0.07, 0.2)}
              className="card-lift rounded-2xl border border-line bg-ivory p-6 shadow-card sm:p-8"
            >
              <span
                className={`inline-flex rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ring-1 ${t.chip}`}
              >
                {t.name}
              </span>
              <p className="mt-4 text-sm leading-relaxed text-muted">{t.text}</p>
              <p className="mt-5 font-condensed text-4xl uppercase text-ink">
                <span className="text-sm text-muted">e.g.</span> {t.example}
              </p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-6">
          <DemoBadge label={DEMO_LABELS.ai} />
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
            Example prices above are illustrative demonstrations of the tier logic, not live
            market prices. Live listings in the marketplace show the real computed price and
            its breakdown.
          </p>
        </Reveal>
      </ColourBlock>

      <ColourBlock tone="forest">
        <EditorialSectionHead
          dark
          eyebrow="How it works"
          title="Transparent, rule-based, human-approved"
          lede="A pricing engine computes a recommended price from the factors above. Farmers always see the breakdown and approve the final price — nothing changes silently."
        />
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Engine computes", text: "The model combines freshness, age, distance and demand into a recommended price." },
            { title: "Farmer reviews", text: "The farmer sees the full breakdown and can accept or adjust within fair bounds." },
            { title: "Customer sees why", text: "Listings show the factors behind the price — so a discount is a freshness signal, not a mystery." },
          ].map((s, i) => (
            <Reveal
              as="li"
              key={s.title}
              delay={Math.min(i * 0.07, 0.2)}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 sm:p-7"
            >
              <span
                aria-hidden="true"
                className="font-condensed text-4xl tracking-wide text-[#DDF06A]/40"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-ivory">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ivory/65">{s.text}</p>
            </Reveal>
          ))}
        </ol>
        <Reveal className="mt-10">
          <Link
            to="/marketplace"
            className="btn-lift inline-flex h-12 items-center gap-2 rounded-full bg-[#DDF06A] px-7 text-sm font-semibold text-brand-forest hover:brightness-105"
          >
            Browse live-priced dairy
          </Link>
        </Reveal>
      </ColourBlock>
    </div>
  );
}
