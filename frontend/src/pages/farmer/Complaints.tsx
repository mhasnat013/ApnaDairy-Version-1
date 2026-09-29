import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircle } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { DetailRow, Field, FilterBar, FilterSelect, FormModal, QueryState, StatusBadge, fmtDateTime, inputCls } from "../../features/portal/components";
import { useComplaint, useComplaints, useCreateComplaint } from "../../features/portal/apiEngagement";

const schema = z.object({
  subject: z.string().min(3, "Give the complaint a short subject").max(140),
  description: z.string().min(10, "Describe the issue in a little detail").max(2000),
  orderId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function FarmerComplaints() {
  const [status, setStatus] = useState("");
  const complaints = useComplaints(status || undefined);
  const [selected, setSelected] = useState<number | null>(null);
  const detail = useComplaint(selected ?? undefined);
  const create = useCreateComplaint();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const submit = async (v: FormValues) => {
    setError(null);
    try {
      await create.mutateAsync({
        subject: v.subject,
        description: v.description,
        orderId: v.orderId ? Number(v.orderId) : undefined,
      });
      setOpen(false);
      reset();
      complaints.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't file the complaint.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Help"
        title="Complaints"
        description="Complaints you have filed — our support team resolves them."
        actions={<Button onClick={() => { reset(); setError(null); setOpen(true); }}>File complaint</Button>}
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
        emptyHint="Complaints you file will appear here with their resolution status."
        emptyIcon={<MessageCircle className="h-7 w-7" aria-hidden="true" />}
        onRetry={() => complaints.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(complaints.data ?? []).map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-base font-semibold text-ink">{c.subject}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{c.description}</p>
              <p className="mt-3 text-xs text-muted">Filed {fmtDateTime(c.createdAt)}{c.orderId ? ` · Order #${c.orderId}` : ""}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSelected(c.id)}>
                View details
              </Button>
            </Card>
          ))}
        </div>
      </QueryState>

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="File a complaint"
        description="Tell our support team about the issue — they'll follow up."
        onSubmit={handleSubmit(submit)}
        submitLabel="File complaint"
        loading={create.isPending}
        error={error}
      >
        <Field label="Subject" error={errors.subject?.message}>
          <input {...register("subject")} className={inputCls} placeholder="e.g. Payout issue for order #1024" />
        </Field>
        <Field label="Order (optional)" error={errors.orderId?.message}>
          <input {...register("orderId")} type="number" min={1} className={inputCls} placeholder="Related order number" />
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <textarea {...register("description")} rows={4} className={inputCls + " h-auto py-3"} placeholder="What happened?" />
        </Field>
      </FormModal>

      <FormModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={detail.data ? detail.data.subject : "Complaint"}
        description={detail.data ? `Filed ${fmtDateTime(detail.data.createdAt)}${detail.data.orderId ? ` · Order #${detail.data.orderId}` : ""}` : undefined}
        onSubmit={() => setSelected(null)}
        submitLabel="Close"
        loading={false}
      >
        {detail.data && (
          <dl>
            <DetailRow label="Status"><StatusBadge status={detail.data.status} /></DetailRow>
            <DetailRow label="Description">{detail.data.description}</DetailRow>
            {detail.data.resolvedAt && <DetailRow label="Resolved">{fmtDateTime(detail.data.resolvedAt)}</DetailRow>}
          </dl>
        )}
      </FormModal>
    </div>
  );
}
