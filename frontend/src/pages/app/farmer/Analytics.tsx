import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { QueryState, ScoreRing, StatCard, fmtDate } from "../../../features/portal/components";
import { useBatches, useFarmerOverview, useMyFarm } from "../../../features/portal/apiCore";
import { useOrders } from "../../../features/portal/apiCommerce";
import { formatPKR } from "../../../lib/formatters";

const BRAND = "#087857";

export function FarmerAnalytics() {
  const { myFarm } = useMyFarm();
  const overview = useFarmerOverview();
  const batches = useBatches({ farmId: myFarm?.id, limit: 200 });
  const orders = useOrders();

  const myOrders = useMemo(
    () => (orders.data ?? []).filter((o) => o.items.some((i) => i.farmId === myFarm?.id) && o.status !== "cancelled"),
    [orders.data, myFarm],
  );

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of myOrders) {
      if (!o.orderDate) continue;
      const key = new Date(o.orderDate).toLocaleDateString("en-PK", { month: "short", year: "numeric" });
      map.set(key, (map.get(key) ?? 0) + o.items.filter((i) => i.farmId === myFarm?.id).reduce((s, i) => s + i.price * i.quantity, 0));
    }
    return [...map.entries()].map(([month, revenue]) => ({ month, revenue: Math.round(revenue) }));
  }, [myOrders, myFarm]);

  const freshnessByBatch = useMemo(
    () =>
      (batches.data ?? [])
        .filter((b) => b.freshnessScore !== null)
        .slice(0, 20)
        .reverse()
        .map((b) => ({ code: b.batchCode.slice(-6), score: Math.round(b.freshnessScore ?? 0) })),
    [batches.data],
  );

  const chartHeight = "h-64";

  return (
    <div>
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Your farm's performance across batches, orders and revenue."
      />
      <QueryState
        isLoading={overview.isLoading || batches.isLoading || orders.isLoading}
        isError={overview.isError || batches.isError || orders.isError}
        isEmpty={false}
        emptyTitle="No data"
        onRetry={() => { overview.refetch(); batches.refetch(); orders.refetch(); }}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total batches" value={overview.data?.totalBatches ?? 0} />
          <StatCard label="Products listed" value={overview.data?.totalProducts ?? 0} />
          <StatCard label="Total revenue" value={formatPKR(overview.data?.totalRevenue ?? 0)} />
          <StatCard label="Active orders" value={overview.data?.activeOrders ?? 0} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Revenue by month</h2>
            <p className="mt-1 text-xs text-muted">From orders containing your products.</p>
            {revenueByMonth.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No revenue recorded yet.</p>
            ) : (
              <div className={`${chartHeight} mt-4 w-full`} role="img" aria-label="Revenue by month chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByMonth} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCE8DF" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [formatPKR(Number(v)), "Revenue"]} />
                    <Bar dataKey="revenue" fill={BRAND} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">Freshness per batch</h2>
                <p className="mt-1 text-xs text-muted">AI freshness score by batch.</p>
              </div>
              {overview.data?.avgFreshnessScore !== null && overview.data?.avgFreshnessScore !== undefined && (
                <div className="flex items-center gap-2">
                  <ScoreRing score={overview.data.avgFreshnessScore} size={52} />
                </div>
              )}
            </div>
            {freshnessByBatch.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No scored batches yet.</p>
            ) : (
              <div className={`${chartHeight} mt-4 w-full`} role="img" aria-label="Freshness per batch chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={freshnessByBatch} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCE8DF" />
                    <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip formatter={(v) => [`${v}/100`, "Freshness"]} />
                    <Line type="monotone" dataKey="score" stroke={BRAND} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Recent orders</h2>
          {myOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {myOrders.slice(0, 8).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="font-semibold text-ink">Order #{o.id}</span>
                  <span className="text-muted">{fmtDate(o.orderDate)} · {o.status}</span>
                  <span className="font-bold text-brand">
                    {formatPKR(o.items.filter((i) => i.farmId === myFarm?.id).reduce((s, i) => s + i.price * i.quantity, 0))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </QueryState>
    </div>
  );
}
