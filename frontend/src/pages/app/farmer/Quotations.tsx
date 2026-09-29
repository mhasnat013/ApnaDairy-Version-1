import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Handshake } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Field, FormModal, QueryState, StatusBadge, fmtDate, fmtDateTime, inputCls } from "../../../features/portal/components";
import { useBulkRequests, useCreateQuotation, useMyQuotations } from "../../../features/portal/apiCommerce";
import { formatPKR } from "../../../lib/formatters";

const quoteSchema = z.object({
  bidPrice: z.coerce.number().positive("Bid price must be positive"),
  quantityOffered: z.coerce.number().positive("Quantity must be positive"),
});

export function FarmerQuotations() {
  const quotes = useMyQuotations();
  const requests = useBulkRequests("open");
  const createQuote = useCreateQuotation();

  const [quoteFor, setQuoteFor] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const quoteForm = useForm<z.infer<typeof quoteSchema>>({ resolver: zodResolver(quoteSchema) });

  const openRequests = (requests.data ?? []).filter((r) => r.status === "open");
  const openRequest = openRequests.find((r) => r.id === quoteFor);

  const submitQuote = async (v: z.infer<typeof quoteSchema>) => {
    if (quoteFor === null) return;
    setQuoteError(null);
    try {
      await createQuote.mutateAsync({
        requestId: quoteFor,
        body: { bidPrice: v.bidPrice, quantityOffered: v.quantityOffered },
      });
      setQuoteFor(null);
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Couldn't submit the quotation.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="B2B"
        title="Bulk quotations"
        description="Open buyer requests you can quote on, plus your submitted quotations."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Open requests</h2>
          <QueryState
            isLoading={requests.isLoading}
            isError={requests.isError}
            error={requests.error}
            isEmpty={openRequests.length === 0}
            emptyTitle="No open requests"
            emptyHint="Bulk buyers' requests will appear here."
            onRetry={() => requests.refetch()}
          >
            <ul className="space-y-3">
              {openRequests.map((r) => (
                <Card key={r.id} className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{r.productName ?? `Product #${r.productId}`}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {r.quantityRequested} units wanted
                    {r.targetPrice !== null ? ` · target ${formatPKR(r.targetPrice)}/unit` : ""}
                    {r.deadline ? ` · deadline ${fmtDate(r.deadline)}` : ""}
                  </p>
                  <p className="text-xs text-muted">{r.quotationCount} quotation{r.quotationCount === 1 ? "" : "s"} so far</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => { setQuoteError(null); quoteForm.reset(); setQuoteFor(r.id); }}>
                    Submit quotation
                  </Button>
                </Card>
              ))}
            </ul>
          </QueryState>
        </div>

        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">My quotations</h2>
          <QueryState
            isLoading={quotes.isLoading}
            isError={quotes.isError}
            error={quotes.error}
            isEmpty={!quotes.data || quotes.data.length === 0}
            emptyTitle="No quotations yet"
            emptyHint="Quote on an open request to start a deal."
            emptyIcon={<Handshake className="h-7 w-7" aria-hidden="true" />}
            onRetry={() => quotes.refetch()}
          >
            <ul className="space-y-3">
              {(quotes.data ?? []).map((q) => (
                <Card key={q.id} className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">Quotation #{q.id} · request #{q.requestId}</p>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Bid {formatPKR(q.bidPrice)}/unit × {q.quantityOffered} units · submitted {fmtDateTime(q.submittedAt)}
                  </p>
                </Card>
              ))}
            </ul>
          </QueryState>
        </div>
      </div>

      <FormModal
        open={quoteFor !== null}
        onClose={() => setQuoteFor(null)}
        title="Submit quotation"
        description={
          openRequest
            ? `${openRequest.productName ?? "Product"} — ${openRequest.quantityRequested} units wanted${openRequest.targetPrice !== null ? `, target ${formatPKR(openRequest.targetPrice)}/unit` : ""}. Only verified farms can quote; one quotation per request.`
            : undefined
        }
        onSubmit={quoteForm.handleSubmit(submitQuote)}
        submitLabel="Submit quotation"
        loading={createQuote.isPending}
        error={quoteError}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bid price / unit (PKR)" error={quoteForm.formState.errors.bidPrice?.message}>
            <input {...quoteForm.register("bidPrice")} type="number" min={0} step="any" className={inputCls} />
          </Field>
          <Field label="Quantity offered" error={quoteForm.formState.errors.quantityOffered?.message}>
            <input {...quoteForm.register("quantityOffered")} type="number" min={0} step="any" className={inputCls} />
          </Field>
        </div>
      </FormModal>
    </div>
  );
}
