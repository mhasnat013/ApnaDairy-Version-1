import { Link } from "react-router-dom";
import { ShieldAlert, Home } from "lucide-react";
import { useAuthStore } from "../../stores/auth";
import { ROLE_HOME } from "../../lib/constants";
import { ColourBlock } from "../../components/public/Editorial";

/** Shown when a signed-in user lacks the role for a route (plan §4). */
export function Unauthorized() {
  const user = useAuthStore((s) => s.user);
  const home = user ? ROLE_HOME[user.role] : "/";
  return (
    <div className="px-3 py-3 sm:px-5 sm:py-5">
      <ColourBlock tone="forest" rounded className="overflow-hidden">
        <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/15 text-danger ring-1 ring-danger/30">
            <ShieldAlert className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-[#DDF06A]">
            403 — Access denied
          </p>
          <h1 className="mt-3 font-condensed text-6xl uppercase leading-[0.9] text-ivory sm:text-7xl">
            Not your door
          </h1>
          <p className="mt-4 leading-relaxed text-ivory/65">
            Your account doesn&apos;t have access to this area. If you think this is a
            mistake, contact support.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to={home}
              className="btn-lift inline-flex h-12 items-center gap-2 rounded-full bg-[#DDF06A] px-7 text-sm font-semibold text-brand-forest hover:brightness-105"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Go to your home
            </Link>
            <Link
              to="/support"
              className="btn-lift inline-flex h-12 items-center rounded-full border border-white/30 px-7 text-sm font-semibold text-ivory hover:border-white hover:bg-white/10"
            >
              Contact support
            </Link>
          </div>
        </div>
      </ColourBlock>
    </div>
  );
}
