import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircle, ScrollText } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { DetailRow, Field, FilterBar, FilterSelect, FormModal, QueryState, StatusBadge, fmtDateTime, inputCls } from "../../../features/portal/components";
import { useComplaint, useComplaints, useUpdateComplaint } from "../../../features/portal/apiEngagement";
import { useActionLogs } from "../../../features/portal/apiCore";

const schema = z.object({
  status: z.enum(["open", "in_review", "resolved", "closed"]),
});

type FormValues = z.infer<typeof schema>;

type Tab = "complaints" | "logs";

export function AdminSupport() {
  const [tab, setTab] = useState<Tab>("complaints");
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Support" description="Complaint resolution and the platform action log." />
      <div className="mb-6 flex gap-2" role="tablist" aria-label="Support sections">
        {(
          [
            ["complaints", "Complaints"],
            ["logs", "Action logs"],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
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
      {tab === "complaints" ? <ComplaintsTab /> : <LogsTab />}
    </div>
  );
}

function ComplaintsTab() {
  const [status, setStatus] = useState("");
  const complaints = useComplaints(status || undefined);
  const [selected, setSelected] = useState<number | null>(null);
  const detail = useComplaint(selected ?? undefined);
  const update = useUpdateComplaint();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openDetail = (id: number, currentStatus: string) => {
    setSelected(id);
    reset({ status: currentStatus as FormValues["status"] });
    setError(null);
  };

  const submit = async (v: FormValues) => {
    if (selected === null) return;
    setError(null);
    try {
      await update.mutateAsync({ id: selected, body: { status: v.status } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update the complaint.");
    }
  };

  return (
    <div>
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
        emptyHint="Customer complaints will appear here."
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
              <Button variant="outline" size="sm" className="mt-4" onClick={() => openDetail(c.id, c.status)}>
                Review & resolve
              </Button>
            </Card>
          ))}
        </div>
      </QueryState>

      <FormModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={detail.data ? detail.data.subject : "Complaint"}
        description={detail.data ? `Filed ${fmtDateTime(detail.data.createdAt)}${detail.data.orderId ? ` · Order #${detail.data.orderId}` : ""}` : undefined}
        onSubmit={handleSubmit(submit)}
        submitLabel="Save"
        loading={update.isPending}
        error={error}
      >
        {detail.data && (
          <div className="mb-4">
            <dl>
              <DetailRow label="Description">{detail.data.description}</DetailRow>
            </dl>
          </div>
        )}
        <Field label="Status" error={errors.status?.message}>
          <select {...register("status")} className={inputCls} aria-label="Complaint status">
            {["open", "in_review", "resolved", "closed"].map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </Field>
      </FormModal>
    </div>
  );
}

function LogsTab() {
  const logs = useActionLogs();
  return (
    <QueryState
      isLoading={logs.isLoading}
      isError={logs.isError}
      error={logs.error}
      isEmpty={!logs.data || logs.data.length === 0}
      emptyTitle="No action logs"
      emptyHint="Administrative actions are recorded here."
      emptyIcon={<ScrollText className="h-7 w-7" aria-hidden="true" />}
      onRetry={() => logs.refetch()}
    >
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Admin</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(logs.data ?? []).map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-3"><StatusBadge status={l.action} /></td>
                  <td className="px-5 py-3 font-semibold text-ink">{l.adminName ?? `#${l.adminId}`}</td>
                  <td className="px-5 py-3 text-muted">{l.entityType}{l.entityId ? ` #${l.entityId}` : ""}</td>
                  <td className="px-5 py-3 text-muted">{l.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </QueryState>
  );
}
