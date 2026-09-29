import { FlaskConical, Thermometer, TriangleAlert } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { QueryState, StatusBadge } from "../../../features/portal/components";
import { useAiStatus, useBatches } from "../../../features/portal/apiCore";
import { DEMO_LABELS } from "../../../lib/constants";

export function AdminAIIoT() {
  const ai = useAiStatus();
  const batches = useBatches({ limit: 100 });

  const flagged = (batches.data ?? []).filter(
    (b) => b.spoilageRisk === "high" || (b.freshnessScore !== null && b.freshnessScore < 30),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="AI & IoT oversight"
        description="Model health and batches flagged by the freshness engine."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <FlaskConical className="h-5 w-5 text-brand" aria-hidden="true" /> AI engine status
          </h2>
          <p className="mt-1 text-xs text-muted">{DEMO_LABELS.ai}</p>
          <div className="mt-4">
            <QueryState
              isLoading={ai.isLoading}
              isError={ai.isError}
              error={ai.error}
              isEmpty={!ai.data}
              emptyTitle="Status unavailable"
              onRetry={() => ai.refetch()}
            >
              <dl className="space-y-2">
                {Object.entries(ai.data ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 rounded-xl bg-palegreen/50 px-4 py-2.5 text-sm">
                    <span className="font-medium text-muted">{k.replace(/_/g, " ")}</span>
                    <span className="font-semibold text-ink">{String(v)}</span>
                  </div>
                ))}
              </dl>
            </QueryState>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Thermometer className="h-5 w-5 text-brand" aria-hidden="true" /> IoT & freshness flags
          </h2>
          <p className="mt-1 text-xs text-muted">{DEMO_LABELS.iot} · batches with high spoilage risk or low freshness.</p>
          <div className="mt-4">
            <QueryState
              isLoading={batches.isLoading}
              isError={batches.isError}
              error={batches.error}
              isEmpty={flagged.length === 0}
              emptyTitle="No flags"
              emptyHint="No batches are currently flagged by the freshness engine."
              emptyIcon={<TriangleAlert className="h-7 w-7" aria-hidden="true" />}
              onRetry={() => batches.refetch()}
            >
              <ul className="space-y-3">
                {flagged.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded-2xl bg-danger/5 px-4 py-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-ink">{b.batchCode}</p>
                      <p className="text-xs text-muted">
                        {b.farmName ?? ""} · freshness {b.freshnessScore !== null ? `${Math.round(b.freshnessScore)}/100` : "—"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={b.status} />
                      {b.spoilageRisk && <StatusBadge status={b.spoilageRisk} />}
                    </div>
                  </li>
                ))}
              </ul>
            </QueryState>
          </div>
        </Card>
      </div>
    </div>
  );
}
