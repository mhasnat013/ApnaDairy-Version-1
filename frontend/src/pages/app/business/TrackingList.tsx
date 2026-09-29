import { Link } from "react-router-dom";
import { Truck } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { QueryState, StatusBadge, fmtDateTime } from "../../../features/portal/components";
import { useDeliveries } from "../../../features/portal/apiCommerce";

/** Landing page: pick a delivery to track. */
export function BusinessTrackingList() {
  const deliveries = useDeliveries();

  return (
    <div>
      <PageHeader
        eyebrow="Logistics"
        title="Deliveries"
        description="Select a delivery to track its live status."
      />
      <QueryState
        isLoading={deliveries.isLoading}
        isError={deliveries.isError}
        error={deliveries.error}
        isEmpty={!deliveries.data || deliveries.data.length === 0}
        emptyTitle="No deliveries"
        emptyHint="Deliveries for your orders will appear here."
        emptyIcon={<Truck className="h-7 w-7" aria-hidden="true" />}
        onRetry={() => deliveries.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(deliveries.data ?? []).map((d) => (
            <Link key={d.id} to={`/app/business/tracking/${d.id}`}>
              <Card className="p-5 transition-shadow hover:shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-base font-semibold text-ink">Delivery #{d.id} · Order #{d.orderId}</p>
                  <StatusBadge status={d.status} />
                </div>
                {d.address && <p className="mt-1 text-sm text-muted">{d.address}</p>}
                <p className="mt-2 text-xs text-muted">{d.scheduledTime ? `Scheduled ${fmtDateTime(d.scheduledTime)}` : "Tap to track →"}</p>
              </Card>
            </Link>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
