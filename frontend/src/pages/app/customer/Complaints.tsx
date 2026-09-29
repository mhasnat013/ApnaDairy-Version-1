import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircle } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Field, FilterBar, FilterSelect, FormModal, QueryState, StatusBadge, fmtDate, inputCls } from "../../../features/portal/components";
import { useComplaints, useCreateComplaint } from "../../../features/portal/apiEngagement";
import { useOrders } from "../../../features/portal/apiCommerce";

const schema = z.object({
  subject: z.string().min(4, "Subject needs at least 4 characters").max(255),
  description: z.string().min(10, "Please describe the issue in at least 10 characters"),
  orderId: z.coerce.number().int().positive().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CustomerComplaints() {
  const [status, setStatus] = useState("");
  const complaints = useComplaints(status || undefined);
  const orders = useOrders();
  const create = useCreateComplaint();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const submit = async (v: FormValues) => {
    setError(null);
    try {
      await create.mutateAsync({ subject: v.subject, description: v.description, orderId: v.orderId || undefined });
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't file the complaint.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Help"
        title="Complaints"
        description="Raise and follow up on issues with orders or products."
        actions={<Button onClick={() => setOpen(true)}>New complaint</Button>}
      />
      <FilterBar>
        <FilterSelect
          value={status}
          onChange={setStatus}
          label="Filter by status"
          options={[
            { value: "", label: "All statuses" },
            { value: "open", label: "Open" },
            { value: "in_review", label: "In review" },
            { value: "resolved", label: "Resolved" },
            { value: "closed", label: "Closed" },
          ]}
        />
      </FilterBar>
      <QueryState
        isLoading={complaints.isLoading}
        isError={complaints.isError}
        error={complaints.error}
        isEmpty={!complaints.data || complaints.data.length === 0}
        emptyTitle="No complaints"
        emptyHint="No complaints filed — we hope it stays that way."
        emptyIcon={<MessageCircle className="h-7 w-7" aria-hidden="true" />}
        emptyAction={<Button onClick={() => setOpen(true)}>New complaint</Button>}
        onRetry={() => complaints.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(complaints.data ?? []).map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-base font-semibold text-ink">{c.subject}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.description}</p>
              <p className="mt-3 text-xs text-muted">
                Filed {fmtDate(c.createdAt)}
                {c.orderId ? ` · Order #${c.orderId}` : ""}
                {c.resolvedAt ? ` · Resolved ${fmtDate(c.resolvedAt)}` : ""}
              </p>
            </Card>
          ))}
        </div>
      </QueryState>

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="New complaint"
        description="Describe the issue — our team reviews every complaint."
        onSubmit={handleSubmit(submit)}
        submitLabel="File complaint"
        loading={create.isPending}
        error={error}
      >
        <Field label="Subject" error={errors.subject?.message}>
          <input {...register("subject")} className={inputCls} placeholder="e.g. Sour milk delivered" />
        </Field>
        <Field label="Related order (optional)" error={errors.orderId?.message}>
          <select {...register("orderId")} className={inputCls} aria-label="Related order">
            <option value="">No specific order</option>
            {(orders.data ?? []).map((o) => (
              <option key={o.id} value={o.id}>Order #{o.id} — {fmtDate(o.orderDate)}</option>
            ))}
          </select>
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <textarea {...register("description")} rows={4} className={inputCls + " h-auto py-3"} placeholder="What happened, when, and what would resolve it…" />
        </Field>
      </FormModal>
    </div>
  );
}
