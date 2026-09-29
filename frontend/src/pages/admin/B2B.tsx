import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { QueryState, StatusBadge, fmtDate, fmtDateTime } from "../../features/portal/components";
import { useBulkRequests } from "../../features/portal/apiCommerce";
import { formatPKR } from "../../lib/formatters";

export function AdminB2B() {
  const requests = useBulkRequests();

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="B2B oversight"
        description="All bulk purchase requests and their quotation activity — read-only oversight."
      />
      <QueryState
        isLoading={requests.isLoading}
        isError={requests.isError}
        error={requests.error}
        isEmpty={!requests.data || requests.data.length === 0}
        emptyTitle="No bulk requests"
        onRetry={() => requests.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(requests.data ?? []).map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-base font-semibold text-ink">
                  {r.productName ?? `Product #${r.productId}`}
                </p>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1 text-sm text-muted">
                Buyer: {r.buyerName ?? `#${r.buyerId}`} · {r.quantityRequested} units
                {r.targetPrice !== null ? ` · target ${formatPKR(r.targetPrice)}/unit` : ""}
              </p>
              <p className="mt-1 text-xs text-muted">
                {r.quotationCount} quotation{r.quotationCount === 1 ? "" : "s"}
                {r.deadline ? ` · deadline ${fmtDate(r.deadline)}` : ""} · {fmtDateTime(r.createdAt)}
              </p>
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
