import { useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { FilterBar, FilterSelect, QueryState, StatusBadge, fmtDateTime } from "../../features/portal/components";
import { useOrders } from "../../features/portal/apiCommerce";
import { useMyFarm } from "../../features/portal/apiCore";
import { formatPKR } from "../../lib/formatters";

export function FarmerOrders() {
  const { myFarm } = useMyFarm();
  const orders = useOrders();
  const [status, setStatus] = useState("");

  const mine = useMemo(
    () =>
      (orders.data ?? []).filter(
        (o) =>
          o.items.some((i) => i.farmId === myFarm?.id) &&
          (!status || o.status === status),
      ),
    [orders.data, myFarm, status],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        description="Orders that include your farm's products. Pack, confirm and keep them moving."
      />
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
        isEmpty={mine.length === 0}
        emptyTitle="No orders yet"
        emptyHint="Orders containing your products will appear here."
        emptyIcon={<ShoppingCart className="h-7 w-7" aria-hidden="true" />}
        onRetry={() => orders.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {mine.map((o) => (
            <Card key={o.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-base font-semibold text-ink">Order #{o.id}</p>
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-2 text-sm text-muted">
                {o.items.filter((i) => i.farmId === myFarm?.id).map((i) => i.name).join(", ")}
              </p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-bold text-brand">{formatPKR(o.totalAmount)}</span>
                <span className="text-xs text-muted">{fmtDateTime(o.orderDate)}</span>
              </div>
              {o.delivery && (
                <div className="mt-3 border-t border-line pt-3 text-sm">
                  <StatusBadge status={o.delivery.status} />
                </div>
              )}
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
