import { Link } from "react-router-dom";
import { ArrowRight, Milk, BadgeCheck, Handshake, Truck } from "lucide-react";
import { PloyHero } from "../../components/home/PloyHero";
import { HeroEcosystem } from "../../components/home/HeroEcosystem";
import { ProblemStatement } from "../../components/home/ProblemStatement";
import { JourneySection } from "../../components/home/JourneySection";
import { HonestMarquee } from "../../components/motion/Marquee";
import { Reveal } from "../../components/ui/Reveal";
import { WipeImage } from "../../components/motion/Parallax";
import {
  ColourBlock,
  CtaBand,
  DemoBadge,
  EditorialSectionHead,
  HeroCta,
} from "../../components/public/Editorial";
import { DEMO_LABELS } from "../../lib/constants";

/**
 * Homepage (Ploy-inspired rebuild, Agent 2: hero + homepage).
 * Order: hero → marquee → ecosystem → problem statement → freshness engine
 * (deep-emerald takeover) → farm-to-table journey → film placeholder →
 * role doors → lime closing CTA.
 */

const ENGINE_CARDS = [
  {
    code: "M-01",
    title: "Shelf-life estimate",
    text: "Remaining fresh hours predicted from temperature history.",
    demo: "Batch AD-1042 · ~38h remaining",
    badge: DEMO_LABELS.ai,
  },
  {
    code: "M-02",
    title: "Spoilage risk",
    text: "Low, Medium or High classification with per-class probabilities.",
    demo: "Risk: Low · confidence 0.91",
    badge: DEMO_LABELS.ai,
  },
  {
    code: "M-03",
    title: "Adulteration screening",
    text: "Composition analysis flags added substances when detected.",
    demo: "Tank 3.6°C · transit 4.1°C",
    badge: DEMO_LABELS.iot,
  },
];

const ROLE_ROWS = [
  { to: "/for-farmers", title: "Farmers", text: "Record batches, monitor your cold chain and sell to homes and businesses.", icon: Milk },
  { to: "/for-customers", title: "Customers", text: "Shop verified dairy, manage orders and set up daily subscriptions.", icon: BadgeCheck },
  { to: "/for-businesses", title: "Businesses", text: "Post bulk requirements and compare quotations from verified farms.", icon: Handshake },
  { to: "/for-delivery-riders", title: "Delivery riders", text: "Get assignments, confirm pickups and track your delivery route.", icon: Truck },
];

export function Home() {
  return (
    <>
      <PloyHero />
      <HonestMarquee />

      {/* Interactive ecosystem — the orbit dial, below the hero (§7) */}
      <HeroEcosystem />

      {/* Editorial problem statement + capability cards (§10) */}
      <ProblemStatement />

      {/* Freshness engine — deep-emerald colour-block takeover */}
      <ColourBlock tone="forest" rounded className="overflow-hidden">
        <EditorialSectionHead
          dark
          eyebrow="Freshness engine"
          title="AI that watches your milk."
          lede="Machine-learning models estimate remaining shelf life and spoilage risk from cold-chain data — shown with probabilities and confidence, and always labelled as a demonstration estimate."
        />
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <Reveal>
            <figure className="rounded-3xl border border-white/10 bg-white/[0.06] p-3">
              <WipeImage
                src="/media/dairy-facility.png"
                alt="Milk bottle and steel cans inside a modern ApnaDairy facility"
                imgClassName="aspect-[4/3] w-full object-cover"
                overlay={
                  <span className="absolute left-4 top-4 rounded-full bg-ivory/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-pine backdrop-blur">
                    {DEMO_LABELS.iot}
                  </span>
                }
              />
              <figcaption className="px-2 pb-1 pt-3 text-xs text-ivory/60">
                Verified dairy facility — batch intake
              </figcaption>
            </figure>
          </Reveal>
          <div className="grid gap-4">
            {ENGINE_CARDS.map((c, i) => (
              <Reveal
                key={c.title}
                delay={Math.min(i * 0.07, 0.25)}
                className="card-lift rounded-2xl border border-white/10 bg-white/[0.06] p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="display text-xl uppercase text-ivory">{c.title}</h3>
                  <span aria-hidden="true" className="font-tech text-xs text-[#DDF06A]">
                    {c.code}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ivory/65">{c.text}</p>
                <p className="mt-3 font-tech text-xs text-ivory/50">{c.demo}</p>
                <div className="mt-3">
                  <DemoBadge label={c.badge} className="bg-white/10 text-ivory ring-white/20" />
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.2}>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <HeroCta to="/freshness-engine" label="Explore the freshness engine" variant="lime" />
                <p className="text-xs text-ivory/50">{DEMO_LABELS.ai} — not laboratory certification.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </ColourBlock>

      {/* Farm-to-table journey (§11) */}
      <JourneySection />

      {/* Who it's for */}
      <ColourBlock tone="white" rounded>
        <EditorialSectionHead
          eyebrow="Who it's for"
          title="One network, four doors."
          lede="ApnaDairy serves everyone in the dairy chain — each with a portal built for their work."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {ROLE_ROWS.map((c, i) => (
            <Reveal key={c.to} delay={Math.min(i * 0.06, 0.25)}>
              <Link
                to={c.to}
                className="group flex h-full items-center gap-5 rounded-2xl border border-line bg-ivory p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lift"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mint text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                  <c.icon className="h-7 w-7" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="display block text-xl uppercase text-ink">{c.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{c.text}</span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-brand opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </ColourBlock>

      {/* Closing CTA — controlled lime accent */}
      <CtaBand
        eyebrow="Join the network"
        title="Trust, not claims."
        text="Verified farms. Monitored batches. Monitored cold chain. Start as a customer, farmer, business or rider."
        primary={{ to: "/register", label: "Join ApnaDairy" }}
        secondary={{ to: "/marketplace", label: "Browse the marketplace" }}
      />
    </>
  );
}
