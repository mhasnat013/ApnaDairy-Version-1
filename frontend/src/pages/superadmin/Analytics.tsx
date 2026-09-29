import { useState } from "react";
import { Activity, BrainCircuit, Building2, Radio, Users } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { FilterSelect, QueryState, StatCard } from "../../features/portal/components";
import { useSuperAdminAnalytics } from "../../features/portal/apiSuperAdmin";

export function SuperAdminAnalytics() {
  const [days, setDays] = useState(30);
  const analytics = useSuperAdminAnalytics(days);
  const data = analytics.data;
  return <div>
    <PageHeader eyebrow="Super Admin" title="Platform analytics" description="Account, farm, AI and IoT activity for the selected reporting window." actions={<FilterSelect label="Reporting period" value={String(days)} onChange={(value) => setDays(Number(value))} options={[{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }, { value: "365", label: "Last year" }]} />} />
    <QueryState isLoading={analytics.isLoading} isError={analytics.isError} error={analytics.error} isEmpty={!data} emptyTitle="No analytics available" onRetry={() => analytics.refetch()}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard label="New accounts" value={data?.newUsers ?? 0} icon={<Users className="h-5 w-5" />} /><StatCard label="New farms" value={data?.newFarms ?? 0} icon={<Building2 className="h-5 w-5" />} /><StatCard label="New batches" value={data?.newBatches ?? 0} icon={<Activity className="h-5 w-5" />} /><StatCard label="New cases" value={data?.newCases ?? 0} icon={<Activity className="h-5 w-5" />} /><StatCard label="Sensor readings" value={data?.sensorReadings ?? 0} icon={<Radio className="h-5 w-5" />} /><StatCard label="AI predictions" value={data?.predictions ?? 0} icon={<BrainCircuit className="h-5 w-5" />} /></div>
      <Card className="mt-6 p-6"><h2 className="font-display text-lg font-semibold text-ink">Accounts by role</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(data?.usersByRole ?? {}).map(([role, count]) => <div key={role} className="rounded-xl bg-palegreen/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{role}</p><p className="mt-1 text-2xl font-bold text-ink">{count}</p></div>)}</div></Card>
    </QueryState>
  </div>;
}
