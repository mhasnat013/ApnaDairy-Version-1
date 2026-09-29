import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { DetailRow, QueryState, ScoreRing, StatusBadge, fmtDate } from "../../features/portal/components";
import { useCart, useProduct, useUpdateCart } from "../../features/portal/apiCommerce";
import { useReviews } from "../../features/portal/apiEngagement";
import { formatPKR } from "../../lib/formatters";

export function CustomerProductDetail() {
  const rawId = useParams().id;
  const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : undefined;
  const product = useProduct(id);
  const reviews = useReviews({ productId: id });
  const cart = useCart();
  const updateCart = useUpdateCart();
  const [qty, setQty] = useState(1);

  const addToCart = async () => {
    const items = (cart.data?.items ?? []).map((i) => ({ productId: i.productId, quantity: i.quantity }));
    const existing = items.find((i) => i.productId === id);
    if (existing) existing.quantity += qty;
    else if (id !== undefined) items.push({ productId: id, quantity: qty });
    await updateCart.mutateAsync(items);
  };

  return (
    <div>
      <Link to="/app/customer/shop" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to shop
      </Link>
      <QueryState
        isLoading={product.isLoading}
        isError={product.isError}
        error={product.error}
        isEmpty={!product.data}
        emptyTitle="Product not found"
        onRetry={() => product.refetch()}
      >
        {product.data && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6 sm:p-8">
              <PageHeader eyebrow={product.data.category} title={product.data.name} description={product.data.description ?? undefined} className="mb-4" />
              <div className="flex items-center gap-4">
                <ScoreRing score={product.data.freshnessScore} />
                <div>
                  <p className="text-sm font-semibold text-ink">AI freshness score</p>
                  <p className="text-xs text-muted">Demonstration prediction — not laboratory certification.</p>
                </div>
              </div>
              <dl className="mt-6">
                <DetailRow label="Farm">
                  <Link to={`/farms/${product.data.farmId}`} className="text-brand hover:underline">
                    {product.data.farmName ?? `#${product.data.farmId}`}
                  </Link>
                </DetailRow>
                <DetailRow label="Batch">
                  {product.data.batchCode ?? "—"}
                </DetailRow>
                <DetailRow label="Stock">{product.data.quantityAvailable} {product.data.unitOfMeasure}</DetailRow>
                <DetailRow label="Status"><StatusBadge status={product.data.status} /></DetailRow>
              </dl>
            </Card>
            <div className="space-y-6">
              <Card className="p-6">
                <p className="font-display text-3xl font-bold text-ink">
                  {formatPKR(product.data.price)}
                  <span className="ml-1 text-sm font-normal text-muted">/ {product.data.unitOfMeasure}</span>
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex items-center rounded-xl border border-line">
                    <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5 text-ink hover:text-brand">
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-ink" aria-live="polite">{qty}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)} className="p-2.5 text-ink hover:text-brand">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <Button onClick={addToCart} loading={updateCart.isPending} disabled={product.data.quantityAvailable <= 0}>
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Add to cart
                  </Button>
                </div>
                {updateCart.isError && (
                  <p role="alert" className="mt-3 text-sm font-medium text-danger">Couldn't add to cart. Please try again.</p>
                )}
              </Card>
              <Card className="p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                  <Star className="h-5 w-5 text-brand" aria-hidden="true" /> Reviews
                </h2>
                <div className="mt-4">
                  <QueryState
                    isLoading={reviews.isLoading}
                    isError={reviews.isError}
                    isEmpty={!reviews.data || reviews.data.length === 0}
                    emptyTitle="No reviews yet"
                    emptyHint="Be the first to review this product after your order."
                  >
                    <ul className="space-y-3">
                      {(reviews.data ?? []).slice(0, 5).map((r) => (
                        <li key={r.id} className="rounded-2xl bg-palegreen/50 px-4 py-3">
                          <p className="text-sm font-semibold text-ink">
                            {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                            <span className="ml-2 font-normal text-muted">{r.userName ?? "Customer"}</span>
                          </p>
                          {r.comment && <p className="mt-1 text-sm text-ink">{r.comment}</p>}
                          <p className="mt-1 text-xs text-muted">{fmtDate(r.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                  </QueryState>
                </div>
              </Card>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
