import { Link } from "react-router-dom";
import { MapPin, Star, Store, BadgeCheck } from "lucide-react";
import {
  EditorialHero,
  HeroCta,
  ColourBlock,
  EditorialSectionHead,
} from "../../components/public/Editorial";
import { Reveal } from "../../components/ui/Reveal";
import { Counter } from "../../components/motion/Counter";
import { useFarms, type Farm } from "../../features/public/api";
import { QueryView } from "../../features/public/QueryView";

function FarmCard({ farm }: { farm: Farm }) {
  return (
    <Link
      to={`/farms/${farm.id}`}
      className="group card-lift rounded-2xl border border-line bg-white p-6 shadow-card hover:border-brand/40"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-brand-pine">
          <Store className="h-6 w-6" aria-hidden="true" />
        </span>
        {farm.ratingAvg !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2.5 py-1 text-xs font-semibold text-ink">
            <Star className="h-3.5 w-3.5 fill-amber text-amber" aria-hidden="true" />
            {farm.ratingAvg.toFixed(1)}
          </span>
        )}
      </div>
      <h2 className="mt-4 text-xl font-semibold text-ink group-hover:text-brand">
        {farm.name}
      </h2>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
        {farm.location}
      </p>
      {farm.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{farm.description}</p>
      )}
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-brand-pine">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Verified farm
      </span>
    </Link>
  );
}

export function Farms() {
  const query = useFarms();
  return (
    <div>
      <EditorialHero
        eyebrow="Network"
        title={"Verified farms"}
        lede="Every farm on ApnaDairy passes identity, document and location verification before selling a single litre."
        actions={<HeroCta to="/for-farmers" label="Join as a farmer" variant="outline" />}
      />

      <ColourBlock tone="ivory">
        <EditorialSectionHead
          eyebrow="The network"
          title="Meet the farms"
          lede="Verified farms, open records. Open any farm to see its identity, location and quality preview."
        />
        <QueryView
          query={query}
          emptyTitle="No farms listed yet"
          emptyHint="Verified farms will appear here once the network goes live."
          emptyIcon={<Store className="h-7 w-7" aria-hidden="true" />}
        >
          {(farms) => (
            <Reveal>
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm text-muted shadow-card">
                <span className="font-condensed text-xl text-brand">
                  <Counter value={farms.length} />
                </span>
                verified {farms.length === 1 ? "farm" : "farms"} in the network
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {farms.map((f) => (
                  <FarmCard key={f.id} farm={f} />
                ))}
              </div>
            </Reveal>
          )}
        </QueryView>
      </ColourBlock>
    </div>
  );
}
