import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tag, Trash2 } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { ConfirmAction, Field, FormModal, QueryState, fmtDate, inputCls } from "../../../features/portal/components";
import {
  useChangePrice,
  useCreateDiscount,
  useDeleteDiscount,
  useDiscounts,
  useProducts,
} from "../../../features/portal/apiCommerce";
import { useMyFarm } from "../../../features/portal/apiCore";
import { formatPKR } from "../../../lib/formatters";

const priceSchema = z.object({
  newPrice: z.coerce.number().positive("Price must be positive"),
  reason: z.string().max(512).optional(),
});

const discountSchema = z.object({
  discountPercent: z.coerce.number().min(0, "Can't be negative").max(100, "Can't exceed 100%"),
  reason: z.string().max(512).optional(),
  validFrom: z.string().min(1, "Start date is required"),
  validUntil: z.string().min(1, "End date is required"),
});

function DiscountList({ productId }: { productId: number }) {
  const discounts = useDiscounts(productId);
  const remove = useDeleteDiscount();

  if (discounts.isLoading) return <p className="text-xs text-muted">Loading discounts…</p>;
  if (!discounts.data || discounts.data.length === 0) return <p className="text-xs text-muted">No discounts.</p>;

  return (
    <ul className="mt-2 space-y-2">
      {discounts.data.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl bg-palegreen/60 px-3 py-2 text-xs">
          <span className="font-semibold text-ink">
            {d.discountPercent}% off · {fmtDate(d.validFrom)} → {fmtDate(d.validUntil)}
            {d.reason ? ` · ${d.reason}` : ""}
          </span>
          <ConfirmAction
            title="Delete discount"
            message={`Delete the ${d.discountPercent}% discount?`}
            confirmLabel="Delete"
            danger
            onConfirm={() => remove.mutate(d.id)}
          >
            <Button variant="ghost" size="sm" className="h-7 px-2 text-danger" aria-label={`Delete ${d.discountPercent}% discount`}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </ConfirmAction>
        </li>
      ))}
    </ul>
  );
}

export function FarmerPricing() {
  const { myFarm } = useMyFarm();
  const products = useProducts({ farmId: myFarm?.id, limit: 100 });
  const changePrice = useChangePrice();
  const createDiscount = useCreateDiscount();

  const [priceFor, setPriceFor] = useState<number | null>(null);
  const [discountFor, setDiscountFor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const priceForm = useForm<z.infer<typeof priceSchema>>({ resolver: zodResolver(priceSchema) });
  const discountForm = useForm<z.infer<typeof discountSchema>>({ resolver: zodResolver(discountSchema) });

  const submitPrice = async (v: z.infer<typeof priceSchema>) => {
    if (priceFor === null) return;
    setError(null);
    try {
      await changePrice.mutateAsync({ id: priceFor, newPrice: v.newPrice, reason: v.reason || undefined });
      setPriceFor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update the price.");
    }
  };

  const submitDiscount = async (v: z.infer<typeof discountSchema>) => {
    if (discountFor === null) return;
    setError(null);
    try {
      await createDiscount.mutateAsync({
        productId: discountFor,
        body: {
          discountPercent: v.discountPercent,
          reason: v.reason || undefined,
          validFrom: new Date(v.validFrom).toISOString(),
          validUntil: new Date(v.validUntil).toISOString(),
        },
      });
      setDiscountFor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the discount.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Pricing & discounts"
        description="Change base prices (each change is logged) and schedule percentage discounts."
      />
      {!myFarm ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">Register your farm first to manage pricing.</p>
        </Card>
      ) : (
        <QueryState
          isLoading={products.isLoading}
          isError={products.isError}
          error={products.error}
          isEmpty={!products.data || products.data.length === 0}
          emptyTitle="No products to price"
          emptyHint="Add a product first."
          emptyIcon={<Tag className="h-7 w-7" aria-hidden="true" />}
          onRetry={() => products.refetch()}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {(products.data ?? []).map((p) => (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold text-ink">{p.name}</p>
                    <p className="mt-1 font-display text-2xl font-bold text-brand">{formatPKR(p.price)}</p>
                    <p className="text-xs text-muted">per {p.unitOfMeasure}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setError(null); priceForm.reset({ newPrice: p.price, reason: "" }); setPriceFor(p.id); }}>
                      Set price
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setError(null); discountForm.reset({ discountPercent: 10, reason: "", validFrom: "", validUntil: "" }); setDiscountFor(p.id); }}>
                      Add discount
                    </Button>
                  </div>
                </div>
                <DiscountList productId={p.id} />
              </Card>
            ))}
          </div>
        </QueryState>
      )}

      <FormModal
        open={priceFor !== null}
        onClose={() => setPriceFor(null)}
        title="Change base price"
        description="The change is recorded in the product's price history."
        onSubmit={priceForm.handleSubmit(submitPrice)}
        submitLabel="Save price"
        loading={changePrice.isPending}
        error={error}
      >
        <Field label="New price (PKR)" error={priceForm.formState.errors.newPrice?.message}>
          <input {...priceForm.register("newPrice")} type="number" min={0} step="any" className={inputCls} />
        </Field>
        <Field label="Reason (optional)" error={priceForm.formState.errors.reason?.message}>
          <input {...priceForm.register("reason")} className={inputCls} placeholder="e.g. Seasonal adjustment" />
        </Field>
      </FormModal>

      <FormModal
        open={discountFor !== null}
        onClose={() => setDiscountFor(null)}
        title="Add discount"
        description="A percentage discount active between the two dates."
        onSubmit={discountForm.handleSubmit(submitDiscount)}
        submitLabel="Create discount"
        loading={createDiscount.isPending}
        error={error}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Discount (%)" error={discountForm.formState.errors.discountPercent?.message}>
            <input {...discountForm.register("discountPercent")} type="number" min={0} max={100} step="any" className={inputCls} />
          </Field>
          <Field label="Reason (optional)" error={discountForm.formState.errors.reason?.message}>
            <input {...discountForm.register("reason")} className={inputCls} />
          </Field>
          <Field label="Valid from" error={discountForm.formState.errors.validFrom?.message}>
            <input {...discountForm.register("validFrom")} type="date" className={inputCls} />
          </Field>
          <Field label="Valid until" error={discountForm.formState.errors.validUntil?.message}>
            <input {...discountForm.register("validUntil")} type="date" className={inputCls} />
          </Field>
        </div>
      </FormModal>
    </div>
  );
}
