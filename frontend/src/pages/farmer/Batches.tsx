import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Milk, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmAction, Field, FilterBar, FilterSelect, FormModal, Pagination, QueryState, ScoreRing, StatusBadge, fmtDateTime, inputCls } from "../../features/portal/components";
import { useBatches, useCreateBatch, useDeleteBatch, useMyFarm, PAGE_SIZE } from "../../features/portal/apiCore";

const schema = z.object({
  batchCode: z.string().max(64).optional(),
  milkingTime: z.string().min(1, "Milking time is required"),
  quantityLiters: z.coerce.number().positive("Quantity must be positive"),
  initialStorageTemp: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "collected", label: "Collected" },
  { value: "in_transit", label: "In transit" },
  { value: "processing", label: "Processing" },
  { value: "sold", label: "Sold" },
  { value: "expired", label: "Expired" },
];

export function FarmerBatches() {
  const { myFarm } = useMyFarm();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const batches = useBatches({ farmId: myFarm?.id, status: status || undefined, limit: 100 });
  const create = useCreateBatch();
  const remove = useDeleteBatch();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const all = useMemo(() => batches.data ?? [], [batches.data]);
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const submit = async (v: FormValues) => {
    setError(null);
    try {
      await create.mutateAsync({
        farmId: myFarm?.id,
        batchCode: v.batchCode || undefined,
        milkingTime: new Date(v.milkingTime).toISOString(),
        quantityLiters: v.quantityLiters,
        initialStorageTemp: v.initialStorageTemp,
      });
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't record the batch.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Milk collection"
        title="Milk batches"
        description="Record and manage every milking batch with a unique traceable code."
        actions={myFarm ? <Button onClick={() => setOpen(true)}>Record batch</Button> : undefined}
      />
      {!myFarm ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">Register your farm first to record batches.</p>
          <Link to="/app/farmer/onboarding" className="mt-3 inline-block"><Button>Register farm</Button></Link>
        </Card>
      ) : (
        <>
          <FilterBar>
            <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} label="Filter by status" options={STATUS_OPTIONS} />
          </FilterBar>
          <QueryState
            isLoading={batches.isLoading}
            isError={batches.isError}
            error={batches.error}
            isEmpty={items.length === 0}
            emptyTitle="No batches found"
            emptyHint="Record your first milking batch to start traceability."
            emptyIcon={<Milk className="h-7 w-7" aria-hidden="true" />}
            emptyAction={<Button onClick={() => setOpen(true)}>Record batch</Button>}
            onRetry={() => batches.refetch()}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((b) => (
                <Card key={b.id} className="p-5">
                  <div className="flex items-start gap-4">
                    <ScoreRing score={b.freshnessScore} size={64} />
                    <div className="min-w-0 flex-1">
                      <Link to={`/app/farmer/batches/${b.id}`} className="font-mono text-sm font-bold text-ink hover:text-brand">
                        {b.batchCode}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        {b.quantityLiters} L · milked {fmtDateTime(b.milkingTime)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge status={b.status} />
                        {b.spoilageRisk && <StatusBadge status={b.spoilageRisk} />}
                      </div>
                    </div>
                    <ConfirmAction
                      title="Delete batch"
                      message={`Delete batch ${b.batchCode}? This cannot be undone.`}
                      confirmLabel="Delete"
                      danger
                      onConfirm={() => remove.mutate(b.id)}
                    >
                      <Button variant="ghost" size="sm" className="text-danger" aria-label={`Delete batch ${b.batchCode}`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </ConfirmAction>
                  </div>
                </Card>
              ))}
            </div>
            <Pagination page={page} pageCount={pageCount} onPage={setPage} />
          </QueryState>
        </>
      )}

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Record milk batch"
        description="Log a milking batch. A traceable batch code is generated if you leave it blank."
        onSubmit={handleSubmit(submit)}
        submitLabel="Record batch"
        loading={create.isPending}
        error={error}
      >
        <Field label="Batch code (optional)" error={errors.batchCode?.message} hint="Leave blank to auto-generate">
          <input {...register("batchCode")} className={inputCls + " font-mono uppercase"} placeholder="AD-2026-…" />
        </Field>
        <Field label="Milking time" error={errors.milkingTime?.message}>
          <input {...register("milkingTime")} type="datetime-local" className={inputCls} />
        </Field>
        <Field label="Quantity (liters)" error={errors.quantityLiters?.message}>
          <input {...register("quantityLiters")} type="number" min={0} step="any" className={inputCls} placeholder="e.g. 120" />
        </Field>
        <Field label="Initial storage temp (°C, optional)" error={errors.initialStorageTemp?.message}>
          <input {...register("initialStorageTemp")} type="number" step="any" className={inputCls} placeholder="e.g. 4" />
        </Field>
      </FormModal>
    </div>
  );
}
