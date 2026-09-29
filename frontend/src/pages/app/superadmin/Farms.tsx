import { useState } from "react";
import { Building2 } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { FilterBar, FilterSelect, QueryState, StatusBadge, fmtDate } from "../../../features/portal/components";
import { useSuperAdminFarms } from "../../../features/portal/apiSuperAdmin";

export function SuperAdminFarms() {
  const [status, setStatus] = useState("");
  const farms = useSuperAdminFarms(status || undefined);
  return (
    <div>
      <PageHeader eyebrow="Super Admin" title="Farm directory" description="Governance view of every registered farm and its verification state." />
      <FilterBar><FilterSelect label="Verification status" value={status} onChange={setStatus} options={[{ value: "", label: "All statuses" }, { value: "pending", label: "Pending" }, { value: "verified", label: "Verified" }, { value: "rejected", label: "Rejected" }]} /></FilterBar>
      <QueryState isLoading={farms.isLoading} isError={farms.isError} error={farms.error} isEmpty={!farms.data?.length} emptyTitle="No farms found" emptyHint="No farms match this verification filter." emptyIcon={<Building2 className="h-7 w-7" />} onRetry={() => farms.refetch()}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(farms.data ?? []).map((farm) => <Card key={farm.id} className="p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-semibold text-ink">{farm.farmName}</h2><p className="text-sm text-muted">{farm.location}</p></div><StatusBadge status={farm.verificationStatus} /></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted">Owner ID</dt><dd className="font-semibold text-ink">#{farm.ownerId}</dd></div><div><dt className="text-xs text-muted">Capacity</dt><dd className="font-semibold text-ink">{farm.capacityLiters == null ? "Not supplied" : `${farm.capacityLiters} L`}</dd></div></dl>
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">Registered {fmtDate(farm.createdAt)}</p>
          </Card>)}
        </div>
      </QueryState>
    </div>
  );
}
