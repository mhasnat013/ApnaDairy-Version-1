import { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Tone = "brand" | "mint" | "amber" | "danger" | "muted" | "sky";

const tones: Record<Tone, string> = {
  brand: "bg-brand/10 text-brand-pine",
  mint: "bg-mint text-brand-pine",
  amber: "bg-amber/15 text-ink",
  danger: "bg-danger/10 text-danger",
  muted: "bg-palegreen text-muted",
  sky: "bg-sky text-brand-pine",
};

/** Dark-surface equivalents for the night theme (public pages). */
const darkTones: Record<Tone, string> = {
  brand: "bg-[#00A878]/15 text-[#00A878]",
  mint: "bg-mint text-brand-pine",
  amber: "bg-amber/20 text-amber",
  danger: "bg-danger/20 text-ivory",
  muted: "bg-white/10 text-ivory/70",
  sky: "bg-sky/15 text-sky",
};

export function Badge({
  tone = "muted",
  dark = false,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        dark ? darkTones[tone] : tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
