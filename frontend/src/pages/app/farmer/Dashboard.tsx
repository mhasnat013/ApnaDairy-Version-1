import { Link } from "react-router-dom";
import { FlaskConical, Milk, ShoppingCart, Thermometer, TriangleAlert } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { QueryState, ScoreRing, StatCard, StatusBadge, fmtDate } from "../../../features/portal/components";
import { useBatches, useFarmerOverview, useMyFarm } from "../../../features/portal/apiCore";
import { useComplaints } from "../../../features/portal/apiEngagement";
import { useOrders } from "../../../features/portal/apiCommerce";
import { formatPKR } from "../../../lib/formatters";

export function FarmerDashboard() {
  const overview = useFarmerOverview();
  const { myFarm } = useMyFarm();
  const batches = useBatches({ farmId: myFarm?.id, limit: 5 });
  const complaints = useComplaints("open");
  const orders = useOrders();

  const myOrders = (orders.data ?? []).filter((o) =>
    o.items.some((i) => i.farmId === myFarm?.id),
  ).slice(0, 5);
  const recentBatches = (batches.data ?? []).slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="Farmer portal"
        title={myFarm ? myFarm.name : "Farm dashboard"}
        description={myFarm ? `${myFarm.location} · ${myFarm.verificationStatus}` : "Your farm at a glance — batches, orders and freshness."}
        actions={
          !myFarm ? (
            <Link to="/app/farmer/onboarding"><Button>Set up your farm</Button></Link>
          ) : (
            <Link to="/app/farmer/batches"><Button>Record batch</Button></Link>
          )
        }
      />
      {!myFarm ? (
        <Card className="p-8 text-center">
          <Milk className="mx-auto h-10 w-10 text-brand" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl font-semibold text-ink">No farm registered yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Register your farm to start recording milk batches, connecting IoT sensors and listing products.
          </p>
          <Link to="/app/farmer/onboarding" className="mt-4 inline-block">
            <Button>Start farm onboarding</Button>
          </Link>
        </Card>
      ) : (
        <>
          <QueryState
            isLoading={overview.isLoading}
            isError={overview.isError}
            isEmpty={!overview.data}
            emptyTitle="Dashboard unavailable"
            onRetry={() => overview.refetch()}
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total batches" value={overview.data?.totalBatches ?? 0} icon={<Milk className="h-5 w-5" aria-hidden="true" />} to="/app/farmer/batches" />
              <StatCard label="Active orders" value={overview.data?.activeOrders ?? 0} icon={<ShoppingCart className="h-5 w-5" aria-hidden="true" />} to="/app/farmer/orders" />
              <StatCard label="Revenue" value={formatPKR(overview.data?.totalRevenue ?? 0)} icon={<ShoppingCart className="h-5 w-5" aria-hidden="true" />} to="/app/farmer/analytics" />
              <StatCard label="Open complaints" value={overview.data?.openComplaints ?? 0} icon={<TriangleAlert className="h-5 w-5" aria-hidden="true" />} to="/app/farmer/complaints" />
            </div>
          </QueryState>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                  <Thermometer className="h-5 w-5 text-brand" aria-hidden="true" /> Latest batches
                </h2>
                <Link to="/app/farmer/batches" className="text-sm font-semibold text-brand hover:underline">View all</Link>
              </div>
              <QueryState
                isLoading={batches.isLoading}
                isError={batches.isError}
                isEmpty={recentBatches.length === 0}
                emptyTitle="No batches yet"
                emptyHint="Record your first milking batch."
                onRetry={() => batches.refetch()}
              >
                <ul className="divide-y divide-line">
                  {recentBatches.map((b) => (
                    <li key={b.id}>
                      <Link to={`/app/farmer/batches/${b.id}`} className="flex items-center gap-4 py-3">
                        <ScoreRing score={b.freshnessScore} size={52} />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm font-semibold text-ink">{b.batchCode}</p>
                          <p className="text-xs text-muted">{b.quantityLiters} L · {fmtDate(b.milkingTime)}</p>
                        </div>
                        <StatusBadge status={b.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </QueryState>
            </Card>
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                  <FlaskConical className="h-5 w-5 text-brand" aria-hidden="true" /> Needs attention
                </h2>
              </div>
              <QueryState
                isLoading={complaints.isLoading}
                isError={complaints.isError}
                isEmpty={!complaints.data || complaints.data.length === 0}
                emptyTitle="All clear"
                emptyHint="No open complaints on your farm."
                onRetry={() => complaints.refetch()}
              >
                <ul className="space-y-3">
                  {(complaints.data ?? []).slice(0, 5).map((c) => (
                    <li key={c.id} className="rounded-2xl bg-palegreen/50 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{c.subject}</p>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted">{fmtDate(c.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              </QueryState>
              {myOrders.length > 0 && (
                <div className="mt-6 border-t border-line pt-4">
                  <h3 className="text-sm font-semibold text-ink">Incoming orders</h3>
                  <ul className="mt-2 divide-y divide-line">
                    {myOrders.map((o) => (
                      <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                        <Link to="/app/farmer/orders" className="font-semibold text-brand hover:underline">Order #{o.id}</Link>
                        <StatusBadge status={o.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
