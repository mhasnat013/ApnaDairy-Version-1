import { Link } from "react-router-dom";
import { Milk, Gauge, LogIn } from "lucide-react";
import {
  EditorialHero,
  HeroCta,
  ColourBlock,
  EditorialSectionHead,
  DemoBadge,
} from "../../components/public/Editorial";
import { Badge } from "../../components/ui/Badge";
import { Reveal } from "../../components/ui/Reveal";
import { Counter } from "../../components/motion/Counter";
import { useProducts, type Product } from "../../features/public/api";
import { QueryView } from "../../features/public/QueryView";
import { formatCurrency } from "../../lib/formatters";
import { DEMO_LABELS } from "../../lib/constants";

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group card-lift overflow-hidden rounded-2xl border border-line bg-white shadow-card hover:border-brand/40"
    >
      <div className="flex h-40 items-center justify-center bg-palegreen">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Milk className="h-12 w-12 text-brand/25" aria-hidden="true" />
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink group-hover:text-brand">
            {product.name}
          </h2>
          <Badge tone={product.status === "available" ? "mint" : "muted"}>{product.status}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted">
          {product.category} · {product.unitOfMeasure}
          {product.farmName ? ` · ${product.farmName}` : ""}
        </p>
        {product.freshnessScore !== null && product.freshnessScore !== undefined && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-brand-pine">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            Freshness {product.freshnessScore}/100
          </p>
        )}
        <p className="mt-3 font-condensed text-2xl uppercase tracking-wide text-ink">
          {formatCurrency(product.price)}
          <span className="ml-1 font-sans text-xs font-normal normal-case text-muted">/{product.unitOfMeasure}</span>
        </p>
      </div>
    </Link>
  );
}

export function Marketplace() {
  const query = useProducts();
  return (
    <div>
      <EditorialHero
        eyebrow="Marketplace"
        title={"Fresh dairy,\nverified farms"}
        lede="Every listing comes from a verified farm and carries a freshness score from our AI engine."
        actions={
          <>
            <HeroCta to="/for-customers" label="How buying works" variant="outline" />
            <HeroCta to="/login" label="Sign in to purchase" variant="light" />
          </>
        }
        note={<DemoBadge label={DEMO_LABELS.ai} className="bg-white/10 text-ivory ring-white/25" />}
      />

      <ColourBlock tone="ivory">
        <QueryView
          query={query}
          emptyTitle="No products listed yet"
          emptyHint="Products from verified farms will appear here once the marketplace opens."
          emptyIcon={<Milk className="h-7 w-7" aria-hidden="true" />}
        >
          {(products) => (
            <Reveal>
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm text-muted shadow-card">
                <span className="font-condensed text-xl text-brand">
                  <Counter value={products.length} />
                </span>
                verified {products.length === 1 ? "listing" : "listings"} from the network
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          )}
        </QueryView>
      </ColourBlock>

      <ColourBlock tone="forest">
        <EditorialSectionHead
          dark
          eyebrow="Marketplace rules"
          title="Preview freely. Buy signed in."
          lede="Anyone can browse products and open product pages. Purchasing needs an account — and checkout is always labelled honestly."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Milk, title: "View Product", text: "Open any listing for farm, batch, price logic and freshness record." },
            { icon: Gauge, title: "Review Freshness", text: "See the batch reference, verified farm and freshness information on the product page." },
            { icon: LogIn, title: "Login to Purchase", text: "Sign in as a customer to add to cart and check out. No checkout without login." },
          ].map((a, i) => (
            <Reveal
              key={a.title}
              delay={Math.min(i * 0.07, 0.2)}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 sm:p-7"
            >
              <a.icon className="h-7 w-7 text-[#DDF06A]" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold text-ivory">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ivory/65">{a.text}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-8">
          <DemoBadge label={DEMO_LABELS.payment} />
        </div>
      </ColourBlock>
    </div>
  );
}
