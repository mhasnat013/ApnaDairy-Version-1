import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { DetailRow, FilterBar, FilterSelect, QueryState, StatusBadge, fmtDateTime } from "../../features/portal/components";
import { useAddTracking, useDeliveries, useDelivery, useTracking, useUpdateDeliveryStatus } from "../../features/portal/apiCommerce";
import { DEMO_LABELS } from "../../lib/constants";

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  assigned: { label: "Mark picked up", next: "picked_up" },
  picked_up: { label: "Start transit", next: "in_transit" },
  in_transit: { label: "Mark delivered", next: "delivered" },
};

export function RiderAssignments() {
  const deliveries = useDeliveries();
  const updateStatus = useUpdateDeliveryStatus();
  const [status, setStatus] = useState("");

  const filtered = (deliveries.data ?? []).filter((d) => !status || d.status === status);

  return (
    <div>
      <PageHeader eyebrow="Rider" title="Assignments" description="Deliveries assigned to you." />
      <FilterBar>
        <FilterSelect
          value={status}
          onChange={setStatus}
          label="Filter by status"
          options={[
            { value: "", label: "All statuses" },
            { value: "assigned", label: "Assigned" },
            { value: "picked_up", label: "Picked up" },
            { value: "in_transit", label: "In transit" },
            { value: "delivered", label: "Delivered" },
          ]}
        />
      </FilterBar>
      <QueryState
        isLoading={deliveries.isLoading}
        isError={deliveries.isError}
        error={deliveries.error}
        isEmpty={filtered.length === 0}
        emptyTitle="No assignments"
        emptyHint="Deliveries assigned to you will appear here."
        onRetry={() => deliveries.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((d) => {
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
      </QueryState>
    </div>
  );
}

export function RiderAssignmentDetail() {
  const rawId = useParams().id;
  const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : undefined;
  const delivery = useDelivery(id);
  const tracking = useTracking(id);
  const updateStatus = useUpdateDeliveryStatus();
  const addTracking = useAddTracking();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const action = delivery.data ? NEXT_STATUS[delivery.data.status] : undefined;

  const submitNote = async () => {
    if (id === undefined || !note.trim()) return;
    setError(null);
    try {
      await addTracking.mutateAsync({ deliveryId: id, statusUpdate: note.trim() });
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add the update.");
    }
  };

  return (
    <div>
      <Link to="/app/rider/assignments" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to assignments
      </Link>
      <QueryState
        isLoading={delivery.isLoading}
        isError={delivery.isError}
        error={delivery.error}
        isEmpty={!delivery.data}
        emptyTitle="Delivery not found"
        onRetry={() => delivery.refetch()}
      >
        {delivery.data && (
          <div>
            <PageHeader
              eyebrow={`Delivery #${delivery.data.id}`}
              title={`Order #${delivery.data.orderId}`}
              description={delivery.data.address ?? "Delivery assignment"}
              actions={action ? (
                <Button onClick={() => updateStatus.mutate({ id: delivery.data!.id, status: action.next })} loading={updateStatus.isPending}>
                  {action.label}
                </Button>
              ) : undefined}
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold text-ink">Delivery details</h2>
                <dl className="mt-4">
                  <DetailRow label="Status"><StatusBadge status={delivery.data.status} /></DetailRow>
                  <DetailRow label="Address">{delivery.data.address ?? "—"}</DetailRow>
                  <DetailRow label="Scheduled">{fmtDateTime(delivery.data.scheduledTime)}</DetailRow>
                  <DetailRow label="Delivered">{fmtDateTime(delivery.data.deliveredTime)}</DetailRow>
                </dl>
              </Card>
              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold text-ink">Tracking updates</h2>
                <p className="mt-1 text-xs text-muted">{DEMO_LABELS.iot}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Reached pickup point"
                      className="h-11 flex-1 rounded-xl border border-line bg-white px-4 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      aria-label="Tracking update"
                    />
                    <Button onClick={submitNote} loading={addTracking.isPending}>Add</Button>
                  </div>
                  {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
                </div>
                <div className="mt-4">
                  {tracking.isLoading ? (
                    <p className="text-sm text-muted">Loading updates…</p>
                  ) : !tracking.data || tracking.data.length === 0 ? (
                    <p className="text-sm text-muted">No tracking updates yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {tracking.data.map((t) => (
                        <li key={t.id} className="rounded-2xl bg-palegreen/50 px-4 py-3">
                          <p className="text-sm font-medium text-ink">{t.statusUpdate}</p>
                          <p className="mt-0.5 text-xs text-muted">{fmtDateTime(t.timestamp)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}

export function RiderHistory() {
  const deliveries = useDeliveries("delivered");
  return (
    <div>
      <PageHeader eyebrow="Rider" title="Delivery history" description="Deliveries you have completed." />
      <QueryState
        isLoading={deliveries.isLoading}
        isError={deliveries.isError}
        error={deliveries.error}
        isEmpty={!deliveries.data || deliveries.data.length === 0}
        emptyTitle="No completed deliveries"
        emptyHint="Finished deliveries will appear here."
        onRetry={() => deliveries.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(deliveries.data ?? []).map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-base font-semibold text-ink">Delivery #{d.id} · Order #{d.orderId}</p>
                <StatusBadge status={d.status} />
              </div>
              {d.address && <p className="mt-1 text-sm text-muted">{d.address}</p>}
              <p className="mt-2 text-xs text-muted">Delivered {fmtDateTime(d.deliveredTime)}</p>
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
