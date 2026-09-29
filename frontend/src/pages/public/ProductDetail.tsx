import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Gauge, Milk, ShoppingCart } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { LoadingState, EmptyState } from "../../components/ui/States";
import { Badge } from "../../components/ui/Badge";
import { useProduct } from "../../features/public/api";
import { formatCurrency } from "../../lib/formatters";

export function ProductDetail() {
  const { productId } = useParams();
  const query = useProduct(productId);
  const [cartNotice, setCartNotice] = useState(false);

  return (
    <div className="container-x py-12 sm:py-16">
      <Link
        to="/marketplace"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Marketplace
      </Link>
      {query.isLoading ? (
        <LoadingState label="Loading product…" />
      ) : query.isError || !query.data ? (
        <EmptyState
          icon={<Milk className="h-7 w-7" aria-hidden="true" />}
          title="Product not found"
          hint="This product doesn't exist or is no longer listed."
        />
      ) : (
        (() => {
          const p = query.data;
          return (
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-line bg-palegreen">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <Milk className="h-24 w-24 text-brand/25" aria-hidden="true" />
                )}
              </div>
              <div>
                <PageHeader
                  eyebrow={p.category}
                  title={p.name}
                  actions={<Badge tone={p.status === "available" ? "mint" : "muted"}>{p.status}</Badge>}
                />
                {p.description && <p className="mt-2 leading-relaxed text-muted">{p.description}</p>}
                <p className="mt-4 font-display text-4xl font-semibold text-ink">
                  {formatCurrency(p.price)}
                  <span className="ml-1 font-sans text-sm font-normal text-muted">per {p.unitOfMeasure}</span>
                </p>
                {p.freshnessScore !== null && p.freshnessScore !== undefined && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-palegreen p-4">
                    <Gauge className="h-5 w-5 text-brand" aria-hidden="true" />
                    <p className="text-sm text-ink">
                      <strong>Freshness score {p.freshnessScore}/100</strong>
                      <span className="text-muted"> — demonstration estimate from the AI engine</span>
                    </p>
                  </div>
                )}
                {p.batchCode && (
                  <p className="mt-4 text-sm font-semibold text-brand">Batch {p.batchCode}</p>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="btn-lift inline-flex h-12 items-center gap-2 rounded-full bg-brand px-8 text-sm font-semibold text-white transition-colors hover:bg-brand-pine"
                    onClick={() => setCartNotice(true)}
                  >
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    Add to cart
                  </button>
                  <Link
                    to="/register"
                    className="btn-lift inline-flex h-12 items-center rounded-full border border-line bg-white px-8 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
                  >
                    Sign in to buy
                  </Link>
                </div>
                {cartNotice && (
                  <p role="status" className="mt-4 rounded-xl bg-amber/15 px-4 py-3 text-sm text-ink">
                    Cart checkout opens once the marketplace backend is connected — your cart will
                    save locally until then.
                  </p>
                )}
                <p className="mt-4 text-xs text-muted">
                  {p.quantityAvailable > 0
                    ? `${p.quantityAvailable} ${p.unitOfMeasure} available`
                    : "Currently out of stock"}
                </p>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
