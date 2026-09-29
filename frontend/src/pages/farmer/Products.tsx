import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Package, Pencil } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmAction, Field, FormModal, QueryState, StatusBadge, inputCls } from "../../features/portal/components";
import { useArchiveProduct, useCreateProduct, useProducts, useUpdateProduct } from "../../features/portal/apiCommerce";
import { useMyFarm } from "../../features/portal/apiCore";
import { formatPKR } from "../../lib/formatters";
import type { Product } from "../../features/portal/types";

const CATEGORIES = ["Milk", "Yogurt", "Butter", "Ghee", "Cheese", "Other"];
const UNITS = ["liter", "kg", "g", "pack", "bottle"];
const STATUSES = ["draft", "active", "out_of_stock"];

const schema = z.object({
  name: z.string().min(2, "Name needs at least 2 characters").max(255),
  category: z.string().min(1, "Category is required").max(128),
  unitOfMeasure: z.string().min(1, "Unit is required").max(32),
  price: z.coerce.number().positive("Price must be positive"),
  quantityAvailable: z.coerce.number().min(0, "Stock can't be negative"),
  description: z.string().max(2000).optional(),
  status: z.enum(["draft", "active", "out_of_stock"]),
});

type FormValues = z.infer<typeof schema>;

export function FarmerProducts() {
  const { myFarm } = useMyFarm();
  const products = useProducts({ farmId: myFarm?.id, limit: 100 });
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const archive = useArchiveProduct();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    reset({ name: "", category: "Milk", unitOfMeasure: "liter", price: undefined, quantityAvailable: 0, description: "", status: "active" });
    setEditing(null);
    setError(null);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    reset({
      name: p.name,
      category: p.category,
      unitOfMeasure: p.unitOfMeasure,
      price: p.price,
      quantityAvailable: p.quantityAvailable,
      description: p.description ?? "",
      status: (STATUSES.includes(p.status) ? p.status : "active") as FormValues["status"],
    });
    setEditing(p);
    setError(null);
    setOpen(true);
  };

  const submit = async (v: FormValues) => {
    setError(null);
    const body = {
      name: v.name,
      category: v.category,
      unitOfMeasure: v.unitOfMeasure,
      price: v.price,
      quantityAvailable: v.quantityAvailable,
      description: v.description || undefined,
      status: v.status,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, body });
      else await create.mutateAsync(body);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the product.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="List what your farm produces and manage stock."
        actions={myFarm ? <Button onClick={openCreate}>Add product</Button> : undefined}
      />
      {!myFarm ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">Register your farm first to list products.</p>
        </Card>
      ) : (
        <QueryState
          isLoading={products.isLoading}
          isError={products.isError}
          error={products.error}
          isEmpty={!products.data || products.data.length === 0}
          emptyTitle="No products yet"
          emptyHint="Add your first product — fresh milk, yogurt, butter or desi ghee."
          emptyIcon={<Package className="h-7 w-7" aria-hidden="true" />}
          emptyAction={<Button onClick={openCreate}>Add product</Button>}
          onRetry={() => products.refetch()}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(products.data ?? []).map((p) => (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-muted">{p.category} · per {p.unitOfMeasure}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-3 font-display text-xl font-bold text-brand">{formatPKR(p.price)}</p>
                <p className="text-xs text-muted">{p.quantityAvailable} available</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </Button>
                  <ConfirmAction
                    title="Archive product"
                    message={`Archive “${p.name}”? It will be hidden from the marketplace.`}
                    confirmLabel="Archive"
                    onConfirm={() => archive.mutate(p.id)}
                  >
                    <Button variant="ghost" size="sm" className="text-danger">
                      <Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive
                    </Button>
                  </ConfirmAction>
                </div>
              </Card>
            ))}
          </div>
        </QueryState>
      )}

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit product" : "Add product"}
        onSubmit={handleSubmit(submit)}
        submitLabel={editing ? "Save changes" : "Add product"}
        loading={create.isPending || update.isPending}
        error={error}
      >
        <Field label="Name" error={errors.name?.message}>
          <input {...register("name")} className={inputCls} placeholder="e.g. Fresh cow milk" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" error={errors.category?.message}>
            <select {...register("category")} className={inputCls} aria-label="Category">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Unit" error={errors.unitOfMeasure?.message}>
            <select {...register("unitOfMeasure")} className={inputCls} aria-label="Unit of measure">
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (PKR)" error={errors.price?.message}>
            <input {...register("price")} type="number" min={0} step="any" className={inputCls} />
          </Field>
          <Field label="Stock available" error={errors.quantityAvailable?.message}>
            <input {...register("quantityAvailable")} type="number" min={0} step="any" className={inputCls} />
          </Field>
        </div>
        <Field label="Status" error={errors.status?.message}>
          <select {...register("status")} className={inputCls} aria-label="Product status">
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <textarea {...register("description")} rows={3} className={inputCls + " h-auto py-3"} />
        </Field>
      </FormModal>
    </div>
  );
}
