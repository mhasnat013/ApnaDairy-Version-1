import { useState } from "react";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
  Field,
  FilterBar,
  FilterSelect,
  FormModal,
  QueryState,
  SearchInput,
  StatusBadge,
  fmtDateTime,
  inputCls,
} from "../../features/portal/components";
import {
  type GovernanceCase,
  useGovernanceCases,
  useUpdateGovernanceCase,
} from "../../features/portal/apiSuperAdmin";
import { useComplaints, useUpdateComplaint } from "../../features/portal/apiEngagement";

type Tab = "escalations" | "complaints";

export function SuperAdminCases() {
  const [tab, setTab] = useState<Tab>("escalations");
  return (
    <div>
      <PageHeader
        eyebrow="Super Admin"
        title="Cases"
        description="Escalations and complaints are reviewed in one place without duplicate pages."
      />
      <div className="mb-6 flex gap-2" role="tablist" aria-label="Case sections">
        {([['escalations', 'Escalations'], ['complaints', 'Complaints']] as Array<[Tab, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-brand text-white" : "bg-white text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "escalations" ? <Escalations /> : <Complaints />}
    </div>
  );
}

function Escalations() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GovernanceCase | null>(null);
  const [nextStatus, setNextStatus] = useState("in_review");
  const [priority, setPriority] = useState("normal");
  const [remarks, setRemarks] = useState("");
  const [resolution, setResolution] = useState("");
  const cases = useGovernanceCases({ status: status || undefined, search: search || undefined });
  const update = useUpdateGovernanceCase();

  const open = (item: GovernanceCase) => {
    setSelected(item);
    setNextStatus(item.status);
    setPriority(item.priority);
    setRemarks(item.adminRemarks ?? "");
    setResolution(item.resolutionNotes ?? "");
  };

  return (
    <>
      <FilterBar>
        <SearchInput label="Search cases" value={search} onChange={setSearch} placeholder="Code, title or details…" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "in_review", label: "In review" },
            { value: "awaiting_admin", label: "Awaiting Admin" },
            { value: "resolved", label: "Resolved" },
            { value: "closed", label: "Closed" },
          ]}
        />
      </FilterBar>
      <QueryState
        isLoading={cases.isLoading}
        isError={cases.isError}
        error={cases.error}
        isEmpty={!cases.data?.length}
        emptyTitle="No escalation cases"
        emptyHint="Admin escalations will appear here."
        emptyIcon={<AlertTriangle className="h-7 w-7" />}
        onRetry={() => cases.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(cases.data ?? []).map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold text-brand">{item.caseCode}</p>
                  <h2 className="mt-1 font-semibold text-ink">{item.title}</h2>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{item.description}</p>
              <div className="mt-3 flex flex-wrap gap-2"><StatusBadge status={item.caseType} /><StatusBadge status={item.priority} /></div>
              <p className="mt-3 text-xs text-muted">Raised {fmtDateTime(item.createdAt)}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => open(item)}>Review case</Button>
            </Card>
          ))}
        </div>
      </QueryState>
      <FormModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.caseCode} · ${selected.title}` : "Case"}
        description={selected?.description}
        onSubmit={() => selected && update.mutate(
          { id: selected.id, status: nextStatus, priority, adminRemarks: remarks || undefined, resolutionNotes: resolution || undefined },
          { onSuccess: () => setSelected(null) },
        )}
        submitLabel="Save case"
        loading={update.isPending}
        error={update.error instanceof Error ? update.error.message : null}
      >
        <Field label="Status"><select className={inputCls} value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>{["pending", "in_review", "awaiting_admin", "resolved", "closed"].map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select></Field>
        <Field label="Priority"><select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value)}>{["low", "normal", "high", "urgent"].map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
        <Field label="Admin remarks"><textarea className={`${inputCls} h-24 py-3`} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        <Field label="Resolution notes"><textarea className={`${inputCls} h-24 py-3`} value={resolution} onChange={(e) => setResolution(e.target.value)} required={nextStatus === "resolved" || nextStatus === "closed"} /></Field>
      </FormModal>
    </>
  );
}

function Complaints() {
  const [status, setStatus] = useState("");
  const complaints = useComplaints(status || undefined);
  const update = useUpdateComplaint();
  return (
    <>
      <FilterBar><FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "", label: "All statuses" }, { value: "open", label: "Open" }, { value: "in_review", label: "In review" }, { value: "resolved", label: "Resolved" }, { value: "closed", label: "Closed" }]} /></FilterBar>
      <QueryState isLoading={complaints.isLoading} isError={complaints.isError} error={complaints.error} isEmpty={!complaints.data?.length} emptyTitle="No complaints" emptyHint="User complaints will appear here." emptyIcon={<MessageCircle className="h-7 w-7" />} onRetry={() => complaints.refetch()}>
        <div className="grid gap-4 md:grid-cols-2">{(complaints.data ?? []).map((item) => <Card key={item.id} className="p-5"><div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-ink">{item.subject}</h2><StatusBadge status={item.status} /></div><p className="mt-2 text-sm text-muted">{item.description}</p><p className="mt-3 text-xs text-muted">Filed {fmtDateTime(item.createdAt)}</p><div className="mt-4 flex gap-2">{item.status === "open" && <Button size="sm" onClick={() => update.mutate({ id: item.id, body: { status: "in_review" } })}>Start review</Button>}{!["resolved", "closed"].includes(item.status) && <Button variant="outline" size="sm" onClick={() => update.mutate({ id: item.id, body: { status: "resolved" } })}>Resolve</Button>}</div></Card>)}</div>
      </QueryState>
    </>
  );
}
