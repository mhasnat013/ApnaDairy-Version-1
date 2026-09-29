import { useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { FilterBar, FilterSelect, QueryState, StatusBadge, fmtDateTime } from "../../../features/portal/components";
import { useOrders, usePayments } from "../../../features/portal/apiCommerce";
import { DEMO_LABELS } from "../../../lib/constants";
import { formatPKR } from "../../../lib/formatters";

export function BusinessOrders() {
  const orders = useOrders();
  const [status, setStatus] = useState("");

  const filtered = useMemo(
    () => (orders.data ?? []).filter((o) => !status || o.status === status),
    [orders.data, status],
  );

  return (
    <div>
      <PageHeader eyebrow="Purchasing" title="Orders" description="Your bulk and marketplace orders." />
      <FilterBar>
        <FilterSelect
          value={status}
          onChange={setStatus}
          label="Filter by status"
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "confirmed", label: "Confirmed" },
            { value: "packed", label: "Packed" },
            { value: "shipped", label: "Shipped" },
            { value: "delivered", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </FilterBar>
      <QueryState
        isLoading={orders.isLoading}
        isError={orders.isError}
        error={orders.error}
        isEmpty={filtered.length === 0}
        emptyTitle="No orders"
        emptyHint="Accepted quotations and marketplace purchases appear here."
        emptyIcon={<ShoppingCart className="h-7 w-7" aria-hidden="true" />}
        onRetry={() => orders.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((o) => (
            <Card key={o.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-base font-semibold text-ink">Order #{o.id}</p>
                <StatusBadge status={o.status} />
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {o.items.map((i) => (
                  <li key={i.productId}>
                    {i.name} × {i.quantity} — {formatPKR(i.price * i.quantity)}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="font-bold text-brand">{formatPKR(o.totalAmount)}</span>
                <span className="text-xs text-muted">{fmtDateTime(o.orderDate)}</span>
              </div>
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}

export function BusinessPayments() {
  const payments = usePayments();

  return (
    <div>
      <PageHeader
        eyebrow="Purchasing"
        title="Payments"
        description={`${DEMO_LABELS.payment} — your payment history.`}
      />
      <QueryState
        isLoading={payments.isLoading}
        isError={payments.isError}
        error={payments.error}
        isEmpty={!payments.data || payments.data.length === 0}
        emptyTitle="No payments"
        emptyHint="Payments for orders and accepted quotations appear here."
        onRetry={() => payments.refetch()}
      >
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(payments.data ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 font-semibold text-ink">#{p.id}{p.orderId ? ` · Order #${p.orderId}` : ""}</td>
                    <td className="px-5 py-3 font-bold text-brand">{formatPKR(p.amount)}</td>
                    <td className="px-5 py-3 text-muted">{p.method}</td>
                    <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-3 text-muted">{fmtDateTime(p.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="mt-3 text-xs text-muted">{DEMO_LABELS.payment}</p>
      </QueryState>
    </div>
  );
}

export function BusinessAnalytics() {
  const orders = useOrders();
  const total = (orders.data ?? []).filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.totalAmount, 0);
  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders.data ?? []) map.set(o.status, (map.get(o.status) ?? 0) + 1);
    return [...map.entries()];
  }, [orders.data]);

  return (
    <div>
      <PageHeader eyebrow="Insights" title="Analytics" description="Your procurement spend and order pipeline." />
      <QueryState
        isLoading={orders.isLoading}
        isError={orders.isError}
        isEmpty={false}
        emptyTitle="No data"
        onRetry={() => orders.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-6">
            <p className="text-sm font-medium text-muted">Total spend</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">{formatPKR(total)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-muted">Orders placed</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">{orders.data?.length ?? 0}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-muted">Average order</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">
              {formatPKR(orders.data && orders.data.length > 0 ? total / orders.data.length : 0)}
            </p>
          </Card>
        </div>
        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Orders by status</h2>
          <div className="mt-4 space-y-3">
            {byStatus.length === 0 ? (
              <p className="text-sm text-muted">No orders yet.</p>
            ) : byStatus.map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="w-28"><StatusBadge status={status} /></div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-palegreen">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(count / Math.max(...byStatus.map(([, c]) => c))) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-semibold text-ink">{count}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="mt-6">
          <Button variant="outline" onClick={() => orders.refetch()}>Refresh</Button>
        </div>
      </QueryState>
    </div>
  );
}
