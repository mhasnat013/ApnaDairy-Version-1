import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, inputCls } from "../../features/portal/components";
import { useCreateFarm, useMyFarm } from "../../features/portal/apiCore";
import { OnboardingPage } from "../shared/Onboarding";

const schema = z.object({
  farmName: z.string().min(2, "Farm name needs at least 2 characters").max(255),
  location: z.string().min(2, "Location needs at least 2 characters").max(512),
  description: z.string().max(2000).optional(),
  capacityLiters: z.coerce.number().nonnegative().optional(),
});

type FormValues = z.infer<typeof schema>;

function FarmCreateForm() {
  const create = useCreateFarm();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const submit = async (v: FormValues) => {
    setError(null);
    try {
      await create.mutateAsync({
        farmName: v.farmName,
        location: v.location,
        description: v.description || undefined,
        capacityLiters: v.capacityLiters || undefined,
      });
      navigate("/app/farmer/profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't register the farm.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Onboarding"
        title="Register your farm"
        description="Tell us about your dairy farm. An administrator verifies every farm before it goes live."
      />
      <Card className="max-w-2xl p-6 sm:p-8">
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <Field label="Farm name" error={errors.farmName?.message}>
            <input {...register("farmName")} className={inputCls} placeholder="e.g. Green Valley Dairy Farm" />
          </Field>
          <Field label="Location" error={errors.location?.message} hint="Village/town, tehsil, district">
            <input {...register("location")} className={inputCls} placeholder="e.g. Muridke, Sheikhupura" />
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <textarea {...register("description")} rows={3} className={inputCls + " h-auto py-3"} placeholder="Herd size, breeds, milking routine…" />
          </Field>
          <Field label="Daily capacity (liters)" error={errors.capacityLiters?.message}>
            <input {...register("capacityLiters")} type="number" min={0} step="any" className={inputCls} placeholder="e.g. 200" />
          </Field>
          {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>}
          <Button type="submit" loading={create.isPending}>Submit for verification</Button>
        </form>
      </Card>
    </div>
  );
}

export function FarmerOnboarding() {
  const { myFarm } = useMyFarm();
  if (!myFarm) return <FarmCreateForm />;
  return (
    <OnboardingPage
      role="farmer"
      title="Farm onboarding"
      steps={[
        { label: "Create your account", done: true },
        { label: `Register farm “${myFarm.name}”`, done: true },
        { label: "Farm verification by ApnaDairy", done: myFarm.verificationStatus === "verified", to: "/app/farmer/profile", actionLabel: "View status" },
        { label: "Record your first milk batch", done: false, to: "/app/farmer/batches", actionLabel: "Record batch" },
      ]}
    />
  );
}
