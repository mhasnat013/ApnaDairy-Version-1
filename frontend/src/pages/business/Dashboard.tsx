import { Link } from "react-router-dom";
import { ClipboardList, Handshake, ShoppingCart, Wallet } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { QueryState, StatCard, StatusBadge, fmtDate } from "../../features/portal/components";
import { useBulkRequests, useOrders, usePayments } from "../../features/portal/apiCommerce";
import { useBusinessOverview } from "../../features/portal/apiCore";
import { formatPKR } from "../../lib/formatters";

export function BusinessDashboard() {
  const overview = useBusinessOverview();
  const requests = useBulkRequests();
  const orders = useOrders();
  const payments = usePayments();

  const openRequests = (requests.data ?? []).filter((r) => r.status === "open").slice(0, 5);
  const recentOrders = (orders.data ?? []).slice(0, 5);
  const recentPayments = (payments.data ?? []).slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="Business portal"
        title="Procurement dashboard"
        description="Bulk milk sourcing, quotations and your supply spend at a glance."
        actions={<Link to="/app/business/requests"><Button>New bulk request</Button></Link>}
      />
      <QueryState
        isLoading={overview.isLoading}
        isError={overview.isError}
        isEmpty={!overview.data}
        emptyTitle="Dashboard unavailable"
        onRetry={() => overview.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Open requests" value={overview.data?.openRequests ?? 0} icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />} to="/app/business/requests" />
          <StatCard label="Pending quotations" value={overview.data?.totalQuotations ?? 0} icon={<Handshake className="h-5 w-5" aria-hidden="true" />} to="/app/business/requests" />
          <StatCard label="Orders" value={(orders.data ?? []).length} icon={<ShoppingCart className="h-5 w-5" aria-hidden="true" />} to="/app/business/orders" />
          <StatCard label="Total spend" value={formatPKR(overview.data?.totalSpent ?? 0)} icon={<Wallet className="h-5 w-5" aria-hidden="true" />} to="/app/business/payments" />
        </div>
      </QueryState>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Open requests</h2>
            <Link to="/app/business/requests" className="text-sm font-semibold text-brand hover:underline">View all</Link>
          </div>
          <QueryState
            isLoading={requests.isLoading}
            isError={requests.isError}
            isEmpty={openRequests.length === 0}
            emptyTitle="No open requests"
            emptyHint="Post a bulk request to collect quotations."
            onRetry={() => requests.refetch()}
          >
            <ul className="space-y-3">
              {openRequests.map((r) => (
                <li key={r.id}>
                  <Link to={`/app/business/requests/${r.id}`} className="block rounded-2xl bg-palegreen/50 px-4 py-3 transition-colors hover:bg-palegreen">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{r.productName ?? `Request #${r.id}`}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted">{r.quantityRequested} L requested{r.deadline ? ` · deadline ${fmtDate(r.deadline)}` : ""}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </QueryState>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Recent orders</h2>
            <Link to="/app/business/orders" className="text-sm font-semibold text-brand hover:underline">View all</Link>
          </div>
          <QueryState
            isLoading={orders.isLoading}
            isError={orders.isError}
            isEmpty={recentOrders.length === 0}
            emptyTitle="No orders yet"
            onRetry={() => orders.refetch()}
          >
            <ul className="divide-y divide-line">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <Link to="/app/business/orders" className="font-semibold text-brand hover:underline">Order #{o.id}</Link>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          </QueryState>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Recent payments</h2>
            <Link to="/app/business/payments" className="text-sm font-semibold text-brand hover:underline">View all</Link>
          </div>
          <QueryState
            isLoading={payments.isLoading}
            isError={payments.isError}
            isEmpty={recentPayments.length === 0}
            emptyTitle="No payments yet"
            onRetry={() => payments.refetch()}
          >
            <ul className="divide-y divide-line">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-semibold text-ink">{formatPKR(p.amount)} · {p.method}</span>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          </QueryState>
        </Card>
      </div>
    </div>
  );
}
