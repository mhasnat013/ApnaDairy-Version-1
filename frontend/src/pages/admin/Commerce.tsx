import { useState } from "react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { QueryState, StatusBadge, fmtDate } from "../../features/portal/components";
import { usePricingRules, useProducts } from "../../features/portal/apiCommerce";
import { useSubscriptions, useUpdateSubscription } from "../../features/portal/apiEngagement";
import { Button } from "../../components/ui/Button";
import { formatPKR } from "../../lib/formatters";

type Tab = "catalog" | "pricing" | "subscriptions";

const TABS: Array<[Tab, string]> = [
  ["catalog", "Catalog"],
  ["pricing", "Pricing rules"],
  ["subscriptions", "Subscriptions"],
];

export function AdminCommerce() {
  const [tab, setTab] = useState<Tab>("catalog");
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Commerce" description="Catalog, pricing rules and subscriptions across the platform." />
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Commerce sections">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === key ? "bg-brand text-white" : "bg-white text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "catalog" && <CatalogTab />}
      {tab === "pricing" && <PricingTab />}
      {tab === "subscriptions" && <SubscriptionsTab />}
    </div>
  );
}

function CatalogTab() {
  const products = useProducts({ limit: 50 });
  return (
    <QueryState
      isLoading={products.isLoading}
      isError={products.isError}
      error={products.error}
      isEmpty={!products.data || products.data.length === 0}
      emptyTitle="No products"
      onRetry={() => products.refetch()}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(products.data ?? []).map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-base font-semibold text-ink">{p.name}</p>
                <p className="text-xs text-muted">{p.farmName ?? ""} · {p.category}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-3 font-display text-xl font-bold text-brand">{formatPKR(p.price)}</p>
            <p className="text-xs text-muted">{p.quantityAvailable} available per {p.unitOfMeasure}</p>
          </Card>
        ))}
      </div>
    </QueryState>
  );
}

function PricingTab() {
  const rules = usePricingRules();
  return (
    <QueryState
      isLoading={rules.isLoading}
      isError={rules.isError}
      error={rules.error}
      isEmpty={!rules.data}
      emptyTitle="Pricing rules unavailable"
      onRetry={() => rules.refetch()}
    >
      <Card className="max-w-3xl p-6">
        <h2 className="font-display text-lg font-semibold text-ink">How pricing works</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{rules.data?.note}</p>
        <h3 className="mt-6 font-display text-base font-semibold text-ink">
          Active discounts ({rules.data?.activeDiscounts.length ?? 0})
        </h3>
        {(rules.data?.activeDiscounts ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">No active discounts right now.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {(rules.data?.activeDiscounts ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-semibold text-ink">Product #{d.productId} — {d.discountPercent}% off</span>
                <span className="text-xs text-muted">{fmtDate(d.validFrom)} → {fmtDate(d.validUntil)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">
          Pricing rules are read-only here — farmers set their own base prices and discounts; every price change is logged.
        </p>
      </Card>
    </QueryState>
  );
}

function SubscriptionsTab() {
  const subs = useSubscriptions();
  const update = useUpdateSubscription();
  return (
    <QueryState
      isLoading={subs.isLoading}
      isError={subs.isError}
      error={subs.error}
      isEmpty={!subs.data || subs.data.length === 0}
      emptyTitle="No subscriptions"
      onRetry={() => subs.refetch()}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(subs.data ?? []).map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-base font-semibold text-ink">Subscription #{s.id}</p>
              <StatusBadge status={s.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {s.farmName ?? `Farm #${s.farmId}`}{s.productName ? ` · ${s.productName}` : ""} · {s.frequency}
            </p>
            <p className="text-xs text-muted">Started {fmtDate(s.createdAt)}</p>
            {s.status === "active" && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => update.mutate({ id: s.id, body: { status: "cancelled" } })} loading={update.isPending}>
                Cancel subscription
              </Button>
            )}
          </Card>
        ))}
      </div>
    </QueryState>
  );
}
