import {
  EditorialHero,
  HeroCta,
  ColourBlock,
  EditorialSectionHead,
  FeatureGrid,
  StepsList,
  CtaBand,
  DemoBadge,
} from "../../components/public/Editorial";
import { Reveal } from "../../components/ui/Reveal";
import { DEMO_LABELS } from "../../lib/constants";
import {
  ArrowLeftRight,
  ClipboardList,
  CreditCard,
  GitCompareArrows,
  Handshake,
  LineChart,
  PackageCheck,
  Building2,
  Hotel,
  Store,
} from "lucide-react";

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Bulk purchase requests",
    text: "Post a requirement once — quantity, product, target price and deadline — and receive structured quotations from verified farms.",
  },
  {
    icon: GitCompareArrows,
    title: "Side-by-side bid comparison",
    text: "Compare quotations on price, quantity, farm rating and freshness record. Accept the best bid in one click.",
  },
  {
    icon: Handshake,
    title: "Verified supplier directory",
    text: "Browse verified farms with capacity, products and quality previews. Build direct, long-term farm relationships.",
  },
  {
    icon: PackageCheck,
    title: "Bulk order tracking",
    text: "Follow accepted bids from fulfilment to delivery, with rider status updates at every stage.",
  },
  {
    icon: CreditCard,
    title: "Payment records",
    text: "Every bulk payment is recorded against its order with a clear history. Demo payments are simulated — no real money moves.",
  },
  {
    icon: LineChart,
    title: "Procurement analytics",
    text: "See spend, supplier performance and order patterns across your procurement — and plan the next quarter with data.",
  },
];

const STEPS = [
  {
    title: "Verify your business",
    text: "Register as a business and complete verification with your business documents.",
  },
  {
    title: "Post a requirement",
    text: "Describe the product, quantity, target price and deadline. Verified farms are notified.",
  },
  {
    title: "Compare quotations",
    text: "Farms respond with structured quotations. Compare price, quantity, ratings and freshness side by side.",
  },
  {
    title: "Accept and track",
    text: "Accept the winning bid and track fulfilment, pickup and delivery through your business portal.",
  },
];

export function ForBusinesses() {
  return (
    <div>
      <EditorialHero
        eyebrow="For businesses"
        title={"Procurement without\nthe phone tag"}
        lede="Post bulk requirements once and receive structured quotations from verified farms. Compare, accept, track — all in one place."
        actions={
          <>
            <HeroCta to="/register" label="Join as a business" variant="lime" />
            <HeroCta to="/login" label="Enter business portal" variant="outline" />
          </>
        }
        media={
          <div className="bg-brand-forest p-8 sm:p-10">
            <p className="font-condensed text-6xl uppercase leading-[0.9] text-[#DDF06A] sm:text-7xl">
              B2B
              <br />
              bidding
            </p>
            <div className="mt-6 space-y-3">
              {["Post requirement", "Receive quotations", "Compare & accept"].map((s, i) => (
                <div
                  key={s}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3"
                >
                  <span className="font-condensed text-2xl text-[#DDF06A]/60" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-medium text-ivory/85">{s}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-ivory/50">
              Illustrative flow — live quotations appear in your business portal.
            </p>
          </div>
        }
        mediaCaption="Structured B2B procurement, end to end"
      />

      <ColourBlock tone="ivory">
        <EditorialSectionHead
          eyebrow="Who it's for"
          title="Built for bulk buyers"
          lede="Restaurants, retailers, hotels and processors that need reliable, traceable dairy at scale — without chasing suppliers on the phone."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Store,
              title: "Retailers & shops",
              text: "Source fresh dairy in bulk with batch-level traceability you can show your own customers.",
            },
            {
              icon: Hotel,
              title: "Hotels & restaurants",
              text: "Lock in daily supply from verified farms with freshness scores on every delivery batch.",
            },
            {
              icon: Building2,
              title: "Processors",
              text: "Post large requirements, compare farm quotations, and plan intake with procurement analytics.",
            },
          ].map((w) => (
            <Reveal
              key={w.title}
              className="card-lift rounded-2xl border border-line bg-white p-6 shadow-card"
            >
              <w.icon className="h-7 w-7 text-brand" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold text-ink">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{w.text}</p>
            </Reveal>
          ))}
        </div>
      </ColourBlock>

      <ColourBlock tone="white">
        <EditorialSectionHead
          eyebrow="What you get"
          title="A procurement desk, not a phonebook"
          lede="Structured requests, comparable bids and tracked fulfilment — the whole bulk-buying workflow in one portal."
        />
        <FeatureGrid items={FEATURES} />
        <div className="mt-8 flex flex-wrap gap-2">
          <DemoBadge label={DEMO_LABELS.ai} />
          <DemoBadge label={DEMO_LABELS.payment} />
        </div>
      </ColourBlock>

      <ColourBlock tone="forest">
        <EditorialSectionHead
          dark
          eyebrow="How it works"
          title="From requirement to delivery"
          lede="Four steps from posting a bulk need to receiving verified dairy at your door."
        />
        <StepsList dark steps={STEPS} />
      </ColourBlock>

      <ColourBlock tone="sky">
        <Reveal className="mx-auto max-w-3xl text-center">
          <ArrowLeftRight className="mx-auto h-10 w-10 text-brand-pine" aria-hidden="true" />
          <h2 className="mt-4 font-condensed text-[clamp(1.8rem,4vw,3rem)] uppercase leading-[0.92] text-ink">
            Farmers quote. You choose.
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted">
            Every quotation shows the farm's verification status, rating and freshness record —
            so the cheapest bid and the best bid are easy to tell apart.
          </p>
        </Reveal>
      </ColourBlock>

      <CtaBand
        eyebrow="Join the network"
        title="Buy dairy like it matters"
        text="Register as a business, post your first bulk requirement, and let verified farms compete for it."
        primary={{ to: "/register", label: "Join as a business" }}
        secondary={{ to: "/how-it-works", label: "See how it works" }}
      />
    </div>
  );
}
