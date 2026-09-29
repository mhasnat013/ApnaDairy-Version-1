import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmAction, QueryState } from "../../features/portal/components";
import { useCart, useClearCart, useUpdateCart } from "../../features/portal/apiCommerce";
import { formatPKR } from "../../lib/formatters";

export function CartPage() {
  const cart = useCart();
  const updateCart = useUpdateCart();
  const clearCart = useClearCart();

  const setQty = (productId: number, quantity: number) => {
    const items = (cart.data?.items ?? [])
      .map((i) => ({ productId: i.productId, quantity: i.productId === productId ? quantity : i.quantity }))
      .filter((i) => i.quantity > 0);
    updateCart.mutate(items);
  };

  const items = cart.data?.items ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Your cart"
        description="Review items before checkout."
        actions={
          items.length > 0 ? (
            <ConfirmAction
              title="Clear cart"
              message="Remove all items from your cart?"
              confirmLabel="Clear all"
              danger
              onConfirm={() => clearCart.mutate()}
            >
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Clear
              </Button>
            </ConfirmAction>
          ) : undefined
        }
      />
      <QueryState
        isLoading={cart.isLoading}
        isError={cart.isError}
        error={cart.error}
        isEmpty={items.length === 0}
        emptyTitle="Your cart is empty"
        emptyHint="Browse the marketplace to add fresh dairy."
        emptyAction={<Link to="/app/customer/shop"><Button>Shop fresh dairy</Button></Link>}
        onRetry={() => cart.refetch()}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="divide-y divide-line p-2 sm:p-4">
            {items.map((i) => (
              <div key={i.productId} className="flex items-center gap-4 px-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{i.name}</p>
                  <p className="text-xs text-muted">{i.farmName ?? ""} · {formatPKR(i.price)}</p>
                </div>
                <div className="flex items-center rounded-xl border border-line">
                  <button type="button" aria-label={`Decrease ${i.name}`} onClick={() => setQty(i.productId, i.quantity - 1)} className="p-2 text-ink hover:text-brand">
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold" aria-live="polite">{i.quantity}</span>
                  <button type="button" aria-label={`Increase ${i.name}`} onClick={() => setQty(i.productId, i.quantity + 1)} className="p-2 text-ink hover:text-brand">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="w-20 text-right text-sm font-bold text-ink">{formatPKR(i.price * i.quantity)}</p>
              </div>
            ))}
          </Card>
          <Card className="h-fit p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Summary</h2>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm text-muted">Total</span>
              <span className="font-display text-2xl font-bold text-ink">{formatPKR(cart.data?.total ?? 0)}</span>
            </div>
            {updateCart.isError && (
              <p role="alert" className="mt-3 text-sm font-medium text-danger">Couldn't update the cart. Please try again.</p>
            )}
            <Link to="/app/customer/checkout" className="mt-4 block">
              <Button className="w-full" disabled={updateCart.isPending}>
                <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Proceed to checkout
              </Button>
            </Link>
          </Card>
        </div>
      </QueryState>
    </div>
  );
}
