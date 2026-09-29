import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FlaskConical, TriangleAlert } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Field, FilterSelect, ProbBars, QueryState, ScoreRing, StatusBadge, fmtDateTime, inputCls } from "../../features/portal/components";
import { useBatchPredictions, useBatches, useMyFarm, usePredictAdulteration, usePredictFreshness } from "../../features/portal/apiCore";
import { DEMO_LABELS } from "../../lib/constants";

// Adulteration model features — backend expects the CAPITALIZED aliases as JSON keys.
const ADULTERATION_FIELDS = ["Cells", "QValue", "Fat", "Protein", "Lactose", "Solids", "FFA", "Citrate", "FrzPoint", "SNF", "MUN", "Casein"] as const;

const DEFAULT_ADULTERATION: Record<string, number> = {
  Cells: 120, QValue: 0.8, Fat: 4.2, Protein: 3.4, Lactose: 4.8, Solids: 12.6,
  FFA: 0.9, Citrate: 170, FrzPoint: -0.54, SNF: 8.6, MUN: 14, Casein: 2.7,
};

const freshnessSchema = z.object({
  timeSinceMilkingHours: z.coerce.number().min(0),
  avgTemperatureC: z.coerce.number(),
  minTemperatureC: z.coerce.number(),
  maxTemperatureC: z.coerce.number(),
  temperatureStdC: z.coerce.number().min(0),
  timeAbove5cHours: z.coerce.number().min(0),
  timeAbove10cHours: z.coerce.number().min(0),
  temperatureExcursions: z.coerce.number().min(0),
});

type FreshnessValues = z.infer<typeof freshnessSchema>;

export function FarmerAI() {
  const { myFarm } = useMyFarm();
  const batches = useBatches({ farmId: myFarm?.id, limit: 50 });
  const [batchId, setBatchId] = useState<number | undefined>(undefined);
  const activeBatchId = batchId ?? batches.data?.[0]?.id;
  const predictions = useBatchPredictions(activeBatchId);

  const predictAdulteration = usePredictAdulteration();
  const predictFreshness = usePredictFreshness();
  const [adultFeatures, setAdultFeatures] = useState<Record<string, number>>(DEFAULT_ADULTERATION);

  const { register, handleSubmit, formState: { errors } } = useForm<FreshnessValues>({
    resolver: zodResolver(freshnessSchema),
    defaultValues: {
      timeSinceMilkingHours: 6, avgTemperatureC: 4, minTemperatureC: 3.2, maxTemperatureC: 5.1,
      temperatureStdC: 0.6, timeAbove5cHours: 0.5, timeAbove10cHours: 0, temperatureExcursions: 1,
    },
  });

  const runAdulteration = () => predictAdulteration.mutate(adultFeatures);

  const submitFreshness = (v: FreshnessValues) =>
    predictFreshness.mutate({
      timeSinceMilkingHours: v.timeSinceMilkingHours,
      avgTemperatureC: v.avgTemperatureC,
      minTemperatureC: v.minTemperatureC,
      maxTemperatureC: v.maxTemperatureC,
      temperatureStdC: v.temperatureStdC,
      timeAbove5cHours: v.timeAbove5cHours,
      timeAbove10cHours: v.timeAbove10cHours,
      temperatureExcursions: v.temperatureExcursions,
    });

  const setFeature = (k: string, raw: string) => {
    const n = Number(raw);
    if (!Number.isNaN(n)) setAdultFeatures((f) => ({ ...f, [k]: n }));
  };

  return (
    <div>
      <PageHeader
        eyebrow="AI engine"
        title="AI freshness"
        description={`${DEMO_LABELS.ai} — shelf-life estimates, spoilage risk and adulteration screening.`}
      />

      <div className="mb-6 max-w-xs">
        <FilterSelect
          value={String(activeBatchId ?? "")}
          onChange={(v) => setBatchId(v ? Number(v) : undefined)}
          label="Select batch for saved predictions"
          options={(batches.data ?? []).map((b) => ({ value: String(b.id), label: b.batchCode }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Adulteration screening */}
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <FlaskConical className="h-5 w-5 text-brand" aria-hidden="true" /> Milk composition screening
          </h2>
          <p className="mt-1 text-xs text-muted">
            Enter lab composition values. {DEMO_LABELS.ai}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ADULTERATION_FIELDS.map((k) => (
              <label key={k} className="block">
                <span className="mb-1 block text-xs font-semibold text-ink">{k}</span>
                <input
                  type="number"
                  step="any"
                  value={adultFeatures[k]}
                  onChange={(e) => setFeature(k, e.target.value)}
                  className={inputCls + " h-10 px-3"}
                  aria-label={`Composition value ${k}`}
                />
              </label>
            ))}
          </div>
          <Button className="mt-4" onClick={runAdulteration} loading={predictAdulteration.isPending}>
            Run adulteration screening
          </Button>
          {predictAdulteration.isError && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">Prediction failed. Please try again.</p>
          )}
          {predictAdulteration.data && (
            <div className="mt-5 rounded-2xl bg-palegreen/50 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={predictAdulteration.data.adulterationStatus} />
                {predictAdulteration.data.isUncertain && (
                  <Badge tone="amber"><TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> Uncertain — retest advised</Badge>
                )}
              </div>
              {predictAdulteration.data.uncertaintyNote && (
                <p className="mt-2 text-xs text-muted">{predictAdulteration.data.uncertaintyNote}</p>
              )}
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-ink">Adulteration probabilities</h3>
                <ProbBars probs={predictAdulteration.data.adulterationProbabilities} />
              </div>
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-ink">Detected adulterant: {predictAdulteration.data.adulterant}</h3>
                <ProbBars probs={predictAdulteration.data.adulterantProbabilities} />
              </div>
              <p className="mt-4 text-xs text-muted">{predictAdulteration.data.disclaimer}</p>
            </div>
          )}
        </Card>

        {/* Freshness prediction */}
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <FlaskConical className="h-5 w-5 text-brand" aria-hidden="true" /> Freshness & shelf life
          </h2>
          <p className="mt-1 text-xs text-muted">
            Cold-chain features from your IoT readings. {DEMO_LABELS.ai}
          </p>
          <form onSubmit={handleSubmit(submitFreshness)} className="mt-4 grid grid-cols-2 gap-3">
            {(
              [
                ["timeSinceMilkingHours", "Hours since milking"],
                ["avgTemperatureC", "Avg temp (°C)"],
                ["minTemperatureC", "Min temp (°C)"],
                ["maxTemperatureC", "Max temp (°C)"],
                ["temperatureStdC", "Temp std dev"],
                ["timeAbove5cHours", "Hours above 5°C"],
                ["timeAbove10cHours", "Hours above 10°C"],
                ["temperatureExcursions", "Excursions"],
              ] as Array<[keyof FreshnessValues, string]>
            ).map(([name, label]) => (
              <Field key={name} label={label} error={errors[name]?.message}>
                <input {...register(name)} type="number" step="any" className={inputCls + " h-10 px-3"} />
              </Field>
            ))}
            <div className="col-span-2">
              <Button type="submit" loading={predictFreshness.isPending}>Predict freshness</Button>
            </div>
          </form>
          {predictFreshness.isError && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">Prediction failed. Please try again.</p>
          )}
          {predictFreshness.data && (
            <div className="mt-5 rounded-2xl bg-palegreen/50 p-5">
              <div className="flex items-center gap-4">
                <ScoreRing score={predictFreshness.data.freshnessScore} />
                <div>
                  <p className="font-display text-lg font-semibold text-ink">{predictFreshness.data.qualityClass}</p>
                  <p className="text-sm text-muted">~{Math.round(predictFreshness.data.remainingShelfLifeHours)}h shelf life</p>
                  <div className="mt-1 flex gap-2">
                    <StatusBadge status={predictFreshness.data.spoilageRisk} />
                    {predictFreshness.data.anomalyDetected && <StatusBadge status="anomaly" />}
                  </div>
                </div>
              </div>
              {predictFreshness.data.anomalyReasons.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-ink">
                  {predictFreshness.data.anomalyReasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-ink">Spoilage probabilities</h3>
                <ProbBars probs={predictFreshness.data.spoilageProbabilities} />
              </div>
              {predictFreshness.data.isUncertain && predictFreshness.data.uncertaintyNote && (
                <p className="mt-3 text-xs text-muted">{predictFreshness.data.uncertaintyNote}</p>
              )}
              <p className="mt-3 text-xs text-muted">{predictFreshness.data.disclaimer}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Saved predictions for the batch */}
      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Saved predictions</h2>
        <div className="mt-3">
          <QueryState
            isLoading={predictions.isLoading}
            isError={predictions.isError}
            isEmpty={!predictions.data || predictions.data.length === 0}
            emptyTitle="No saved predictions"
            emptyHint="Run “Run AI scoring” on a batch to store a prediction."
            onRetry={() => predictions.refetch()}
          >
            <ul className="divide-y divide-line">
              {(predictions.data ?? []).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <span className="text-muted">{fmtDateTime(p.predictedAt)}</span>
                  <span className="font-semibold text-ink">
                    {p.freshnessScore !== null ? `${Math.round(p.freshnessScore)}/100` : "—"} · {p.qualityClass ?? "—"}
                  </span>
                  <div className="flex gap-2">
                    {p.anomalyFlag && <StatusBadge status="anomaly" />}
                    <span className="text-xs text-muted">{p.modelVersion ?? ""}</span>
                  </div>
                </li>
              ))}
            </ul>
          </QueryState>
        </div>
      </Card>
    </div>
  );
}
