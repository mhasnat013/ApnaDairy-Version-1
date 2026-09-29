import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { FilterBar, FilterSelect, QueryState, StatusBadge, fmtDate } from "../../../features/portal/components";
import { useOrders } from "../../../features/portal/apiCommerce";
import { formatPKR } from "../../../lib/formatters";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function CustomerOrders() {
  const [status, setStatus] = useState("");
  const orders = useOrders(status || undefined);

  return (
    <div>
      <PageHeader eyebrow="Orders" title="My orders" description="Track and review all your orders in one place." />
      <FilterBar>
        <FilterSelect value={status} onChange={setStatus} label="Filter by status" options={STATUS_OPTIONS} />
      </FilterBar>
      <QueryState
        isLoading={orders.isLoading}
        isError={orders.isError}
        error={orders.error}
        isEmpty={!orders.data || orders.data.length === 0}
        emptyTitle="No orders found"
        emptyHint="You haven't placed any orders yet."
        emptyIcon={<ClipboardList className="h-7 w-7" aria-hidden="true" />}
        onRetry={() => orders.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(orders.data ?? []).map((o) => (
            <Link key={o.id} to={`/app/customer/orders/${o.id}`}>
              <Card className="p-5 transition-shadow hover:shadow-lift">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-base font-semibold text-ink">Order #{o.id}</p>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-xs text-muted">{fmtDate(o.orderDate)} · {o.items.length} item{o.items.length === 1 ? "" : "s"}</p>
                <p className="mt-2 truncate text-sm text-muted">
                  {o.items.map((i) => i.name).join(", ")}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="font-display text-lg font-bold text-ink">{formatPKR(o.totalAmount)}</span>
                  <span className="text-sm font-semibold text-brand">
                    {o.delivery ? "Track delivery →" : "View details →"}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
