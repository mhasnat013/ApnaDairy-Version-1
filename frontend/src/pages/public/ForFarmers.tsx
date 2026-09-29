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
  BarChart3,
  ClipboardList,
  Gauge,
  Thermometer,
  Truck,
} from "lucide-react";

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Digital batch records",
    text: "Record every milking with time, quantity and storage temperature. Each batch gets a unique traceable code that follows it to the customer.",
  },
  {
    icon: Thermometer,
    title: "IoT cold-chain monitoring",
    text: "Temperature sensors watch your milk from collection to handover. Excursions and breaches are flagged automatically.",
  },
  {
    icon: Gauge,
    title: "AI freshness scores",
    text: "Machine-learning models turn your cold-chain data into a freshness score and shelf-life estimate — proof of quality you can show buyers.",
  },
  {
    icon: BarChart3,
    title: "Production analytics",
    text: "Track production, freshness and wastage over time. See where handling can improve and where milk is being lost.",
  },
];

const STEPS = [
  {
    title: "Register your farm",
    text: "Create a farmer account and complete onboarding: identity, documents and your farm's location.",
  },
  {
    title: "Get verified",
    text: "The ApnaDairy team reviews your application and verifies your farm. Verified farms carry the network badge.",
  },
  {
    title: "Record batches",
    text: "Log each milking with time, quantity and storage temperature — sensors stream readings where installed.",
  },
  {
    title: "Improve with evidence",
    text: "Use sensor history and AI freshness estimates to improve handling and reduce avoidable waste.",
  },
];

export function ForFarmers() {
  return (
    <div>
      <EditorialHero
        eyebrow="For farmers"
        title={"Your farm,\nconnected to better data"}
        lede="Record batches, monitor quality and use AI-supported freshness insights to improve daily dairy operations."
        actions={
          <>
            <HeroCta to="/register" label="Register your farm" variant="lime" />
            <HeroCta to="/login" label="Enter farmer portal" variant="outline" />
          </>
        }
        media={
          <img
            src="/media/farmer-hero.png"
            alt="Dairy farmer in shalwar kameez and cap reviewing batch data on a tablet with an ApnaDairy specialist"
            className="h-auto w-full object-cover"
            loading="eager"
          />
        }
        mediaCaption="Verified farm onboarding — batch intake at a partner dairy"
      />

      <ColourBlock tone="ivory">
        <EditorialSectionHead
          eyebrow="Who it's for"
          title="Built for the people who milk"
          lede="ApnaDairy is made for dairy farmers across Pakistan who want practical records, monitored handling and clearer freshness insight."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: BadgeCheck,
              title: "Smallholder farms",
              text: "Turn daily milkings into verifiable, traceable batches and reach buyers beyond your village.",
            },
            {
              icon: Truck,
              title: "Dairy operations",
              text: "Manage multiple batches, cold-chain readings and bulk orders from one farmer portal.",
            },
            {
              icon: BadgeCheck,
              title: "Farm cooperatives",
              text: "Pool collection under one verified identity and split earnings with transparent records.",
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
          title="Four tools, one portal"
          lede="Practical tools for a data-backed dairy operation — from the milking shed to monitored handoff."
        />
        <FeatureGrid items={FEATURES} />
        <div className="mt-8 flex flex-wrap gap-2">
          <DemoBadge label={DEMO_LABELS.iot} />
          <DemoBadge label={DEMO_LABELS.ai} />
        </div>
      </ColourBlock>

      <ColourBlock tone="forest">
        <EditorialSectionHead
          dark
          eyebrow="How it works"
          title="From registration to better decisions"
          lede="Four clear steps connect farm records, monitoring and AI-supported quality decisions."
        />
        <StepsList dark steps={STEPS} />
      </ColourBlock>

      <CtaBand
        eyebrow="Join the network"
        title="Your milk deserves proof"
        text="Register as a farmer, get verified, and start building reliable batch and freshness records."
        primary={{ to: "/register", label: "Register your farm" }}
        secondary={{ to: "/how-it-works", label: "See how it works" }}
      />
    </div>
  );
}
