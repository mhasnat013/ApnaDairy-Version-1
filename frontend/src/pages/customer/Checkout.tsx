import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, CreditCard } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, QueryState, inputCls } from "../../features/portal/components";
import { useCart, useCreateOrder, usePayOrder } from "../../features/portal/apiCommerce";
import { DEMO_LABELS } from "../../lib/constants";
import { formatPKR } from "../../lib/formatters";

type Step = "details" | "paying" | "done";

export function Checkout() {
  const cart = useCart();
  const createOrder = useCreateOrder();
  const payOrder = usePayOrder();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState("card");
  const [step, setStep] = useState<Step>("details");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const placeOrder = async () => {
    if (!address.trim()) {
      setError("Please enter a delivery address.");
      return;
    }
    setError(null);
    setStep("paying");
    try {
      const order = await createOrder.mutateAsync({ deliveryAddress: address.trim() });
      await payOrder.mutateAsync({ id: order.id, method });
      setOrderId(order.id);
      setStep("done");
    } catch (e) {
      setStep("details");
      setError(e instanceof Error ? e.message : "Checkout failed. Please try again.");
    }
  };

  if (step === "done" && orderId !== null) {
    return (
      <div>
        <PageHeader eyebrow="Checkout" title="Order placed" description="Thank you — your dairy is on its way." />
        <Card className="mx-auto max-w-lg p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-brand" aria-hidden="true" />
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">Order #{orderId} confirmed</h2>
          <p className="mt-2 text-sm text-muted">
            A demo payment was recorded — <strong>{DEMO_LABELS.payment}</strong>.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to={`/app/customer/orders/${orderId}`}>
              <Button>Track order</Button>
            </Link>
            <Link to="/app/customer/shop">
              <Button variant="outline">Continue shopping</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const items = cart.data?.items ?? [];

  return (
    <div>
      <PageHeader eyebrow="Checkout" title="Complete your order" description="Delivery details and simulated payment." />
      <QueryState
        isLoading={cart.isLoading}
        isError={cart.isError}
        isEmpty={items.length === 0}
        emptyTitle="Your cart is empty"
        emptyHint="Add some products before checking out."
        emptyAction={<Link to="/app/customer/shop"><Button>Shop fresh dairy</Button></Link>}
        onRetry={() => cart.refetch()}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="space-y-5 p-6">
            <Field label="Delivery address" error={error && !address.trim() ? error : undefined}>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="House, street, area, city…"
                className={inputCls + " h-auto py-3"}
                aria-label="Delivery address"
              />
            </Field>
            <Field label="Payment method" hint={DEMO_LABELS.payment}>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  ["card", "Card"],
                  ["cod", "Cash on delivery"],
                  ["wallet", "Mobile wallet"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${method === value ? "border-brand bg-mint/40 text-ink" : "border-line text-muted"}`}
                  >
                    <input
                      type="radio"
                      name="pay-method"
                      value={value}
                      checked={method === value}
                      onChange={() => setMethod(value)}
                      className="accent-[#087857]"
                    />
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </label>
                ))}
              </div>
            </Field>
            {error && address.trim() && (
              <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>
            )}
            <Button onClick={placeOrder} loading={step === "paying"} className="w-full sm:w-auto">
              Place order · {formatPKR(cart.data?.total ?? 0)}
            </Button>
          </Card>
          <Card className="h-fit p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {items.map((i) => (
                <li key={i.productId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-ink">{i.name} × {i.quantity}</span>
                  <span className="shrink-0 font-semibold text-ink">{formatPKR(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm text-muted">Total</span>
              <span className="font-display text-xl font-bold text-ink">{formatPKR(cart.data?.total ?? 0)}</span>
            </div>
            <button type="button" onClick={() => navigate("/app/customer/cart")} className="mt-3 text-sm font-semibold text-brand hover:underline">
              Edit cart
            </button>
          </Card>
        </div>
      </QueryState>
    </div>
  );
}
