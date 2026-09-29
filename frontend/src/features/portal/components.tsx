import { ReactNode, cloneElement, isValidElement, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/States";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { cn } from "../../lib/cn";
import { formatDate, formatDateTime } from "../../lib/formatters";

/** Map a domain status string to a Badge tone. */
export function statusTone(status: string | null | undefined): "brand" | "mint" | "amber" | "danger" | "muted" | "sky" {
  const s = (status ?? "").toLowerCase();
  if (["delivered", "verified", "active", "accepted", "resolved", "completed", "paid", "success", "fresh", "published"].includes(s)) return "mint";
  if (["pending", "open", "processing", "in_transit", "in-transit", "assigned", "picked_up", "medium", "draft"].includes(s)) return "amber";
  if (["rejected", "cancelled", "failed", "expired", "near expiry", "near_expiry", "high", "anomaly"].includes(s)) return "danger";
  if (["shipped", "out_for_delivery", "low"].includes(s)) return "sky";
  return "muted";
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  return (
    <Badge tone={statusTone(status)} className={cn("capitalize", className)}>
      {(status ?? "—").replace(/_/g, " ")}
    </Badge>
  );
}

/** Dashboard KPI card. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  to,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  to?: string;
}) {
  const body = (
    <Card className="flex items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
      {icon && (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint text-brand-pine">
          {icon}
        </div>
      )}
    </Card>
  );
  return to ? (
    <Link to={to} className="block transition-transform hover:-translate-y-0.5" aria-label={label}>
      {body}
    </Link>
  ) : (
    body
  );
}

/** Wraps a TanStack Query result: loading → error → empty → content. */
export function QueryState({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyTitle,
  emptyHint,
  emptyIcon,
  emptyAction,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty: boolean;
  emptyTitle: string;
  emptyHint?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (isLoading) return <LoadingState />;
  if (isError) {
    const msg =
      error instanceof Error ? error.message : "We couldn't load this right now. Please try again.";
    return <ErrorState message={msg} onRetry={onRetry} />;
  }
  if (isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} action={emptyAction} />;
  return <>{children}</>;
}

/** Search input with icon. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="relative block w-full sm:max-w-xs">
      {label && <span className="sr-only">{label}</span>}
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-4 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}

/** Simple select filter. */
export function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-11 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Filter bar layout: search + selects + optional actions. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-center gap-3">{children}</div>;
}

/** Client-side pagination controls. */
export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <span className="px-2 text-sm font-medium text-muted" aria-live="polite">
        Page {page} of {pageCount}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}

/** Labeled form field with error slot (works with react-hook-form register). */
export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputCls =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

/** Form modal: title + submit/cancel footer, mutation error display. */
export function FormModal({
  open,
  onClose,
  title,
  description,
  onSubmit,
  submitLabel = "Save",
  loading = false,
  error,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  onSubmit: () => void;
  submitLabel?: string;
  loading?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        {children}
        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Confirm action button with dialog (destructive actions).
 * The trigger is cloned onto the child element (usually a <Button>) so the
 * DOM never contains a nested <button>. */
export function ConfirmAction({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  children,
  disabled,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = isValidElement<{ onClick?: React.MouseEventHandler; disabled?: boolean }>(children)
    ? cloneElement(children, {
        onClick: () => setOpen(true),
        disabled: disabled || children.props.disabled,
      })
    : (
        <button type="button" disabled={disabled} onClick={() => setOpen(true)}>
          {children}
        </button>
      );
  return (
    <>
      {trigger}
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onConfirm();
        }}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        danger={danger}
      />
    </>
  );
}

/** Freshness score ring (SVG, no emoji). */
export function ScoreRing({ score, size = 96 }: { score: number | null | undefined; size?: number }) {
  const s = score ?? 0;
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const color = s >= 70 ? "#087857" : s >= 30 ? "#D9A441" : "#B33B2F";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`Freshness score ${Math.round(s)} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#DCE8DF" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (Math.min(100, Math.max(0, s)) / 100) * c}
        />
      </svg>
      <span className="absolute font-display text-xl font-bold text-ink">{Math.round(s)}</span>
    </div>
  );
}

/** Probability bars for AI model output. */
export function ProbBars({ probs }: { probs: Record<string, number> }) {
  const entries = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return <p className="text-sm text-muted">No probabilities returned.</p>;
  const max = Math.max(...entries.map(([, v]) => v), 0.01);
  return (
    <div className="space-y-2.5">
      {entries.map(([label, p]) => (
        <div key={label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold capitalize text-ink">{label.replace(/_/g, " ")}</span>
            <span className="font-medium tabular-nums text-muted">{(p * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-palegreen" role="img" aria-label={`${label}: ${(p * 100).toFixed(1)} percent`}>
            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${(p / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Key/value detail row. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line/60 py-3 last:border-0">
      <dt className="shrink-0 text-sm font-medium text-muted">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

export function fmtDate(v: string | null | undefined) {
  return formatDate(v);
}
export function fmtDateTime(v: string | null | undefined) {
  return formatDateTime(v);
}

/** Mobile-friendly card list wrapper: renders children as stacked cards on <md, custom desktop on ≥md. */
export function ResponsiveCards({
  desktop,
  cards,
}: {
  desktop: ReactNode;
  cards: ReactNode;
}) {
  return (
    <>
      <div className="hidden md:block">{desktop}</div>
      <div className="space-y-3 md:hidden">{cards}</div>
    </>
  );
}
