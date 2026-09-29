import { useState } from "react";
import { Building2, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { QueryState, ScoreRing, StatusBadge, fmtDate } from "../../features/portal/components";
import { useFarms, usePendingFarms, useVerifyFarm } from "../../features/portal/apiCore";

export function AdminFarms() {
  const pending = usePendingFarms();
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified" | "rejected">("all");
  const all = useFarms({ limit: 100, verificationStatus: statusFilter });
  const verify = useVerifyFarm();

  const decide = (id: number, verificationStatus: "verified" | "rejected") =>
    verify.mutate({ id, verificationStatus });

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Farms"
        description="Verify new farms and oversee every farm on the network."
      />
      <div className="mb-6 flex gap-2">
        {(
          [
            ["pending", `Pending (${pending.data?.length ?? 0})`],
            ["all", "All farms"],
          ] as Array<["pending" | "all", string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === key ? "bg-brand text-white" : "bg-white text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pending" ? (
        <QueryState
          isLoading={pending.isLoading}
          isError={pending.isError}
          error={pending.error}
          isEmpty={!pending.data || pending.data.length === 0}
          emptyTitle="Queue is clear"
          emptyHint="No farms waiting for verification."
          emptyIcon={<Building2 className="h-7 w-7" aria-hidden="true" />}
          onRetry={() => pending.refetch()}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {(pending.data ?? []).map((f) => (
              <Card key={f.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold text-ink">{f.name}</p>
                    <p className="text-sm text-muted">{f.location}</p>
                  </div>
                  <Badge tone="amber">Pending</Badge>
                </div>
                {f.description && <p className="mt-2 line-clamp-3 text-sm text-muted">{f.description}</p>}
                <p className="mt-2 text-xs text-muted">
                  {f.capacityLiters ? `${f.capacityLiters} L/day · ` : ""}Registered {fmtDate(f.createdAt)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => decide(f.id, "verified")} loading={verify.isPending}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Approve
                  </Button>
                  <Button variant="outline" size="sm" className="text-danger" onClick={() => decide(f.id, "rejected")} loading={verify.isPending}>
                    <XCircle className="h-4 w-4" aria-hidden="true" /> Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </QueryState>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <label htmlFor="farm-status-filter" className="text-sm font-medium text-muted">
              Status
            </label>
            <select
              id="farm-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <QueryState
            isLoading={all.isLoading}
            isError={all.isError}
            error={all.error}
            isEmpty={!all.data || all.data.length === 0}
            emptyTitle="No farms"
            onRetry={() => all.refetch()}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(all.data ?? []).map((f) => (
                <Card key={f.id} className="flex items-center gap-4 p-5">
                  <ScoreRing score={f.ratingAvg !== null ? f.ratingAvg * 20 : null} size={52} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-ink">{f.name}</p>
                    <p className="truncate text-xs text-muted">{f.location}</p>
                    <div className="mt-1"><StatusBadge status={f.verificationStatus} /></div>
                  </div>
                </Card>
              ))}
            </div>
          </QueryState>
        </>
      )}
    </div>
  );
}
