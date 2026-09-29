import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CreditCard, MapPin, Truck } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { DetailRow, QueryState, StatusBadge, fmtDateTime } from "../../features/portal/components";
import { useOrder, usePayOrder } from "../../features/portal/apiCommerce";
import { useState } from "react";
import { DEMO_LABELS } from "../../lib/constants";
import { formatPKR } from "../../lib/formatters";

export function CustomerOrderDetail() {
  const rawId = useParams().id;
  const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : undefined;
  const order = useOrder(id);
  const pay = usePayOrder();
  const [method, setMethod] = useState("card");

  const retryPay = async () => {
    if (id === undefined) return;
    await pay.mutateAsync({ id, method });
  };

  return (
    <div>
      <Link to="/app/customer/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to orders
      </Link>
      <QueryState
        isLoading={order.isLoading}
        isError={order.isError}
        error={order.error}
        isEmpty={!order.data}
        emptyTitle="Order not found"
        onRetry={() => order.refetch()}
      >
        {order.data && (
          <div>
            <PageHeader
              eyebrow={`Order #${order.data.id}`}
              title={`Order #${order.data.id}`}
              description={`Placed ${fmtDateTime(order.data.orderDate)}`}
              actions={order.data.delivery ? (
                <Link to={`/app/customer/track/${order.data.delivery.id}`}>
                  <Button variant="outline"><Truck className="h-4 w-4" aria-hidden="true" /> Track delivery</Button>
                </Link>
              ) : undefined}
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold text-ink">Items</h2>
                  <StatusBadge status={order.data.status} />
                </div>
                <ul className="divide-y divide-line">
                  {order.data.items.map((i, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="min-w-0 truncate text-ink">{i.name} × {i.quantity}</span>
                      <span className="shrink-0 font-semibold text-ink">{formatPKR(i.price * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between border-t border-line pt-4">
                  <span className="text-sm text-muted">Total</span>
                  <span className="font-display text-xl font-bold text-ink">{formatPKR(order.data.totalAmount)}</span>
                </div>
                <dl className="mt-4">
                  <DetailRow label="Delivery address">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                      {order.data.deliveryAddress ?? "—"}
                    </span>
                  </DetailRow>
                </dl>
              </Card>
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                    <CreditCard className="h-5 w-5 text-brand" aria-hidden="true" /> Payment
                  </h2>
                  {order.data.payment ? (
                    <dl className="mt-4">
                      <DetailRow label="Amount">{formatPKR(order.data.payment.amount)}</DetailRow>
                      <DetailRow label="Method"><span className="capitalize">{order.data.payment.method.replace(/_/g, " ")}</span></DetailRow>
                      <DetailRow label="Status"><StatusBadge status={order.data.payment.status} /></DetailRow>
                      <DetailRow label="Reference">{order.data.payment.transactionRef ?? "—"}</DetailRow>
                      <DetailRow label="Paid at">{fmtDateTime(order.data.payment.paidAt)}</DetailRow>
                    </dl>
                  ) : (
                    <div className="mt-4">
                      <p className="text-sm text-muted">This order hasn't been paid yet.</p>
                      <div className="mt-3 flex gap-2">
                        <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method" className="h-11 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink">
                          <option value="card">Card</option>
                          <option value="cod">Cash on delivery</option>
                          <option value="wallet">Mobile wallet</option>
                        </select>
                        <Button onClick={retryPay} loading={pay.isPending}>Pay now</Button>
                      </div>
                      {pay.isError && <p role="alert" className="mt-2 text-sm font-medium text-danger">Payment failed. Please try again.</p>}
                    </div>
                  )}
                  <p className="mt-4 rounded-xl bg-palegreen/60 px-4 py-3 text-xs text-muted">{DEMO_LABELS.payment}.</p>
                </Card>
                {order.data.delivery && (
                  <Card className="p-6">
                    <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                      <Truck className="h-5 w-5 text-brand" aria-hidden="true" /> Delivery
                    </h2>
                    <dl className="mt-4">
                      <DetailRow label="Status"><StatusBadge status={order.data.delivery.status} /></DetailRow>
                      <DetailRow label="Rider">{order.data.delivery.riderName ?? "Assigning…"}</DetailRow>
                      <DetailRow label="Scheduled">{fmtDateTime(order.data.delivery.scheduledTime)}</DetailRow>
                    </dl>
                    <Link to={`/app/customer/track/${order.data.delivery.id}`} className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
                      Open live tracking →
                    </Link>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
