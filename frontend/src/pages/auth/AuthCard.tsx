import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/brand/Logo";

/**
 * Editorial auth shell shared by all auth pages.
 * Same props and exported class constants as before — styling only.
 */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px-3 py-3 sm:px-5 sm:py-5">
      <div className="grid overflow-hidden rounded-[1.75rem] bg-brand-forest shadow-lift sm:rounded-[2.5rem] lg:grid-cols-[1fr_1.1fr]">
        {/* Editorial side panel */}
        <div className="relative hidden overflow-hidden p-10 lg:block lg:p-14">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(90%_100%_at_20%_15%,rgba(0,168,120,0.4)_0%,rgba(11,61,51,0)_55%)]"
          />
          <div aria-hidden="true" className="grain-overlay absolute inset-0" />
          <div className="relative flex h-full flex-col justify-between">
            <Link to="/" aria-label="ApnaDairy home" className="inline-flex w-fit">
              <span className="rounded-full bg-white px-4 py-2">
                <Logo />
              </span>
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#DDF06A]">
                The ApnaDairy network
              </p>
              <p className="mt-4 font-condensed text-6xl uppercase leading-[0.88] text-ivory">
                Freshness
                <br />
                you can
                <br />
                trust.
              </p>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/65">
                One account for the whole chain — verified farms, traceable batches,
                freshness insight and cold-chain delivery.
              </p>
            </div>
            <p className="text-xs text-ivory/40">
              Verified farms · Freshness information · Honest demo labels
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="relative bg-ivory px-5 py-10 sm:px-10 sm:py-14 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex flex-col items-start gap-3 lg:hidden">
              <Link to="/" aria-label="ApnaDairy home">
                <Logo />
              </Link>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-moss">
              Secure sign-in — ApnaDairy network
            </p>
            <h1 className="mt-3 font-condensed text-5xl uppercase leading-[0.9] text-ink sm:text-6xl">
              {title}
            </h1>
            {subtitle && <div className="mt-3 text-sm text-muted">{subtitle}</div>}
            <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shared light form classes for auth pages. */
export const fieldClass =
  "h-12 w-full rounded-xl border border-line bg-white px-4 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export const labelClass = "mb-1.5 block text-sm font-semibold text-ink";

export const fieldErrorClass = "mt-1.5 inline-block text-xs font-medium text-danger";

export const serverErrorClass =
  "rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger ring-1 ring-danger/25";

export const authLinkClass = "font-semibold text-brand hover:text-brand-pine";

export const authButtonClass =
  "btn-lift h-12 w-full rounded-full bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-pine disabled:opacity-60";
