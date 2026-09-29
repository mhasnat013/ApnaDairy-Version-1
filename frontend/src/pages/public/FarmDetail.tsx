import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Star, Store, BadgeCheck } from "lucide-react";
import {
  EditorialHero,
  ColourBlock,
  EditorialSectionHead,
} from "../../components/public/Editorial";
import { LoadingState, EmptyState } from "../../components/ui/States";
import { Reveal } from "../../components/ui/Reveal";
import { useFarm } from "../../features/public/api";

export function FarmDetail() {
  const { farmId } = useParams();
  const query = useFarm(farmId);

  return (
    <div>
      <div className="px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="mx-auto w-full max-w-7xl">
          <Link
            to="/farms"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All farms
          </Link>
        </div>
      </div>

      {query.isLoading ? (
        <div className="container-x py-16">
          <LoadingState label="Loading farm…" />
        </div>
      ) : query.isError || !query.data ? (
        <div className="container-x py-16">
          <EmptyState
            icon={<Store className="h-7 w-7" aria-hidden="true" />}
            title="Farm not found"
            hint="This farm doesn't exist or isn't verified yet."
          />
        </div>
      ) : (
        <>
          <EditorialHero
            eyebrow="Verified farm"
            title={query.data.name}
            lede={query.data.description ?? undefined}
            actions={
              <span className="inline-flex items-center gap-2 rounded-full bg-[#DDF06A]/15 px-4 py-2 text-sm font-semibold text-[#DDF06A] ring-1 ring-[#DDF06A]/30">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                Verified by ApnaDairy
              </span>
            }
          />
          <ColourBlock tone="ivory">
            <EditorialSectionHead eyebrow="Farm profile" title="At a glance" />
            <div className="grid gap-5 lg:grid-cols-3">
              <Reveal className="card-lift rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8 lg:col-span-2">
                <h2 className="font-condensed text-3xl uppercase leading-none text-ink">About</h2>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                  <MapPin className="h-4 w-4" aria-hidden="true" /> {query.data.location}
                </p>
                {query.data.ratingAvg !== null && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Star className="h-4 w-4 fill-amber text-amber" aria-hidden="true" />
                    {query.data.ratingAvg.toFixed(1)} average rating
                  </p>
                )}
                {query.data.description && (
                  <p className="mt-4 leading-relaxed text-muted">{query.data.description}</p>
                )}
              </Reveal>
              <Reveal
                delay={0.08}
                className="card-lift rounded-2xl border border-brand/25 bg-white p-6 shadow-card sm:p-8"
              >
                <h2 className="font-condensed text-3xl uppercase leading-none text-ink">
                  Verified record
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  This profile shows the farm's verified identity, location and quality information.
                </p>
              </Reveal>
            </div>
          </ColourBlock>
        </>
      )}
    </div>
  );
}
