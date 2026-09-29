import { Link } from "react-router-dom";
import { MapPin, PackageCheck, Route, Timer } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { QueryState, StatCard, StatusBadge, fmtDateTime } from "../../../features/portal/components";
import { useDeliveries, useUpdateDeliveryStatus } from "../../../features/portal/apiCommerce";

const ACTIVE = ["assigned", "picked_up", "in_transit"];
const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  assigned: { label: "Mark picked up", next: "picked_up" },
  picked_up: { label: "Start transit", next: "in_transit" },
  in_transit: { label: "Mark delivered", next: "delivered" },
};

export function RiderDashboard() {
  const deliveries = useDeliveries();
  const updateStatus = useUpdateDeliveryStatus();

  const mine = (deliveries.data ?? []);
  const active = mine.filter((d) => ACTIVE.includes(d.status));
  const done = mine.filter((d) => d.status === "delivered");

  return (
    <div>
      <PageHeader
        eyebrow="Rider portal"
        title="Delivery dashboard"
        description="Your assigned deliveries — pick up, move and deliver."
      />
      <QueryState
        isLoading={deliveries.isLoading}
        isError={deliveries.isError}
        error={deliveries.error}
        isEmpty={false}
        emptyTitle="No deliveries"
        onRetry={() => deliveries.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Active deliveries" value={active.length} icon={<Route className="h-5 w-5" aria-hidden="true" />} to="/app/rider/assignments" />
          <StatCard label="Delivered" value={done.length} icon={<PackageCheck className="h-5 w-5" aria-hidden="true" />} to="/app/rider/history" />
          <StatCard label="Total assigned" value={mine.length} icon={<Timer className="h-5 w-5" aria-hidden="true" />} />
        </div>

        <h2 className="mt-8 font-display text-lg font-semibold text-ink">Active now</h2>
        {active.length === 0 ? (
          <Card className="mt-3 p-8 text-center">
            <p className="text-sm text-muted">No active deliveries. New assignments appear here.</p>
          </Card>
        ) : (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {active.map((d) => {
              const action = NEXT_STATUS[d.status];
              return (
                <Card key={d.id} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-base font-semibold text-ink">Delivery #{d.id} · Order #{d.orderId}</p>
                    <StatusBadge status={d.status} />
                  </div>
                  {d.address && (
                    <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {d.address}
                    </p>
                  )}
                  {d.scheduledTime && <p className="mt-1 text-xs text-muted">Scheduled {fmtDateTime(d.scheduledTime)}</p>}
                  <div className="mt-4 flex gap-2">
                    <Link to={`/app/rider/assignments/${d.id}`}><Button variant="outline" size="sm">Details</Button></Link>
                    {action && (
                      <Button size="sm" onClick={() => updateStatus.mutate({ id: d.id, status: action.next })} loading={updateStatus.isPending}>
                        {action.label}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </QueryState>
    </div>
  );
}
