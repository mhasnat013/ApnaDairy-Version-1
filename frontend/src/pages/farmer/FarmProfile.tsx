import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Pencil, ShieldCheck, Star } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { DetailRow, Field, FormModal, QueryState, fmtDate, inputCls } from "../../features/portal/components";
import { useMyFarm, useUpdateFarm } from "../../features/portal/apiCore";

const schema = z.object({
  farmName: z.string().min(2).max(255).optional(),
  location: z.string().min(2).max(512).optional(),
  description: z.string().max(2000).optional(),
  capacityLiters: z.coerce.number().nonnegative().optional(),
});

type FormValues = z.infer<typeof schema>;

export function FarmProfile() {
  const { myFarm, isLoading, isError, refetch, error } = useMyFarm();
  const update = useUpdateFarm();
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openEdit = () => {
    reset({
      farmName: myFarm?.name ?? "",
      location: myFarm?.location ?? "",
      description: myFarm?.description ?? "",
      capacityLiters: myFarm?.capacityLiters ?? undefined,
    });
    setFormError(null);
    setEditing(true);
  };

  const submit = async (v: FormValues) => {
    if (!myFarm) return;
    setFormError(null);
    try {
      await update.mutateAsync({
        id: myFarm.id,
        body: {
          farmName: v.farmName || undefined,
          location: v.location || undefined,
          description: v.description || undefined,
          capacityLiters: v.capacityLiters || undefined,
        },
      });
      setEditing(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Couldn't save changes.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Farm"
        title="Farm profile"
        description="How your farm appears to customers and buyers."
        actions={myFarm ? <Button variant="outline" onClick={openEdit}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit</Button> : undefined}
      />
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!myFarm}
        emptyTitle="No farm registered"
        emptyHint="Register your farm to build its public profile."
        emptyAction={<Link to="/app/farmer/onboarding"><Button>Register farm</Button></Link>}
        onRetry={() => refetch()}
      >
        {myFarm && (
          <Card className="max-w-2xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-semibold text-ink">{myFarm.name}</h2>
              {myFarm.verificationStatus === "verified" ? (
                <Badge tone="mint"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified farm</Badge>
              ) : (
                <Badge tone="amber">Verification {myFarm.verificationStatus}</Badge>
              )}
              {myFarm.ratingAvg !== null && (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink">
                  <Star className="h-4 w-4 text-amber" aria-hidden="true" /> {myFarm.ratingAvg.toFixed(1)}
                </span>
              )}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="h-4 w-4" aria-hidden="true" /> {myFarm.location}
            </p>
            {myFarm.description && <p className="mt-4 text-sm leading-relaxed text-ink">{myFarm.description}</p>}
            <dl className="mt-6">
              <DetailRow label="Daily capacity">{myFarm.capacityLiters ? `${myFarm.capacityLiters} L` : "—"}</DetailRow>
              <DetailRow label="Established">{fmtDate(myFarm.establishedDate)}</DetailRow>
              <DetailRow label="Registered">{fmtDate(myFarm.createdAt)}</DetailRow>
            </dl>
          </Card>
        )}
      </QueryState>

      <FormModal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit farm profile"
        onSubmit={handleSubmit(submit)}
        submitLabel="Save changes"
        loading={update.isPending}
        error={formError}
      >
        <Field label="Farm name" error={errors.farmName?.message}>
          <input {...register("farmName")} className={inputCls} />
        </Field>
        <Field label="Location" error={errors.location?.message}>
          <input {...register("location")} className={inputCls} />
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <textarea {...register("description")} rows={3} className={inputCls + " h-auto py-3"} />
        </Field>
        <Field label="Daily capacity (liters)" error={errors.capacityLiters?.message}>
          <input {...register("capacityLiters")} type="number" min={0} step="any" className={inputCls} />
        </Field>
      </FormModal>
    </div>
  );
}
