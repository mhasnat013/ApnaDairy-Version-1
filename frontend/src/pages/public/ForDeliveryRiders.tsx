import {
  EditorialHero,
  HeroCta,
  ColourBlock,
  EditorialSectionHead,
  FeatureGrid,
  StepsList,
  CtaBand,
} from "../../components/public/Editorial";
import { Reveal } from "../../components/ui/Reveal";
import {
  ClipboardCheck,
  History,
  LifeBuoy,
  MapPin,
  Navigation,
  PackageCheck,
  Route,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "Clear daily assignments",
    text: "Deliveries are assigned to you each day with pickup and drop-off details — no confusion about what goes where.",
  },
  {
    icon: PackageCheck,
    title: "Pickup confirmation",
    text: "Confirm pickup at the farm or hub with one tap, and verify the batch codes before you leave.",
  },
  {
    icon: Route,
    title: "Route guidance",
    text: "Follow your active route stop by stop, with addresses and order details for every delivery.",
  },
  {
    icon: Zap,
    title: "One-tap status updates",
    text: "Move each delivery through its lifecycle — Assigned, Accepted, Heading to Pickup, Picked Up, In Transit, Arrived, Delivered — as it happens.",
  },
  {
    icon: History,
    title: "Delivery history",
    text: "Your completed deliveries build a permanent record: on-time performance, completed routes and earnings history.",
  },
  {
    icon: LifeBuoy,
    title: "Direct support channel",
    text: "Stuck at a pickup, a failed delivery, or a reschedule? Reach support straight from the rider portal.",
  },
];

const STEPS = [
  {
    title: "Join the fleet",
    text: "Register as a delivery rider and complete verification with your identity documents and vehicle details.",
  },
  {
    title: "Get assignments",
    text: "Deliveries are assigned to you each day. Accept them and plan your route from the rider dashboard.",
  },
  {
    title: "Pick up & deliver",
    text: "Confirm pickup at the farm or hub, follow your route, and confirm each delivery — including failed or rescheduled attempts.",
  },
  {
    title: "Track your record",
    text: "Completed deliveries build your history and reliability record across the network.",
  },
];

const STATUSES = [
  "Assigned",
  "Accepted",
  "Heading to Pickup",
  "Picked Up",
  "In Transit",
  "Arrived",
  "Delivered",
  "Failed",
  "Rescheduled",
];

export function ForDeliveryRiders() {
  return (
    <div>
      <EditorialHero
        eyebrow="For delivery riders"
        title={"Deliveries,\norganized"}
        lede="Receive assignments, confirm pickups, follow your route and update delivery status — everything a rider needs in one portal."
        actions={
          <>
            <HeroCta to="/register" label="Join the fleet" variant="lime" />
            <HeroCta to="/login" label="Enter rider portal" variant="outline" />
          </>
        }
        media={
          <div className="bg-brand-forest p-8 sm:p-10">
            <p className="font-condensed text-6xl uppercase leading-[0.9] text-[#DDF06A] sm:text-7xl">
              Cold-chain
              <br />
              courier
            </p>
            <div className="mt-6 flex items-center gap-3 text-ivory/85">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DDF06A]/15 text-[#DDF06A]">
                <Navigation className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-sm leading-relaxed">
                Refrigerated pickups, verified batch codes, and a route that makes sense.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {STATUSES.slice(0, 6).map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-ivory/70"
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-6 text-xs text-ivory/50">
              Real delivery statuses from the rider portal.
            </p>
          </div>
        }
        mediaCaption="The rider's day, in one portal"
      />

      <ColourBlock tone="ivory">
        <EditorialSectionHead
          eyebrow="Who it's for"
          title="For riders who keep it cold"
          lede="Whether you ride a bike or drive a refrigerated van, the rider portal turns a chaotic delivery day into a clear sequence of stops."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: MapPin,
              title: "City riders",
              text: "Dense urban routes with multiple household drops — each with an address, order and status.",
            },
            {
              icon: Navigation,
              title: "Inter-city drivers",
              text: "Longer farm-to-hub and hub-to-business runs with pickup confirmation at both ends.",
            },
            {
              icon: PackageCheck,
              title: "Cold-chain couriers",
              text: "Refrigerated deliveries where temperature and timing matter — and the record proves it.",
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
          title="A dashboard for the road"
          lede="Six tools that keep pickups, routes and statuses under control — from first assignment to final drop."
        />
        <FeatureGrid items={FEATURES} />
      </ColourBlock>

      <ColourBlock tone="forest">
        <EditorialSectionHead
          dark
          eyebrow="How it works"
          title="From signup to first delivery"
          lede="Four steps to your first paid route on the ApnaDairy network."
        />
        <StepsList dark steps={STEPS} />
        <Reveal className="mt-10 rounded-2xl border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-ivory">Every delivery, tracked honestly</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ivory/65">
            Customers follow their order through the same statuses you set. Mark a delivery
            failed or rescheduled when it happens — the record stays truthful for everyone.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <span
                key={s}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-ivory/80"
              >
                {s}
              </span>
            ))}
          </div>
        </Reveal>
      </ColourBlock>

      <CtaBand
        eyebrow="Join the fleet"
        title="Ride with the network"
        text="Register as a delivery rider, complete verification, and start receiving assignments."
        primary={{ to: "/register", label: "Join as a rider" }}
        secondary={{ to: "/how-it-works", label: "See how it works" }}
      />
    </div>
  );
}
