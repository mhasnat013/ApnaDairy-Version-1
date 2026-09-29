import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ShoppingCart } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { FilterBar, FilterSelect, Pagination, QueryState, SearchInput } from "../../../features/portal/components";
import { useCart, useProducts, useUpdateCart } from "../../../features/portal/apiCommerce";
import { PAGE_SIZE } from "../../../features/portal/apiCore";
import { formatPKR } from "../../../lib/formatters";

export function Shop() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState<number | null>(null);

  const products = useProducts({ search: search || undefined, category: category || undefined, status: "active", limit: 100 });
  const cart = useCart();
  const updateCart = useUpdateCart();

  const filtered = useMemo(() => products.data ?? [], [products.data]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const categories = useMemo(() => Array.from(new Set((products.data ?? []).map((p) => p.category))), [products.data]);

  const addToCart = async (productId: number) => {
    setAdding(productId);
    try {
      const items = (cart.data?.items ?? []).map((i) => ({ productId: i.productId, quantity: i.quantity }));
      const existing = items.find((i) => i.productId === productId);
      if (existing) existing.quantity += 1;
      else items.push({ productId, quantity: 1 });
      await updateCart.mutateAsync(items);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Shop fresh dairy"
        description="Every listing carries an AI freshness score from a verified farm."
        actions={
          <Link to="/app/customer/cart">
            <Button variant="outline">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Cart{cart.data && cart.data.items.length > 0 ? ` (${cart.data.items.length})` : ""}
            </Button>
          </Link>
        }
      />
      <FilterBar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search products…" label="Search products" />
        <FilterSelect
          value={category}
          onChange={(v) => { setCategory(v); setPage(1); }}
          label="Filter by category"
          options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
      </FilterBar>
      <QueryState
        isLoading={products.isLoading}
        isError={products.isError}
        error={products.error}
        isEmpty={pageItems.length === 0}
        emptyTitle="No products found"
        emptyHint="Try a different search, or check back as farms publish new listings."
        onRetry={() => products.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((p) => (
            <Card key={p.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/app/customer/products/${p.id}`} className="font-display text-base font-semibold text-ink hover:text-brand">
                    {p.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {p.category} · {p.farmName ?? "Verified farm"}
                  </p>
                </div>
                {p.freshnessScore !== null && p.freshnessScore !== undefined && (
                  <Badge tone={p.freshnessScore >= 70 ? "mint" : p.freshnessScore >= 30 ? "amber" : "danger"}>
                    {Math.round(p.freshnessScore)}/100
                  </Badge>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="font-display text-lg font-bold text-ink">
                  {formatPKR(p.price)}
                  <span className="ml-1 text-xs font-normal text-muted">/ {p.unitOfMeasure}</span>
                </p>
                <Button size="sm" loading={adding === p.id} onClick={() => addToCart(p.id)} aria-label={`Add ${p.name} to cart`}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add
                </Button>
              </div>
              {p.quantityAvailable <= 0 && (
                <p className="mt-2 text-xs font-medium text-danger">Out of stock</p>
              )}
            </Card>
          ))}
        </div>
        <Pagination page={page} pageCount={pageCount} onPage={setPage} />
      </QueryState>
    </div>
  );
}
