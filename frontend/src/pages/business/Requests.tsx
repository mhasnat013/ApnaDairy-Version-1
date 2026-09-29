import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmAction, Field, FilterBar, FilterSelect, FormModal, QueryState, StatusBadge, fmtDate, inputCls } from "../../features/portal/components";
import { useBulkRequests, useCreateBulkRequest, useProducts, useUpdateBulkRequest } from "../../features/portal/apiCommerce";
import { formatPKR } from "../../lib/formatters";

const schema = z.object({
  productId: z.coerce.number().int().positive("Choose a product"),
  quantityRequested: z.coerce.number().positive("Quantity must be positive"),
  targetPrice: z.coerce.number().positive("Target price must be positive").optional(),
  deadline: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function BusinessRequests() {
  const requests = useBulkRequests();
  const create = useCreateBulkRequest();
  const update = useUpdateBulkRequest();
  const products = useProducts({ status: "active", limit: 100 });
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const filtered = (requests.data ?? []).filter((r) => !status || r.status === status);

  const submit = async (v: FormValues) => {
    setError(null);
    try {
      await create.mutateAsync({
        productId: v.productId,
        quantityRequested: v.quantityRequested,
        targetPrice: v.targetPrice || undefined,
        deadline: v.deadline ? new Date(v.deadline).toISOString() : undefined,
      });
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post the request.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="B2B"
        title="Bulk requests"
        description="Request bulk quantities of a marketplace product — verified farms submit quotations."
        actions={<Button onClick={() => { setError(null); reset(); setOpen(true); }}>New request</Button>}
      />
      <FilterBar>
        <FilterSelect
          value={status}
          onChange={setStatus}
          label="Filter by status"
          options={[
            { value: "", label: "All statuses" },
            { value: "open", label: "Open" },
            { value: "fulfilled", label: "Fulfilled" },
            { value: "cancelled", label: "Cancelled" },
            { value: "expired", label: "Expired" },
          ]}
        />
      </FilterBar>
      <QueryState
        isLoading={requests.isLoading}
        isError={requests.isError}
        error={requests.error}
        isEmpty={filtered.length === 0}
        emptyTitle="No requests"
        emptyHint="Post your first bulk request to start receiving quotations."
        emptyIcon={<ClipboardList className="h-7 w-7" aria-hidden="true" />}
        emptyAction={<Button onClick={() => { reset(); setOpen(true); }}>New request</Button>}
        onRetry={() => requests.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to={`/app/business/requests/${r.id}`} className="font-display text-base font-semibold text-ink hover:text-brand">
                    {r.productName ?? `Product #${r.productId}`}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {r.quantityRequested} units requested
                    {r.targetPrice !== null ? ` · target ${formatPKR(r.targetPrice)}/unit` : ""}
                  </p>
                  <p className="text-xs text-muted">
                    {r.deadline ? `Deadline ${fmtDate(r.deadline)} · ` : ""}{r.quotationCount} quotation{r.quotationCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={r.status} />
                  {r.status === "open" && (
                    <ConfirmAction
                      title="Cancel request"
                      message="Cancel this bulk request? Farmers will no longer be able to quote."
                      confirmLabel="Cancel request"
                      onConfirm={() => update.mutate({ id: r.id, body: { status: "cancelled" } })}
                    >
                      <Button variant="ghost" size="sm" className="text-danger">Cancel</Button>
                    </ConfirmAction>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </QueryState>

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="New bulk request"
        description="Choose an active marketplace product and the quantity you need."
        onSubmit={handleSubmit(submit)}
        submitLabel="Post request"
        loading={create.isPending}
        error={error}
      >
        <Field label="Product" error={errors.productId?.message}>
          <select {...register("productId")} className={inputCls} aria-label="Product">
            <option value="">Select a product…</option>
            {(products.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.farmName ?? "farm"}) — {formatPKR(p.price)}/{p.unitOfMeasure}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity requested" error={errors.quantityRequested?.message}>
            <input {...register("quantityRequested")} type="number" min={0} step="any" className={inputCls} />
          </Field>
          <Field label="Target price / unit (PKR, optional)" error={errors.targetPrice?.message}>
            <input {...register("targetPrice")} type="number" min={0} step="any" className={inputCls} />
          </Field>
        </div>
        <Field label="Deadline (optional)" error={errors.deadline?.message}>
          <input {...register("deadline")} type="date" className={inputCls} />
        </Field>
      </FormModal>
    </div>
  );
}
