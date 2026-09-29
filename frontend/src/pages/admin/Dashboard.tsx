import { Link } from "react-router-dom";
import { Building2, Milk, ShoppingCart, TriangleAlert, Users, Wallet } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { QueryState, StatCard } from "../../features/portal/components";
import { useAdminOverview, usePendingFarms } from "../../features/portal/apiCore";
import { formatPKR } from "../../lib/formatters";

export function AdminDashboard() {
  const overview = useAdminOverview();
  const pending = usePendingFarms();

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Platform overview"
        description="The whole ApnaDairy marketplace at a glance."
      />
      <QueryState
        isLoading={overview.isLoading}
        isError={overview.isError}
        error={overview.error}
        isEmpty={!overview.data}
        emptyTitle="Dashboard unavailable"
        onRetry={() => overview.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Users" value={overview.data?.totalUsers ?? 0} icon={<Users className="h-5 w-5" aria-hidden="true" />} to="/app/admin/users" />
          <StatCard label="Farms" value={overview.data?.totalFarms ?? 0} icon={<Building2 className="h-5 w-5" aria-hidden="true" />} to="/app/admin/farms" />
          <StatCard label="Batches" value={overview.data?.totalBatches ?? 0} icon={<Milk className="h-5 w-5" aria-hidden="true" />} to="/app/admin/operations" />
          <StatCard label="Orders" value={overview.data?.totalOrders ?? 0} icon={<ShoppingCart className="h-5 w-5" aria-hidden="true" />} to="/app/admin/operations" />
          <StatCard label="Revenue" value={formatPKR(overview.data?.totalRevenue ?? 0)} icon={<Wallet className="h-5 w-5" aria-hidden="true" />} to="/app/admin/analytics" />
          <StatCard label="Pending farms" value={overview.data?.pendingFarms ?? 0} icon={<Building2 className="h-5 w-5" aria-hidden="true" />} to="/app/admin/farms" />
          <StatCard label="Open complaints" value={overview.data?.openComplaints ?? 0} icon={<TriangleAlert className="h-5 w-5" aria-hidden="true" />} to="/app/admin/support" />
          <StatCard label="Subscriptions" value={overview.data?.activeSubscriptions ?? 0} icon={<ShoppingCart className="h-5 w-5" aria-hidden="true" />} to="/app/admin/commerce" />
        </div>
      </QueryState>

      <Card className="mt-8 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Farms awaiting verification</h2>
          <Link to="/app/admin/farms" className="text-sm font-semibold text-brand hover:underline">Review all</Link>
        </div>
        <QueryState
          isLoading={pending.isLoading}
          isError={pending.isError}
          isEmpty={!pending.data || pending.data.length === 0}
          emptyTitle="Queue is clear"
          emptyHint="No farms waiting for verification."
          onRetry={() => pending.refetch()}
        >
          <ul className="divide-y divide-line">
            {(pending.data ?? []).slice(0, 5).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{f.name}</p>
                  <p className="text-xs text-muted">{f.location}</p>
                </div>
                <Link to="/app/admin/farms" className="text-sm font-semibold text-brand hover:underline">Review →</Link>
              </li>
            ))}
          </ul>
        </QueryState>
      </Card>
    </div>
  );
}
