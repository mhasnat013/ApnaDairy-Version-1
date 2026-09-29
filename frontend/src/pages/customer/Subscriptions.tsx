import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Pause, Play, XCircle } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmAction, Field, FormModal, QueryState, StatusBadge, fmtDate, inputCls } from "../../features/portal/components";
import { useCreateSubscription, useSubscriptions, useUpdateSubscription } from "../../features/portal/apiEngagement";
import { useFarms } from "../../features/portal/apiCore";

const schema = z.object({
  farmId: z.coerce.number().int().positive("Choose a farm"),
  frequency: z.enum(["daily", "weekly", "monthly"]),
});

type FormValues = z.infer<typeof schema>;

export function CustomerSubscriptions() {
  const subs = useSubscriptions();
  const farms = useFarms({ verificationStatus: "verified" });
  const create = useCreateSubscription();
  const update = useUpdateSubscription();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { frequency: "daily" },
  });

  const submit = async (v: FormValues) => {
    setError(null);
    try {
      await create.mutateAsync({ farmId: v.farmId, frequency: v.frequency });
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the subscription.");
    }
  };

  const setStatus = (id: number, status: string) => update.mutate({ id, body: { status } });

  return (
    <div>
      <PageHeader
        eyebrow="Subscriptions"
        title="Milk plans"
        description="Daily or weekly milk plans — pause, resume or cancel anytime."
        actions={<Button onClick={() => setOpen(true)}>New subscription</Button>}
      />
      <QueryState
        isLoading={subs.isLoading}
        isError={subs.isError}
        error={subs.error}
        isEmpty={!subs.data || subs.data.length === 0}
        emptyTitle="No subscriptions yet"
        emptyHint="Set up a daily milk plan from a verified farm."
        emptyAction={<Button onClick={() => setOpen(true)}>New subscription</Button>}
        onRetry={() => subs.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(subs.data ?? []).map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-base font-semibold text-ink">{s.farmName ?? `Farm #${s.farmId}`}</p>
                <StatusBadge status={s.status} />
              </div>
              <p className="mt-1 text-sm capitalize text-muted">{s.frequency} plan{s.productName ? ` · ${s.productName}` : ""}</p>
              <p className="mt-1 text-xs text-muted">Started {fmtDate(s.createdAt)}</p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                {s.status.toLowerCase() === "active" ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setStatus(s.id, "paused")} loading={update.isPending}>
                      <Pause className="h-4 w-4" aria-hidden="true" /> Pause
                    </Button>
                    <ConfirmAction title="Cancel subscription" message="Cancel this milk plan? You can start a new one anytime." confirmLabel="Cancel plan" danger onConfirm={() => setStatus(s.id, "cancelled")}>
                      <Button variant="ghost" size="sm" className="text-danger">
                        <XCircle className="h-4 w-4" aria-hidden="true" /> Cancel
                      </Button>
                    </ConfirmAction>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setStatus(s.id, "active")} loading={update.isPending}>
                    <Play className="h-4 w-4" aria-hidden="true" /> Resume
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </QueryState>

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="New milk plan"
        description="Choose a verified farm and how often you want delivery."
        onSubmit={handleSubmit(submit)}
        submitLabel="Start plan"
        loading={create.isPending}
        error={error}
      >
        <Field label="Farm" error={errors.farmId?.message}>
          <select {...register("farmId")} className={inputCls} aria-label="Farm">
            <option value="">Select a farm…</option>
            {(farms.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>{f.name} — {f.location}</option>
            ))}
          </select>
        </Field>
        <Field label="Frequency" error={errors.frequency?.message}>
          <select {...register("frequency")} className={inputCls} aria-label="Frequency">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </Field>
        <p className="flex items-center gap-2 text-xs text-muted">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          Billing and delivery slots are confirmed by the farm after you subscribe.
        </p>
      </FormModal>
    </div>
  );
}
