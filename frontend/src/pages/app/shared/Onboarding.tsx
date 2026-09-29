import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ClipboardCheck } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { useAuthStore } from "../../../stores/auth";
import type { Role } from "../../../lib/constants";

export interface OnboardingStep {
  label: string;
  done: boolean;
  to?: string;
  actionLabel?: string;
}

/** Verification/onboarding checklist — honest, driven by real account state. */
export function OnboardingPage({ role, steps, title }: { role: Role; steps: OnboardingStep[]; title: string }) {
  const user = useAuthStore((s) => s.user);
  const done = steps.filter((s) => s.done).length;

  return (
    <div>
      <PageHeader
        eyebrow="Onboarding"
        title={title}
        description={`${done} of ${steps.length} steps complete.`}
      />
      <Card className="max-w-2xl p-6 sm:p-8">
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-palegreen" role="img" aria-label={`${done} of ${steps.length} steps complete`}>
          <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${(done / Math.max(1, steps.length)) * 100}%` }} />
        </div>
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-start gap-4 rounded-2xl border border-line px-4 py-4">
              {s.done ? (
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 h-6 w-6 shrink-0 text-line" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  <span className="mr-2 text-muted">Step {i + 1}</span>
                  {s.label}
                </p>
                {s.to && !s.done && (
                  <Link to={s.to}>
                    <Button variant="outline" size="sm" className="mt-2">
                      <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                      {s.actionLabel ?? "Complete step"}
                    </Button>
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
        {user && !user.isVerified && (
          <p className="mt-6 rounded-xl bg-amber/15 px-4 py-3 text-sm leading-relaxed text-ink">
            Your account is pending verification. An administrator reviews new {role === "rider" ? "rider" : role}{" "}
            accounts — this usually takes 1–2 working days.
          </p>
        )}
      </Card>
    </div>
  );
}
