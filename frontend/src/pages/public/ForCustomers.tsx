import { Link } from "react-router-dom";
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
  BadgeCheck,
  CalendarClock,
  Gauge,
  MessageCircleHeart,
  ShoppingBasket,
  Tag,
  UserRound,
  UsersRound,
  Baby,
} from "lucide-react";

const FEATURES = [
  {
    icon: BadgeCheck,
    title: "Verified farm products",
    text: "Every listing comes from a farm that passed identity, document and location verification. No anonymous milk.",
  },
  {
    icon: Gauge,
    title: "Freshness score on every listing",
    text: "AI turns each batch's cold-chain history into a 0–100 freshness score with spoilage risk and quality class — shown openly, never as lab certification.",
  },
  {
    icon: BadgeCheck,
    title: "Clear farm and batch origin",
    text: "Product information shows the verified farm and recorded milk batch so buyers can understand where their dairy came from.",
  },
  {
    icon: CalendarClock,
    title: "Subscriptions",
    text: "Set up daily or weekly milk delivery and manage, pause or cancel it anytime from your customer portal.",
  },
  {
    icon: Tag,
    title: "Transparent pricing",
    text: "Dynamic pricing reflects real freshness — you can see why a batch is discounted, and farmers approve every price.",
  },
  {
    icon: MessageCircleHeart,
    title: "Complaints & support",
    text: "Raise a complaint from your portal, track its resolution, and rate every farm and delivery.",
  },
];

const STEPS = [
  {
    title: "Create an account",
    text: "Join as a customer in under two minutes — email, phone and a password.",
  },
  {
    title: "Browse verified dairy",
    text: "Shop products from verified farms with freshness scores, shelf-life estimates and quality classes on every listing.",
  },
  {
    title: "Review product details",
    text: "Check the verified farm, batch information, freshness score and availability before ordering.",
  },
  {
    title: "Subscribe & save",
    text: "Set up daily delivery, track orders in real time, and manage everything from your portal.",
  },
];

export function ForCustomers() {
  return (
    <div>
      <EditorialHero
        eyebrow="For customers"
        title={"Milk you can verify,\nnot just buy"}
        lede="Shop fresh dairy from verified farms, review its origin and freshness information, and order with confidence."
        actions={
          <>
            <HeroCta to="/marketplace" label="Browse the marketplace" variant="light" />
            <HeroCta to="/register" label="Create an account" variant="lime" />
          </>
        }
        media={
          <img
            src="/media/dairy-facility.png"
            alt="Fresh milk bottle and stainless steel can at a verified dairy facility"
            className="h-auto w-full object-cover"
            loading="eager"
          />
        }
        mediaCaption="Every product ships with its batch record"
      />

      <ColourBlock tone="ivory">
        <EditorialSectionHead
          eyebrow="Who it's for"
          title="For households that care"
          lede="From daily doodh for the family to ghee and paneer for the kitchen — ApnaDairy is for anyone who wants to know exactly what they're buying."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: UserRound,
              title: "Households",
              text: "Daily fresh milk with full traceability — see the farm, the batch and the freshness record behind every litre.",
            },
            {
              icon: UsersRound,
              title: "Health-conscious buyers",
              text: "Adulteration screening and spoilage-risk flags on every batch, labelled honestly as demonstration estimates.",
            },
            {
              icon: Baby,
              title: "Families with children",
              text: "Know your milk's cold-chain history and quality class before it reaches your table.",
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
          title="Shopping with receipts"
          lede="Every product carries its farm, its batch, its price logic and its freshness record. Nothing to take on faith."
        />
        <FeatureGrid items={FEATURES} />
        <div className="mt-8 flex flex-wrap gap-2">
          <DemoBadge label={DEMO_LABELS.ai} />
          <DemoBadge label={DEMO_LABELS.payment} />
        </div>
        <Reveal className="mt-8 rounded-2xl border border-brand/25 bg-palegreen p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
              <ShoppingBasket className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-ink">Preview freely, purchase with an account</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Browse products and open any product page without signing in.
                Checkout unlocks after login — no account, no purchase.
              </p>
            </div>
            <Link
              to="/login"
              className="btn-lift inline-flex h-12 shrink-0 items-center rounded-full bg-brand-forest px-7 text-sm font-semibold text-ivory hover:bg-brand-pine"
            >
              Sign in to purchase
            </Link>
          </div>
        </Reveal>
      </ColourBlock>

      <ColourBlock tone="forest">
        <EditorialSectionHead
          dark
          eyebrow="How it works"
          title="From signup to doorstep"
          lede="Four steps to milk with a story you can check yourself."
        />
        <StepsList dark steps={STEPS} />
      </ColourBlock>

      <CtaBand
        eyebrow="Join the network"
        title="Know your milk"
        text="Create a customer account, browse verified dairy, and trace your first batch today."
        primary={{ to: "/register", label: "Create an account" }}
        secondary={{ to: "/marketplace", label: "Browse dairy" }}
      />
    </div>
  );
}
