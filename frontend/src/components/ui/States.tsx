import { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { cn } from "../../lib/cn";

/** Full-area loading indicator with accessible label. */
export function LoadingState({
  label = "Loading…",
  className,
  dark = false,
}: {
  label?: string;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16",
        dark ? "text-ivory/60" : "text-muted",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-10 w-10 animate-spin rounded-full border-[3px]",
          dark ? "border-white/15 border-t-[#00A878]" : "border-line border-t-brand",
        )}
      />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

/** Skeleton block for content placeholders while data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-palegreen", className)} />;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
  dark?: boolean;
}

/** Honest empty state — used instead of fake data everywhere. */
export function EmptyState({ icon, title, hint, action, className, dark = false }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl",
          dark ? "bg-white/[0.06] text-[#00A878] ring-1 ring-white/10" : "bg-palegreen text-brand-moss",
        )}
      >
        {icon ?? <Inbox className="h-7 w-7" aria-hidden="true" />}
      </div>
      <h3
        className={cn(
          "text-lg",
          dark ? "font-condensed uppercase tracking-wide text-ivory" : "font-display font-semibold text-ink",
        )}
      >
        {title}
      </h3>
      {hint && (
        <p className={cn("max-w-sm text-sm leading-relaxed", dark ? "text-ivory/60" : "text-muted")}>
          {hint}
        </p>
      )}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  dark?: boolean;
}

/** Error state with retry — every data view wires this. */
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this right now. Please try again.",
  onRetry,
  className,
  dark = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3
        className={cn(
          "text-lg",
          dark ? "font-condensed uppercase tracking-wide text-ivory" : "font-display font-semibold text-ink",
        )}
      >
        {title}
      </h3>
      <p className={cn("max-w-sm text-sm leading-relaxed", dark ? "text-ivory/60" : "text-muted")}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            "mt-1 inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors",
            dark
              ? "bg-[#00A878] text-[#0B3D33] hover:bg-white"
              : "bg-brand text-white hover:bg-brand-pine",
          )}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
