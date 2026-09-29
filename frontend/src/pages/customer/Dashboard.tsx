import { Link } from "react-router-dom";
import { Bell, ClipboardList, History, Package } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { QueryState, StatCard, StatusBadge, fmtDate } from "../../features/portal/components";
import { useOrders } from "../../features/portal/apiCommerce";
import { useNotifications, useSubscriptions } from "../../features/portal/apiEngagement";
import { useAuthStore } from "../../stores/auth";
import { formatPKR } from "../../lib/formatters";

export function CustomerDashboard() {
  const user = useAuthStore((s) => s.user);
  const orders = useOrders();
  const subs = useSubscriptions();
  const notifs = useNotifications(true);

  const activeOrders = (orders.data ?? []).filter((o) => !["delivered", "cancelled"].includes(o.status.toLowerCase()));
  const activeSubs = (subs.data ?? []).filter((s) => s.status.toLowerCase() === "active");
  const recent = (orders.data ?? []).slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="Customer portal"
        title={`Welcome back${user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}`}
        description="Your orders, milk plans and updates at a glance."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active orders" value={orders.data ? activeOrders.length : "—"} icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />} to="/app/customer/orders" />
        <StatCard label="Active subscriptions" value={subs.data ? activeSubs.length : "—"} icon={<History className="h-5 w-5" aria-hidden="true" />} to="/app/customer/subscriptions" />
        <StatCard label="Unread notifications" value={notifs.data ? notifs.data.length : "—"} icon={<Bell className="h-5 w-5" aria-hidden="true" />} to="/app/customer/notifications" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Recent orders</h2>
            <Link to="/app/customer/orders" className="text-sm font-semibold text-brand hover:underline">View all</Link>
          </div>
          <QueryState
            isLoading={orders.isLoading}
            isError={orders.isError}
            isEmpty={recent.length === 0}
            emptyTitle="No orders yet"
            emptyHint="Browse the marketplace to place your first order."
            emptyIcon={<Package className="h-7 w-7" aria-hidden="true" />}
            emptyAction={<Link to="/app/customer/shop"><Button size="sm">Shop fresh dairy</Button></Link>}
            onRetry={() => orders.refetch()}
          >
            <ul className="divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link to={`/app/customer/orders/${o.id}`} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">Order #{o.id}</p>
                      <p className="truncate text-xs text-muted">
                        {o.items.length} item{o.items.length === 1 ? "" : "s"} · {fmtDate(o.orderDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-ink">{formatPKR(o.totalAmount)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </QueryState>
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Latest updates</h2>
            <Link to="/app/customer/notifications" className="text-sm font-semibold text-brand hover:underline">View all</Link>
          </div>
          <QueryState
            isLoading={notifs.isLoading}
            isError={notifs.isError}
            isEmpty={!notifs.data || notifs.data.length === 0}
            emptyTitle="You're all caught up"
            emptyHint="New order updates and offers will appear here."
            onRetry={() => notifs.refetch()}
          >
            <ul className="space-y-3">
              {(notifs.data ?? []).slice(0, 5).map((n) => (
                <li key={n.id} className="rounded-2xl bg-palegreen/50 px-4 py-3">
                  <p className="text-sm text-ink">{n.message}</p>
                  <p className="mt-1 text-xs capitalize text-muted">{n.type.replace(/_/g, " ")}</p>
                </li>
              ))}
            </ul>
          </QueryState>
        </Card>
      </div>
    </div>
  );
}
