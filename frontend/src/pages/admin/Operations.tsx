import { useState } from "react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { QueryState, ScoreRing, StatusBadge, fmtDateTime } from "../../features/portal/components";
import { useBatches, useUsers } from "../../features/portal/apiCore";
import {
  useAssignDelivery,
  useDeliveries,
  useOrders,
  usePayments,
  useUpdateDeliveryStatus,
  useUpdateOrderStatus,
} from "../../features/portal/apiCommerce";
import { DEMO_LABELS } from "../../lib/constants";
import { formatPKR } from "../../lib/formatters";

type Tab = "batches" | "orders" | "payments" | "deliveries";

const TABS: Array<[Tab, string]> = [
  ["batches", "Batches"],
  ["orders", "Orders"],
  ["payments", "Payments"],
  ["deliveries", "Deliveries"],
];

export function AdminOperations() {
  const [tab, setTab] = useState<Tab>("batches");
  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Operations"
        description="Platform-wide oversight of batches, orders, payments and deliveries."
      />
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Operations sections">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === key ? "bg-brand text-white" : "bg-white text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "batches" && <BatchesTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "payments" && <PaymentsTab />}
      {tab === "deliveries" && <DeliveriesTab />}
    </div>
  );
}

function BatchesTab() {
  const batches = useBatches({ limit: 50 });
  return (
    <QueryState
      isLoading={batches.isLoading}
      isError={batches.isError}
      error={batches.error}
      isEmpty={!batches.data || batches.data.length === 0}
      emptyTitle="No batches"
      onRetry={() => batches.refetch()}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(batches.data ?? []).map((b) => (
          <Card key={b.id} className="flex items-center gap-4 p-5">
            <ScoreRing score={b.freshnessScore} size={56} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-bold text-ink">{b.batchCode}</p>
              <p className="truncate text-xs text-muted">{b.farmName ?? ""} · {b.quantityLiters} L · {fmtDateTime(b.milkingTime)}</p>
              <div className="mt-1.5 flex gap-2"><StatusBadge status={b.status} />{b.spoilageRisk && <StatusBadge status={b.spoilageRisk} />}</div>
            </div>
          </Card>
        ))}
      </div>
    </QueryState>
  );
}

function OrdersTab() {
  const orders = useOrders();
  const update = useUpdateOrderStatus();
  const [filter, setFilter] = useState("");
  const filtered = (orders.data ?? []).filter((o) => !filter || o.status === filter);
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["", "pending", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === s ? "bg-brand text-white" : "bg-white text-muted"}`}
          >
            {s || "All"}
          </button>
        ))}
      </div>
      <QueryState
        isLoading={orders.isLoading}
        isError={orders.isError}
        error={orders.error}
        isEmpty={filtered.length === 0}
        emptyTitle="No orders"
        onRetry={() => orders.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((o) => (
            <Card key={o.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-base font-semibold text-ink">Order #{o.id}</p>
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-2 text-sm text-muted">{o.items.length} item{o.items.length === 1 ? "" : "s"} · {formatPKR(o.totalAmount)}</p>
              <p className="text-xs text-muted">{fmtDateTime(o.orderDate)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["confirmed", "packed", "shipped", "delivered"].map((s) => (
                  <Button key={s} variant="outline" size="sm" disabled={o.status === s} onClick={() => update.mutate({ id: o.id, status: s })} loading={update.isPending}>
                    {s}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}

function PaymentsTab() {
  const payments = usePayments();
  return (
    <div>
      <p className="mb-4 text-xs text-muted">{DEMO_LABELS.payment}</p>
      <QueryState
        isLoading={payments.isLoading}
        isError={payments.isError}
        error={payments.error}
        isEmpty={!payments.data || payments.data.length === 0}
        emptyTitle="No payments"
        onRetry={() => payments.refetch()}
      >
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(payments.data ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 font-semibold text-ink">#{p.id}</td>
                    <td className="px-5 py-3 text-muted">{p.orderId ? `#${p.orderId}` : "—"}</td>
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
      </QueryState>
    </div>
  );
}

function DeliveriesTab() {
  const deliveries = useDeliveries();
  const riders = useUsers({ role: "rider", limit: 100 });
  const assign = useAssignDelivery();
  const update = useUpdateDeliveryStatus();
  const [assignFor, setAssignFor] = useState<number | null>(null);
  const [riderId, setRiderId] = useState("");

  return (
    <QueryState
      isLoading={deliveries.isLoading}
      isError={deliveries.isError}
      error={deliveries.error}
      isEmpty={!deliveries.data || deliveries.data.length === 0}
      emptyTitle="No deliveries"
      onRetry={() => deliveries.refetch()}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(deliveries.data ?? []).map((d) => (
          <Card key={d.id} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-base font-semibold text-ink">Delivery #{d.id} · Order #{d.orderId}</p>
              <StatusBadge status={d.status} />
            </div>
            <p className="mt-1 text-sm text-muted">Rider: {d.riderName ?? "unassigned"}</p>
            {d.address && <p className="text-sm text-muted">{d.address}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {assignFor === d.id ? (
                <>
                  <select
                    value={riderId}
                    onChange={(e) => setRiderId(e.target.value)}
                    className="h-9 rounded-xl border border-line bg-white px-3 text-sm text-ink"
                    aria-label="Select rider"
                  >
                    <option value="">Select rider…</option>
                    {(riders.data ?? []).map((r) => (
                      <option key={r.id} value={r.id}>{r.fullName}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!riderId}
                    loading={assign.isPending}
                    onClick={() => assign.mutate({ id: d.id, riderId: Number(riderId) }, { onSuccess: () => setAssignFor(null) })}
                  >
                    Assign
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setAssignFor(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setAssignFor(d.id); setRiderId(""); }}>Assign rider</Button>
                  {["in_transit", "delivered"].map((s) => (
                    <Button key={s} variant="ghost" size="sm" onClick={() => update.mutate({ id: d.id, status: s })} loading={update.isPending}>
                      {s.replace("_", " ")}
                    </Button>
                  ))}
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </QueryState>
  );
}
