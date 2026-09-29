import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FlaskConical, Thermometer } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { DetailRow, QueryState, ScoreRing, StatusBadge, fmtDateTime } from "../../features/portal/components";
import { useBatch, useBatchPredictions, useReadings, useScoreBatch, useSimulateReadings } from "../../features/portal/apiCore";
import { DEMO_LABELS } from "../../lib/constants";

export function FarmerBatchDetail() {
  const rawId = useParams().id;
  const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : undefined;
  const batch = useBatch(id);
  const predictions = useBatchPredictions(id);
  const readings = useReadings(id);
  const score = useScoreBatch();
  const simulate = useSimulateReadings();
  const [scoreError, setScoreError] = useState<string | null>(null);

  const runScore = async () => {
    if (id === undefined) return;
    setScoreError(null);
    try {
      await score.mutateAsync(id);
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : "Scoring failed.");
    }
  };

  const latest = batch.data?.latestPrediction;

  return (
    <div>
      <Link to="/app/farmer/batches" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to batches
      </Link>
      <QueryState
        isLoading={batch.isLoading}
        isError={batch.isError}
        error={batch.error}
        isEmpty={!batch.data}
        emptyTitle="Batch not found"
        onRetry={() => batch.refetch()}
      >
        {batch.data && (
          <div>
            <PageHeader
              eyebrow={`Batch ${batch.data.batchCode}`}
              title={batch.data.batchCode}
              description={`${batch.data.farmName ?? ""} · milked ${fmtDateTime(batch.data.milkingTime)}`}
              actions={
                <Button onClick={runScore} loading={score.isPending}>
                  <FlaskConical className="h-4 w-4" aria-hidden="true" /> Run AI scoring
                </Button>
              }
            />
            {scoreError && <p role="alert" className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{scoreError}</p>}

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold text-ink">Batch record</h2>
                <dl className="mt-4">
                  <DetailRow label="Quantity">{batch.data.quantityLiters} L</DetailRow>
                  <DetailRow label="Status"><StatusBadge status={batch.data.status} /></DetailRow>
                  <DetailRow label="Initial temp">{batch.data.initialStorageTemp !== null ? `${batch.data.initialStorageTemp}°C` : "—"}</DetailRow>
                  <DetailRow label="Collected">{fmtDateTime(batch.data.collectionTime)}</DetailRow>
                  <DetailRow label="Spoilage risk">{batch.data.spoilageRisk ? <StatusBadge status={batch.data.spoilageRisk} /> : "—"}</DetailRow>
                </dl>
              </Card>

              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold text-ink">AI freshness</h2>
                <p className="mt-1 text-xs text-muted">{DEMO_LABELS.ai}</p>
                <div className="mt-4 flex items-center gap-4">
                  <ScoreRing score={batch.data.freshnessScore} />
                  <div className="text-sm">
                    <p className="font-semibold text-ink">{latest?.qualityClass ?? "Not scored yet"}</p>
                    {latest?.predictedShelfLifeHours !== null && latest?.predictedShelfLifeHours !== undefined && (
                      <p className="mt-1 text-muted">~{Math.round(latest.predictedShelfLifeHours)}h shelf life</p>
                    )}
                    {latest?.anomalyFlag && <StatusBadge status="anomaly" className="mt-2" />}
                  </div>
                </div>
                {(predictions.data ?? []).length > 0 && (
                  <div className="mt-4 border-t border-line pt-4">
                    <h3 className="text-sm font-semibold text-ink">Prediction history</h3>
                    <ul className="mt-2 space-y-2">
                      {(predictions.data ?? []).slice(0, 4).map((p) => (
                        <li key={p.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted">{fmtDateTime(p.predictedAt)}</span>
                          <span className="font-semibold text-ink">
                            {p.freshnessScore !== null ? `${Math.round(p.freshnessScore)}/100` : "—"} · {p.qualityClass ?? ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                  <Thermometer className="h-5 w-5 text-brand" aria-hidden="true" /> IoT readings
                </h2>
                <p className="mt-1 text-xs text-muted">{DEMO_LABELS.iot} · {(readings.data ?? []).length} readings</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  loading={simulate.isPending}
                  onClick={() => id !== undefined && simulate.mutate({ batchId: id, body: { hoursBack: 24, intervalMinutes: 30, baseTempC: 4 } })}
                >
                  Simulate 24h of readings
                </Button>
                <Link to="/app/farmer/iot" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
                  Open IoT monitor →
                </Link>
              </Card>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
