import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmAction, Field, FormModal, QueryState, inputCls } from "../../features/portal/components";
import { useCreateReview, useDeleteReview, useReviews } from "../../features/portal/apiEngagement";
import { useFarms } from "../../features/portal/apiCore";
import { useAuthStore } from "../../stores/auth";

const schema = z.object({
  farmId: z.coerce.number().int().positive().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

export function CustomerReviews() {
  const me = useAuthStore((s) => s.user);
  const reviews = useReviews();
  const farms = useFarms({ verificationStatus: "verified" });
  const create = useCreateReview();
  const remove = useDeleteReview();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rating: 5 },
  });

  const submit = async (v: FormValues) => {
    setError(null);
    try {
      await create.mutateAsync({ farmId: v.farmId || undefined, rating: v.rating, comment: v.comment || undefined });
      setOpen(false);
      reset({ rating: 5 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit the review.");
    }
  };

  const mine = (reviews.data ?? []).filter((r) => me && r.userId === me.id);

  return (
    <div>
      <PageHeader
        eyebrow="Feedback"
        title="My reviews"
        description="Ratings and reviews you've left for farms and products."
        actions={<Button onClick={() => setOpen(true)}>Write a review</Button>}
      />
      <QueryState
        isLoading={reviews.isLoading}
        isError={reviews.isError}
        error={reviews.error}
        isEmpty={mine.length === 0}
        emptyTitle="No reviews yet"
        emptyHint="Share your experience with a farm after your order."
        emptyIcon={<Star className="h-7 w-7" aria-hidden="true" />}
        emptyAction={<Button onClick={() => setOpen(true)}>Write a review</Button>}
        onRetry={() => reviews.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {mine.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-ink" aria-label={`Rated ${r.rating} out of 5`}>
                  {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                </p>
                <ConfirmAction title="Delete review" message="Delete this review permanently?" confirmLabel="Delete" danger onConfirm={() => remove.mutate(r.id)}>
                  <Button variant="ghost" size="sm" className="text-danger" aria-label="Delete review">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </ConfirmAction>
              </div>
              {r.comment && <p className="mt-2 text-sm leading-relaxed text-ink">{r.comment}</p>}
              <p className="mt-2 text-xs text-muted">
                {r.farmId ? `Farm #${r.farmId}` : ""}{r.productId ? ` · Product #${r.productId}` : ""}
              </p>
            </Card>
          ))}
        </div>
      </QueryState>

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Write a review"
        onSubmit={handleSubmit(submit)}
        submitLabel="Submit review"
        loading={create.isPending}
        error={error}
      >
        <Field label="Farm" error={errors.farmId?.message}>
          <select {...register("farmId")} className={inputCls} aria-label="Farm">
            <option value="">Select a farm…</option>
            {(farms.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Rating (1–5)" error={errors.rating?.message}>
          <select {...register("rating")} className={inputCls} aria-label="Rating">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>
            ))}
          </select>
        </Field>
        <Field label="Comment" error={errors.comment?.message}>
          <textarea {...register("comment")} rows={4} placeholder="How was the milk quality, delivery, packaging…" className={inputCls + " h-auto py-3"} />
        </Field>
      </FormModal>
    </div>
  );
}
