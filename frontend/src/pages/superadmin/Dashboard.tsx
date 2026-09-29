import { AlertTriangle, Building2, ShieldCheck, UserCog, Users } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { QueryState, StatCard } from "../../features/portal/components";
import { useSuperAdminDashboard } from "../../features/portal/apiSuperAdmin";

export function SuperAdminDashboard() {
  const dashboard = useSuperAdminDashboard();
  const data = dashboard.data;
  return (
    <div>
      <PageHeader eyebrow="Super Admin" title="Platform governance" description="Account access, farm coverage, escalations and system integrity in one place." />
      <QueryState isLoading={dashboard.isLoading} isError={dashboard.isError} error={dashboard.error} isEmpty={!data} emptyTitle="Dashboard unavailable" onRetry={() => dashboard.refetch()}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Platform accounts" value={data?.totalUsers ?? 0} icon={<Users className="h-5 w-5" />} to="/app/superadmin/users" />
          <StatCard label="Active admins" value={data?.admins ?? 0} icon={<UserCog className="h-5 w-5" />} to="/app/superadmin/users" />
          <StatCard label="Farms" value={data?.farms ?? 0} hint={`${data?.pendingFarms ?? 0} pending verification`} icon={<Building2 className="h-5 w-5" />} to="/app/superadmin/farms" />
          <StatCard label="Open cases" value={data?.openCases ?? 0} hint={`${data?.openComplaints ?? 0} linked complaints`} icon={<AlertTriangle className="h-5 w-5" />} to="/app/superadmin/cases" />
          <StatCard label="Admin applications" value={data?.pendingAdminApplications ?? 0} hint="Awaiting decision" icon={<ShieldCheck className="h-5 w-5" />} to="/app/superadmin/users" />
          <StatCard label="AI anomalies" value={data?.aiAnomalies ?? 0} icon={<AlertTriangle className="h-5 w-5" />} to="/app/superadmin/ai-iot" />
        </div>
        <Card className="mt-6 p-5 text-sm text-muted">
          <span className="font-semibold text-ink">Operational scope:</span> {data?.milkBatches ?? 0} milk batches are currently represented in platform oversight.
        </Card>
      </QueryState>
    </div>
  );
}
