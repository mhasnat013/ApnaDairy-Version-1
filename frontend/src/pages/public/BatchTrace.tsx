import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Gauge, MapPin, ScanSearch, Thermometer } from "lucide-react";
import {
  EditorialHero,
  ColourBlock,
  EditorialSectionHead,
  DemoBadge,
} from "../../components/public/Editorial";
import { LoadingState, EmptyState } from "../../components/ui/States";
import { Badge } from "../../components/ui/Badge";
import { Reveal } from "../../components/ui/Reveal";
import { useBatchTrace } from "../../features/public/api";
import { batchCodeSchema, type BatchCodeInput } from "../../lib/schemas";
import { DEMO_LABELS } from "../../lib/constants";

const inputClass =
  "h-12 w-full rounded-xl border border-line bg-white px-4 text-sm uppercase tracking-[0.08em] text-ink placeholder:normal-case placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

export function BatchTrace() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BatchCodeInput>({ resolver: zodResolver(batchCodeSchema) });

  const onSubmit = (data: BatchCodeInput) => {
    navigate(`/batch-trace/${encodeURIComponent(data.batchCode.trim().toUpperCase())}`);
  };

  return (
    <div>
      <EditorialHero
        eyebrow="Traceability"
        title={"Trace a batch"}
        lede="Enter the batch code printed on your product to see its farm, journey and freshness record."
        note={<DemoBadge label={DEMO_LABELS.ai} className="bg-white/10 text-ivory ring-white/25" />}
      />
      <ColourBlock tone="ivory">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8"
              noValidate
            >
              <label htmlFor="batchCode" className="text-xs font-bold uppercase tracking-[0.18em] text-brand-moss">
                Batch code
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  id="batchCode"
                  {...register("batchCode")}
                  placeholder="e.g. AD-2026-000123"
                  autoComplete="off"
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-lift inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-8 text-sm font-semibold text-white transition-colors hover:bg-brand-pine disabled:opacity-60"
                >
                  <ScanSearch className="h-4 w-4" aria-hidden="true" />
                  Trace
                </button>
              </div>
              {errors.batchCode && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {errors.batchCode.message}
                </p>
              )}
              <p className="mt-4 text-xs text-muted">
                The batch code is printed on the product label and on your order receipt.
              </p>
            </form>
          </Reveal>
        </div>
      </ColourBlock>
    </div>
  );
}

export function BatchTraceResult() {
  const { batchCode } = useParams();
  const query = useBatchTrace(batchCode);

  return (
    <div>
      <div className="px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="mx-auto w-full max-w-7xl">
          <Link
            to="/batch-trace"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Trace another batch
          </Link>
        </div>
      </div>
      {query.isLoading ? (
        <div className="container-x py-16">
          <LoadingState label={`Looking up ${batchCode}…`} />
        </div>
      ) : query.isError || !query.data ? (
        <div className="container-x py-16">
          <EmptyState
            icon={<ScanSearch className="h-7 w-7" aria-hidden="true" />}
            title={`No record for “${batchCode}”`}
            hint="Check the code on your label and try again. Batches from before the network launch won't have records."
          />
        </div>
      ) : (
        (() => {
          const b = query.data;
          return (
            <>
              <EditorialHero
                eyebrow="Batch record"
                title={b.batchCode}
                actions={
                  <Badge tone={b.status === "delivered" ? "mint" : "sky"}>{b.status}</Badge>
                }
                note={
                  <div className="flex flex-wrap gap-2">
                    <DemoBadge label={DEMO_LABELS.ai} className="bg-white/10 text-ivory ring-white/25" />
                    <DemoBadge label={DEMO_LABELS.iot} className="bg-white/10 text-ivory ring-white/25" />
                  </div>
                }
              />
              <ColourBlock tone="ivory">
                <EditorialSectionHead
                  eyebrow="Traceability timeline"
                  title="The batch's story"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Reveal className="card-lift rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
                    <h2 className="flex items-center gap-2 font-condensed text-2xl uppercase text-ink">
                      <MapPin className="h-5 w-5 text-brand" aria-hidden="true" /> Origin farm
                    </h2>
                    <p className="mt-3 text-lg font-semibold text-ink">{b.farmName}</p>
                    <p className="text-sm text-muted">{b.farmLocation}</p>
                    <p className="mt-3 text-sm text-muted">
                      Milked <span className="font-medium text-ink">{b.milkingTime}</span> ·{" "}
                      {b.quantityLiters} litres
                    </p>
                  </Reveal>
                  <Reveal
                    delay={0.07}
                    className="card-lift rounded-2xl border border-brand/25 bg-white p-6 shadow-card sm:p-8"
                  >
                    <h2 className="flex items-center gap-2 font-condensed text-2xl uppercase text-ink">
                      <Gauge className="h-5 w-5 text-brand" aria-hidden="true" /> Freshness record
                    </h2>
                    {b.freshnessScore !== null ? (
                      <p className="mt-3 font-condensed text-6xl text-ink">
                        {b.freshnessScore}
                        <span className="text-2xl text-muted">/100</span>
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-muted">Score not yet available.</p>
                    )}
                    {b.spoilageRisk && (
                      <p className="mt-1 text-sm text-muted">
                        Spoilage risk: <strong className="text-ink">{b.spoilageRisk}</strong>
                      </p>
                    )}
                  </Reveal>
                </div>
                <Reveal className="mt-4 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
                  <h2 className="flex items-center gap-2 font-condensed text-2xl uppercase text-ink">
                    <Thermometer className="h-5 w-5 text-brand" aria-hidden="true" /> Cold-chain history
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    {b.readingCount} sensor readings recorded for this batch.
                  </p>
                  <div className="mt-3">
                    <DemoBadge label={DEMO_LABELS.iot} />
                  </div>
                </Reveal>
                <Reveal className="mt-8">
                  <Link
                    to="/freshness-engine"
                    className="btn-lift inline-flex h-12 items-center rounded-full bg-brand px-7 text-sm font-semibold text-white hover:bg-brand-pine"
                  >
                    How the engine works
                  </Link>
                </Reveal>
              </ColourBlock>
            </>
          );
        })()
      )}
    </div>
  );
}
