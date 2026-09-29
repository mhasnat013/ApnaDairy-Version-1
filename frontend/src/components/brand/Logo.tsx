import { cn } from "../../lib/cn";

/** ApnaDairy wordmark: emerald rounded square with a white milk drop + wordmark text. */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#087857" />
        <path
          d="M32 12c8 10 14 17.5 14 26a14 14 0 1 1-28 0c0-8.5 6-16 14-26z"
          fill="#ffffff"
        />
        <path
          d="M25 38a7 7 0 0 0 6 7"
          stroke="#087857"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
      </svg>
      {!compact && (
        <span className="font-display text-xl font-bold tracking-tight text-ink">
          Apna<span className="text-brand">Dairy</span>
        </span>
      )}
    </span>
  );
}
