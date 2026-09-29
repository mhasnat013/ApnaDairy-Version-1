import { useEffect, useState } from "react";
import { Bell, MapPin, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { DetailRow, QueryState, StatusBadge, inputCls } from "../../features/portal/components";
import { useMe } from "../../features/portal/apiCore";
import { ROLE_LABEL, type Role } from "../../lib/constants";

const PREF_KEY = "apnadairy-device-prefs";

/** Profile & settings: account details from the API + honest device-local preferences. */
export function ProfilePage({ role }: { role: Role }) {
  const me = useMe();
  const [prefs, setPrefs] = useState({ orderUpdates: true, priceDrops: true, weeklySummary: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      try {
        localStorage.setItem(PREF_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div>
      <PageHeader eyebrow="Account" title="Profile & settings" description="Your account details and notification preferences." />
      <QueryState
        isLoading={me.isLoading}
        isError={me.isError}
        error={me.error}
        isEmpty={!me.data}
        emptyTitle="Profile unavailable"
        onRetry={() => me.refetch()}
      >
        {me.data && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Account details</h2>
              <dl className="mt-4">
                <DetailRow label="Full name">{me.data.fullName}</DetailRow>
                <DetailRow label="Email">{me.data.email}</DetailRow>
                <DetailRow label="Phone">{me.data.phone ?? "—"}</DetailRow>
                <DetailRow label="Role">{ROLE_LABEL[role] ?? me.data.role}</DetailRow>
                <DetailRow label="City">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                    {me.data.city ?? "—"}
                  </span>
                </DetailRow>
                <DetailRow label="Address">{me.data.addressLine ?? "—"}</DetailRow>
                <DetailRow label="Verification">
                  {me.data.isVerified ? (
                    <Badge tone="mint">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified
                    </Badge>
                  ) : (
                    <Badge tone="amber">Pending verification</Badge>
                  )}
                </DetailRow>
                {me.data.status && (
                  <DetailRow label="Status">
                    <StatusBadge status={me.data.status} />
                  </DetailRow>
                )}
              </dl>
              <p className="mt-4 rounded-xl bg-palegreen/60 px-4 py-3 text-xs leading-relaxed text-muted">
                To update your name, phone or address, contact support — account changes are reviewed by an
                administrator for security.
              </p>
            </Card>
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-ink">
                <Bell className="mr-2 inline h-5 w-5 text-brand" aria-hidden="true" />
                Notification preferences
              </h2>
              <p className="mt-1 text-xs text-muted">Stored on this device only.</p>
              <div className="mt-4 space-y-3">
                {(
                  [
                    ["orderUpdates", "Order & delivery updates"],
                    ["priceDrops", "Price drops & offers"],
                    ["weeklySummary", "Weekly activity summary"],
                  ] as Array<[keyof typeof prefs, string]>
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-line px-4 py-3"
                  >
                    <span className="text-sm font-medium text-ink">{label}</span>
                    <input
                      type="checkbox"
                      checked={prefs[key]}
                      onChange={() => toggle(key)}
                      className={inputCls + " h-5 w-5 accent-[#087857]"}
                      style={{ width: "1.25rem", height: "1.25rem" }}
                      aria-label={label}
                    />
                  </label>
                ))}
              </div>
            </Card>
          </div>
        )}
      </QueryState>
    </div>
  );
}
