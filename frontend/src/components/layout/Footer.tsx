import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { Logo } from "../brand/Logo";

const COLUMNS: Array<{ heading: string; links: Array<{ to: string; label: string }> }> = [
  {
    heading: "Platform",
    links: [
      { to: "/how-it-works", label: "How it works" },
      { to: "/freshness-engine", label: "Freshness engine" },
      { to: "/dynamic-pricing", label: "Dynamic pricing" },
    ],
  },
  {
    heading: "Who it's for",
    links: [
      { to: "/for-farmers", label: "Farmers" },
      { to: "/for-customers", label: "Customers" },
      { to: "/for-businesses", label: "Businesses" },
      { to: "/for-delivery-riders", label: "Delivery riders" },
    ],
  },
  {
    heading: "Marketplace",
    links: [
      { to: "/marketplace", label: "Shop dairy" },
      { to: "/farms", label: "Verified farms" },
      { to: "/register", label: "Join ApnaDairy" },
      { to: "/login", label: "Log in" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/support", label: "Support" },
      { to: "/contact", label: "Contact" },
      { to: "/faq", label: "FAQ" },
    ],
  },
];

export function Footer() {
  const reduce = useReducedMotion();
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#0B3D33] text-ivory">
      {/* Ambient emerald glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50rem 22rem at 50% 115%, rgba(0,168,120,0.16), transparent 65%)",
        }}
      />
      <div className="container-x relative py-14">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-bright">
              ApnaDairy — Freshness you can trust
            </p>
            <span aria-hidden="true" className="hidden text-[11px] tracking-[0.2em] text-ivory/30 sm:block">
              30.3753° N / 69.3451° E
            </span>
          </div>
        </motion.div>
        <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logo className="[&_span]:!text-ivory" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ivory/60">
              Freshness you can trust. From our farms to your table — verified, traceable and
              intelligently monitored.
            </p>
          </motion.div>
          {COLUMNS.map((col, i) => (
            <motion.nav
              key={col.heading}
              aria-label={`Footer — ${col.heading}`}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ivory">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="group inline-flex items-center gap-0 text-sm text-ivory/70 transition-all hover:text-white"
                    >
                      <span className="h-px w-0 bg-brand-bright transition-all duration-300 group-hover:mr-2 group-hover:w-4" aria-hidden="true" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-[11px] uppercase tracking-[0.18em] text-ivory/40 sm:flex-row sm:items-center">
          <p>© 2026 ApnaDairy — Final Year Project · Air University Islamabad</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="transition-colors hover:text-ivory">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-ivory">
              Terms
            </Link>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })}
              className="btn-lift inline-flex h-10 w-10 items-center justify-center rounded-full border border-ivory/25 text-ivory/70 hover:border-brand-bright hover:text-brand-bright"
              aria-label="Back to top"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
