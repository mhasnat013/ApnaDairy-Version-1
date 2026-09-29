import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { QueryState, StatCard } from "../../features/portal/components";
import { useAdminOverview, usePlatformOverview } from "../../features/portal/apiCore";
import { formatPKR } from "../../lib/formatters";

export function AdminAnalytics() {
  const overview = useAdminOverview();
  const platform = usePlatformOverview();

  // Only primitive values are renderable generically — object values (e.g. usersByRole)
  // are handled separately below so they never render as "[object Object]".
  const primitiveEntries = Object.entries(platform.data ?? {}).filter(
    ([, v]) => typeof v === "number" || typeof v === "string",
  );
  const platformEntries = primitiveEntries.slice(0, 12);
  const chartData = platformEntries
    .filter(([, v]) => typeof v === "number")
    .slice(0, 8)
    .map(([k, v]) => ({ name: k.replace(/_/g, " ").slice(0, 14), value: Number(v) }));
  const usersByRole = platform.data?.usersByRole;
  const roleEntries =
    usersByRole && typeof usersByRole === "object"
      ? Object.entries(usersByRole).filter(([, v]) => typeof v === "number")
      : [];

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Analytics"
        description="Platform growth and revenue at a glance."
      />
      <QueryState
        isLoading={overview.isLoading || platform.isLoading}
        isError={overview.isError || platform.isError}
        isEmpty={false}
        emptyTitle="No data"
        onRetry={() => { overview.refetch(); platform.refetch(); }}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total revenue" value={formatPKR(overview.data?.totalRevenue ?? 0)} />
          <StatCard label="Users" value={overview.data?.totalUsers ?? 0} />
          <StatCard label="Farms" value={overview.data?.totalFarms ?? 0} />
          <StatCard label="Orders" value={overview.data?.totalOrders ?? 0} />
          <StatCard label="Batches" value={overview.data?.totalBatches ?? 0} />
          <StatCard label="Active subscriptions" value={overview.data?.activeSubscriptions ?? 0} />
          <StatCard label="Open complaints" value={overview.data?.openComplaints ?? 0} />
          <StatCard label="Pending farms" value={overview.data?.pendingFarms ?? 0} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Platform metrics</h2>
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No numeric metrics returned.</p>
            ) : (
              <div className="mt-4 h-64 w-full" role="img" aria-label="Platform metrics chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCE8DF" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={52} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#087857" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Metric values</h2>
            <ul className="mt-4 space-y-2">
              {platformEntries.length === 0 && <li className="text-sm text-muted">No metrics returned.</li>}
              {platformEntries.map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-3 rounded-xl bg-palegreen/50 px-4 py-2.5 text-sm">
                  <span className="font-medium text-muted">{k.replace(/_/g, " ")}</span>
                  <span className="font-bold text-ink">{typeof v === "number" && k.toLowerCase().includes("revenue") ? formatPKR(v) : String(v)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {roleEntries.length > 0 && (
          <Card className="mt-6 p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Users by role</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {roleEntries.map(([role, count]) => (
                <li key={role} className="rounded-xl bg-palegreen/50 px-4 py-3 text-sm">
                  <p className="font-medium capitalize text-muted">{role}</p>
                  <p className="font-display text-2xl font-bold text-ink">{count}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}

      </QueryState>
    </div>
  );
}
