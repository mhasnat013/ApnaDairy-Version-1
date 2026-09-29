import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Thermometer } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Field, FilterSelect, FormModal, QueryState, fmtDateTime, inputCls } from "../../../features/portal/components";
import { useBatches, useMyFarm, useReadings, useSimulateReadings } from "../../../features/portal/apiCore";
import { DEMO_LABELS } from "../../../lib/constants";

const schema = z.object({
  hoursBack: z.coerce.number().min(0.5).max(720),
  intervalMinutes: z.coerce.number().min(1).max(1440),
  baseTempC: z.coerce.number().min(-30).max(60),
  excursionCount: z.coerce.number().int().min(0).max(20),
});

type FormValues = z.infer<typeof schema>;

export function FarmerIoT() {
  const { myFarm } = useMyFarm();
  const batches = useBatches({ farmId: myFarm?.id, limit: 50 });
  const [batchId, setBatchId] = useState<number | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const activeBatchId = batchId ?? batches.data?.[0]?.id;
  const readings = useReadings(activeBatchId);
  const simulate = useSimulateReadings();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { hoursBack: 24, intervalMinutes: 30, baseTempC: 4, excursionCount: 0 },
  });

  const chartData = useMemo(
    () =>
      (readings.data ?? [])
        .filter((r) => r.sensorType.toLowerCase().includes("temp"))
        .slice()
        .reverse()
        .map((r) => ({
          t: r.recordedAt ? new Date(r.recordedAt).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "",
          temp: r.readingValue,
        })),
    [readings.data],
  );

  const submit = async (v: FormValues) => {
    if (activeBatchId === undefined) return;
    await simulate.mutateAsync({ batchId: activeBatchId, body: v });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Cold chain"
        title="IoT monitoring"
        description={`${DEMO_LABELS.iot} — temperature readings across your batches.`}
        actions={
          activeBatchId ? <Button onClick={() => setOpen(true)}>Simulate readings</Button> : undefined
        }
      />
      <div className="mb-6 max-w-xs">
        <FilterSelect
          value={String(activeBatchId ?? "")}
          onChange={(v) => setBatchId(v ? Number(v) : undefined)}
          label="Select batch"
          options={(batches.data ?? []).map((b) => ({ value: String(b.id), label: b.batchCode }))}
        />
      </div>
      <QueryState
        isLoading={readings.isLoading || batches.isLoading}
        isError={readings.isError}
        error={readings.error}
        isEmpty={chartData.length === 0}
        emptyTitle="No readings yet"
        emptyHint="Simulate a sensor run for the selected batch to see its temperature curve."
        emptyIcon={<Thermometer className="h-7 w-7" aria-hidden="true" />}
        emptyAction={activeBatchId ? <Button onClick={() => setOpen(true)}>Simulate readings</Button> : undefined}
        onRetry={() => readings.refetch()}
      >
        <Card className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Temperature curve</h2>
            <span className="text-xs font-semibold text-muted">{DEMO_LABELS.iot}</span>
          </div>
          <div className="h-72 w-full" role="img" aria-label="Temperature readings chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE8DF" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={48} />
                <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} label={{ value: "°C", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}°C`, "Temperature"]} />
                <ReferenceLine y={5} stroke="#D9A441" strokeDasharray="4 4" label={{ value: "5°C", fontSize: 10 }} />
                <ReferenceLine y={10} stroke="#B33B2F" strokeDasharray="4 4" label={{ value: "10°C", fontSize: 10 }} />
                <Line type="monotone" dataKey="temp" stroke="#087857" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-muted">
            {(readings.data ?? []).length} readings recorded
            {readings.data?.[0]?.recordedAt ? ` · latest ${fmtDateTime(readings.data[0].recordedAt)}` : ""}.
            Excursions above 5°C and 10°C feed the AI freshness model.
          </p>
        </Card>
      </QueryState>

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Simulate sensor readings"
        description="Generate a realistic temperature series for the selected batch."
        onSubmit={handleSubmit(submit)}
        submitLabel="Generate"
        loading={simulate.isPending}
        error={simulate.isError ? "Simulation failed. Please try again." : null}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Hours back" error={errors.hoursBack?.message}>
            <input {...register("hoursBack")} type="number" step="any" className={inputCls} />
          </Field>
          <Field label="Interval (min)" error={errors.intervalMinutes?.message}>
            <input {...register("intervalMinutes")} type="number" step="any" className={inputCls} />
          </Field>
          <Field label="Base temp (°C)" error={errors.baseTempC?.message}>
            <input {...register("baseTempC")} type="number" step="any" className={inputCls} />
          </Field>
          <Field label="Excursions" error={errors.excursionCount?.message}>
            <input {...register("excursionCount")} type="number" step="1" className={inputCls} />
          </Field>
        </div>
      </FormModal>
    </div>
  );
}
