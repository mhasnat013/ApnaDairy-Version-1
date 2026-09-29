import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Handshake } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmAction, DetailRow, QueryState, StatusBadge, fmtDate, fmtDateTime } from "../../features/portal/components";
import { useAcceptQuotation, useBulkRequest, useRejectQuotation, useRequestQuotations, useUpdateBulkRequest } from "../../features/portal/apiCommerce";
import { formatPKR } from "../../lib/formatters";

export function BusinessRequestDetail() {
  const rawId = useParams().id;
  const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : undefined;
  const request = useBulkRequest(id);
  const quotations = useRequestQuotations(id);
  const accept = useAcceptQuotation();
  const reject = useRejectQuotation();
  const update = useUpdateBulkRequest();

  const [sort, setSort] = useState<"price" | "date">("price");
  const quotes = (quotations.data ?? []).slice().sort((a, b) =>
    sort === "price" ? a.bidPrice - b.bidPrice : new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime(),
  );

  return (
    <div>
      <Link to="/app/business/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to requests
      </Link>
      <QueryState
        isLoading={request.isLoading}
        isError={request.isError}
        error={request.error}
        isEmpty={!request.data}
        emptyTitle="Request not found"
        onRetry={() => request.refetch()}
      >
        {request.data && (
          <div>
            <PageHeader
              eyebrow={`Request #${request.data.id}`}
              title={request.data.productName ?? `Product #${request.data.productId}`}
              description={`${request.data.quantityRequested} units requested${request.data.targetPrice !== null ? ` · target ${formatPKR(request.data.targetPrice)}/unit` : ""}${request.data.deadline ? ` · deadline ${fmtDate(request.data.deadline)}` : ""}`}
              actions={
                request.data.status === "open" ? (
                  <ConfirmAction
                    title="Cancel request"
                    message="Cancel this bulk request? Farmers will no longer be able to quote."
                    confirmLabel="Cancel request"
                    onConfirm={() => update.mutate({ id: request.data!.id, body: { status: "cancelled" } })}
                  >
                    <Button variant="outline" className="text-danger">Cancel request</Button>
                  </ConfirmAction>
                ) : undefined
              }
            />
            <Card className="mb-6 max-w-3xl p-6">
              <dl>
                <DetailRow label="Status"><StatusBadge status={request.data.status} /></DetailRow>
                <DetailRow label="Buyer">{request.data.buyerName ?? "—"}</DetailRow>
                <DetailRow label="Quotations received">{request.data.quotationCount}</DetailRow>
                <DetailRow label="Created">{fmtDateTime(request.data.createdAt)}</DetailRow>
              </dl>
            </Card>

            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Handshake className="h-5 w-5 text-brand" aria-hidden="true" /> Quotations
              </h2>
              <div className="flex gap-2 text-sm">
                <button type="button" onClick={() => setSort("price")} className={`rounded-full px-3 py-1.5 font-semibold ${sort === "price" ? "bg-brand text-white" : "bg-white text-muted"}`} aria-pressed={sort === "price"}>
                  Best price
                </button>
                <button type="button" onClick={() => setSort("date")} className={`rounded-full px-3 py-1.5 font-semibold ${sort === "date" ? "bg-brand text-white" : "bg-white text-muted"}`} aria-pressed={sort === "date"}>
                  Newest
                </button>
              </div>
            </div>

            <QueryState
              isLoading={quotations.isLoading}
              isError={quotations.isError}
              error={quotations.error}
              isEmpty={quotes.length === 0}
              emptyTitle="No quotations yet"
              emptyHint="Farmer quotations will appear here for comparison."
              onRetry={() => quotations.refetch()}
            >
              <div className="grid gap-4 md:grid-cols-2">
                {quotes.map((q, i) => (
                  <Card key={q.id} className={`p-5 ${i === 0 && sort === "price" ? "ring-2 ring-brand/40" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-xl font-bold text-brand">{formatPKR(q.bidPrice)}<span className="text-sm font-medium text-muted">/unit</span></p>
                      <StatusBadge status={q.status} />
                    </div>
                    {i === 0 && sort === "price" && (
                      <p className="mt-1 text-xs font-semibold text-brand">Lowest bid</p>
                    )}
                    <p className="mt-2 text-sm text-muted">
                      {q.farmName ?? "Farm"} · {q.quantityOffered} units offered · {fmtDateTime(q.submittedAt)}
                    </p>
                    <div className="mt-4 flex gap-2">
                      {q.status === "submitted" ? (
                        <>
                          <Button size="sm" onClick={() => accept.mutate(q.id)} loading={accept.isPending}>Accept</Button>
                          <Button variant="outline" size="sm" onClick={() => reject.mutate(q.id)} loading={reject.isPending}>Reject</Button>
                        </>
                      ) : (
                        <p className="text-xs text-muted">This quotation has been {q.status}.</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </QueryState>
          </div>
        )}
      </QueryState>
    </div>
  );
}
