import { useState } from "react";
import { ScrollText } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { FilterBar, QueryState, SearchInput, StatusBadge, fmtDateTime } from "../../features/portal/components";
import { useAuditLogs } from "../../features/portal/apiSuperAdmin";

export function SuperAdminAuditLogs() {
  const [action, setAction] = useState("");
  const logs = useAuditLogs({ action: action || undefined });
  return <div>
    <PageHeader eyebrow="Super Admin" title="Audit logs" description="Trace privileged changes made across governance workflows." />
    <FilterBar><SearchInput label="Search actions" placeholder="Search action name…" value={action} onChange={setAction} /></FilterBar>
    <QueryState isLoading={logs.isLoading} isError={logs.isError} error={logs.error} isEmpty={!logs.data?.length} emptyTitle="No audit activity" emptyHint="No audit records match this search." emptyIcon={<ScrollText className="h-7 w-7" />} onRetry={() => logs.refetch()}>
      <Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase tracking-wide text-muted"><th className="px-5 py-3">When</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Entity</th><th className="px-5 py-3">Description</th></tr></thead><tbody className="divide-y divide-line">{(logs.data ?? []).map((log) => <tr key={log.id}><td className="whitespace-nowrap px-5 py-3 text-muted">{fmtDateTime(log.createdAt)}</td><td className="px-5 py-3 font-semibold text-ink">#{log.actorId}</td><td className="px-5 py-3"><StatusBadge status={log.action} /></td><td className="px-5 py-3 text-ink">{log.entityType.replace(/_/g, " ")}{log.entityId != null ? ` #${log.entityId}` : ""}</td><td className="max-w-sm px-5 py-3 text-muted">{log.description ?? "—"}</td></tr>)}</tbody></table></div></Card>
    </QueryState>
  </div>;
}
