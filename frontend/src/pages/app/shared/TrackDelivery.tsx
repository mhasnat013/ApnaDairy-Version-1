import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Package, Truck } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { DetailRow, QueryState, StatusBadge, fmtDateTime } from "../../../features/portal/components";
import { useAddTracking, useDelivery, useTracking } from "../../../features/portal/apiCommerce";
import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { inputCls } from "../../../features/portal/components";

const STAGES = ["assigned", "picked_up", "in_transit", "delivered"];

/** Delivery tracking timeline — reused by customer, business and rider portals. */
export function TrackDeliveryPage({ deliveryId, canUpdate = false }: { deliveryId: number | undefined; canUpdate?: boolean }) {
  const delivery = useDelivery(deliveryId);
  const tracking = useTracking(deliveryId);
  const addTracking = useAddTracking();
  const [note, setNote] = useState("");

  const stageIdx = STAGES.indexOf((delivery.data?.status ?? "").toLowerCase().replace(/-/g, "_"));

  return (
    <div>
      <PageHeader eyebrow="Deliveries" title="Delivery tracking" description="Live status of this delivery from farm to doorstep." />
      <QueryState
        isLoading={delivery.isLoading}
        isError={delivery.isError}
        error={delivery.error}
        isEmpty={!delivery.data}
        emptyTitle="Delivery not found"
        onRetry={() => delivery.refetch()}
      >
        {delivery.data && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-ink">Delivery #{delivery.data.id}</h2>
                <StatusBadge status={delivery.data.status} />
              </div>
              <dl className="mt-4">
                <DetailRow label="Order">
                  <Link to=".." className="text-brand hover:underline">
                    #{delivery.data.orderId}
                  </Link>
                </DetailRow>
                <DetailRow label="Rider">{delivery.data.riderName ?? "Not assigned yet"}</DetailRow>
                <DetailRow label="Address">{delivery.data.address ?? "—"}</DetailRow>
                <DetailRow label="Scheduled">{fmtDateTime(delivery.data.scheduledTime)}</DetailRow>
                <DetailRow label="Delivered">{fmtDateTime(delivery.data.deliveredTime)}</DetailRow>
              </dl>
              {/* Stage progress */}
              <ol className="mt-6 space-y-0" aria-label="Delivery progress">
                {STAGES.map((s, i) => {
                  const done = stageIdx >= 0 && i <= stageIdx;
                  const current = i === stageIdx;
                  return (
                    <li key={s} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {done ? (
                          <CheckCircle2 className="h-6 w-6 text-brand" aria-hidden="true" />
                        ) : (
                          <Circle className="h-6 w-6 text-line" aria-hidden="true" />
                        )}
                        {i < STAGES.length - 1 && <span className="h-6 w-px bg-line" aria-hidden="true" />}
                      </div>
                      <div className="pb-6">
                        <p className={`text-sm font-semibold capitalize ${current ? "text-brand-pine" : done ? "text-ink" : "text-muted"}`}>
                          {s.replace(/_/g, " ")}
                          {current && <span className="ml-2 text-xs font-medium text-muted">— current</span>}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Truck className="h-5 w-5 text-brand" aria-hidden="true" /> Tracking updates
              </h2>
              {canUpdate && (
                <form
                  className="mt-4 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!note.trim() || !deliveryId) return;
                    addTracking.mutate({ deliveryId, statusUpdate: note.trim() });
                    setNote("");
                  }}
                >
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a tracking note…"
                    aria-label="Add a tracking note"
                    className={inputCls + " flex-1"}
                  />
                  <Button type="submit" loading={addTracking.isPending} size="sm">
                    Add
                  </Button>
                </form>
              )}
              <div className="mt-4">
                <QueryState
                  isLoading={tracking.isLoading}
                  isError={tracking.isError}
                  isEmpty={!tracking.data || tracking.data.length === 0}
                  emptyTitle="No tracking updates yet"
                  emptyHint="Updates appear here as the rider progresses."
                  emptyIcon={<Package className="h-7 w-7" aria-hidden="true" />}
                  onRetry={() => tracking.refetch()}
                >
                  <ol className="space-y-4">
                    {(tracking.data ?? []).map((t) => (
                      <li key={t.id} className="rounded-2xl bg-palegreen/50 px-4 py-3">
                        <p className="text-sm font-medium text-ink">{t.statusUpdate}</p>
                        <p className="mt-1 text-xs text-muted">{fmtDateTime(t.timestamp)}</p>
                      </li>
                    ))}
                  </ol>
                </QueryState>
              </div>
            </Card>
          </div>
        )}
      </QueryState>
    </div>
  );
}
