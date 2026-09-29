import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ScanSearch } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { batchCodeSchema, type BatchCodeInput } from "../../../lib/schemas";

/** Portal batch-trace: same lookup, result opens on the public trace page. */
export function CustomerBatchTrace() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BatchCodeInput>({ resolver: zodResolver(batchCodeSchema) });

  const onSubmit = (data: BatchCodeInput) => {
    navigate(`/batch-trace/${encodeURIComponent(data.batchCode.trim().toUpperCase())}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Traceability"
        title="Batch trace"
        description="Enter any batch code to see its farm, journey and freshness record."
      />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-2xl rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8"
        noValidate
      >
        <label htmlFor="portal-batchCode" className="block text-sm font-semibold text-ink">
          Batch code
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="portal-batchCode"
            {...register("batchCode")}
            placeholder="e.g. AD-2026-000123"
            autoComplete="off"
            className="h-12 flex-1 rounded-xl border border-line bg-white px-4 font-mono text-sm uppercase text-ink placeholder:normal-case placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-pine disabled:opacity-60"
          >
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
            Trace
          </button>
        </div>
        {errors.batchCode && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {errors.batchCode.message}
          </p>
        )}
        <p className="mt-4 text-xs text-muted">
          The batch code is printed on the product label and on your order receipt.
        </p>
      </form>
    </div>
  );
}
