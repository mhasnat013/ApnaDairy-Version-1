import { Link } from "react-router-dom";
import { Home, Search } from "lucide-react";
import { ColourBlock } from "../../components/public/Editorial";

/** Catch-all 404 — friendly, on-brand, always a way back. */
export function NotFound() {
  return (
    <div className="px-3 py-3 sm:px-5 sm:py-5">
      <ColourBlock tone="forest" rounded className="overflow-hidden">
        <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-[#DDF06A] ring-1 ring-white/15">
            <Search className="h-8 w-8" aria-hidden="true" />
          </span>
          <p
            aria-hidden="true"
            className="mt-6 font-condensed text-[clamp(5rem,12vw,9rem)] uppercase leading-[0.85] text-[#DDF06A]"
          >
            404
          </p>
          <h1 className="mt-2 font-condensed text-4xl uppercase leading-[0.9] text-ivory sm:text-5xl">
            This page wandered off
          </h1>
          <p className="mt-4 max-w-md leading-relaxed text-ivory/65">
            The page you&apos;re looking for doesn&apos;t exist or was moved. Let&apos;s get
            you back on track.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="btn-lift inline-flex h-12 items-center gap-2 rounded-full bg-[#DDF06A] px-7 text-sm font-semibold text-brand-forest hover:brightness-105"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Link>
            <Link
              to="/support"
              className="btn-lift inline-flex h-12 items-center rounded-full border border-white/30 px-7 text-sm font-semibold text-ivory hover:border-white hover:bg-white/10"
            >
              Get support
            </Link>
          </div>
        </div>
      </ColourBlock>
    </div>
  );
}
