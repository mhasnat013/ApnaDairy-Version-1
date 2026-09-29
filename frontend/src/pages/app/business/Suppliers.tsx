import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, Star, Tractor } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { QueryState } from "../../../features/portal/components";
import { useFarms, PAGE_SIZE } from "../../../features/portal/apiCore";
import { Pagination } from "../../../features/portal/components";

export function BusinessSuppliers() {
  const [page, setPage] = useState(0);
  const farms = useFarms({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });

  return (
    <div>
      <PageHeader
        eyebrow="B2B"
        title="Suppliers"
        description="Verified dairy farms on the ApnaDairy network — potential partners for your procurement."
      />
      <QueryState
        isLoading={farms.isLoading}
        isError={farms.isError}
        error={farms.error}
        isEmpty={!farms.data || farms.data.length === 0}
        emptyTitle="No suppliers"
        emptyHint="Verified farms will be listed here."
        emptyIcon={<Tractor className="h-7 w-7" aria-hidden="true" />}
        onRetry={() => farms.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(farms.data ?? []).map((f) => (
            <Card key={f.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-ink">{f.name}</h2>
                {f.verificationStatus === "verified" && (
                  <Badge tone="mint"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified</Badge>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <MapPin className="h-4 w-4" aria-hidden="true" /> {f.location}
              </p>
              <p className="mt-2 flex items-center gap-3 text-sm">
                {f.ratingAvg !== null && (
                  <span className="inline-flex items-center gap-1 font-semibold text-ink">
                    <Star className="h-4 w-4 text-amber" aria-hidden="true" /> {f.ratingAvg.toFixed(1)}
                  </span>
                )}
                {f.capacityLiters && <span className="text-muted">{f.capacityLiters} L/day</span>}
              </p>
              {f.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{f.description}</p>}
            </Card>
          ))}
        </div>
        <Pagination
          page={page + 1}
          pageCount={(farms.data ?? []).length < PAGE_SIZE ? page + 1 : page + 2}
          onPage={(p) => setPage(p - 1)}
        />
      </QueryState>
      <div className="mt-6">
        <Link to="/app/business/requests"><Button>Post a bulk request</Button></Link>
      </div>
    </div>
  );
}
