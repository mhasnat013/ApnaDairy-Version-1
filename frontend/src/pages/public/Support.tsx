import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageCircle,
  UserRound,
  Search,
  LogIn,
  Bot,
  ClipboardList,
  Mail,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import {
  EditorialHero,
  HeroCta,
  ColourBlock,
  EditorialSectionHead,
  FeatureGrid,
  StepsList,
} from "../../components/public/Editorial";
import { Reveal } from "../../components/ui/Reveal";

const TOPICS = [
  {
    icon: UserRound,
    title: "Account help",
    text: "Password resets, profile updates and verification status — managed in your portal.",
    to: "/login",
    label: "Go to sign in",
  },
];

const SUPPORT_FAQS = [
  {
    q: "Where do I see my support tickets?",
    a: "Sign in and open Support in your portal — every ticket you've raised and its current status is listed there.",
  },
  {
    q: "What do the freshness scores mean?",
    a: "They are demonstration estimates from machine-learning models trained on cold-chain data — not laboratory certification, and never a guarantee of shelf life.",
  },
  {
    q: "I forgot my password. What now?",
    a: "Use the forgot-password page to request a reset link. If you don't receive it, check spam — then contact us.",
  },
];

const COMPLAINT_STEPS = [
  {
    title: "Raise it in your portal",
    text: "Use the Support section in your portal. Describe the issue and attach the relevant details.",
  },
  {
    title: "Get a ticket number",
    text: "Every complaint becomes a tracked ticket. Sign in anytime to see its status and the support team's replies.",
  },
  {
    title: "Resolution & follow-up",
    text: "The support team records its response in the same ticket. You'll be notified when it's resolved.",
  },
];

const CHAT_PREVIEW = [
  { from: "you", text: "How do I update my farm information?" },
  {
    from: "bot",
    text: "Sign in, open your profile and choose Farm profile. Support can help if a verified field needs review.",
  },
];

export function Support() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUPPORT_FAQS;
    return SUPPORT_FAQS.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div>
      <EditorialHero
        eyebrow="Support"
        title={"How can\nwe help?"}
        lede="Start with the fastest path to your answer — or send us a message and we'll get back to you."
        actions={
          <>
            <HeroCta to="/contact" label="Contact support" variant="light" />
            <HeroCta to="/login" label="Sign in for ticket history" variant="outline" />
          </>
        }
      />

      <ColourBlock tone="ivory">
        <EditorialSectionHead
          eyebrow="Start here"
          title="Help categories"
        />
        <FeatureGrid
          items={TOPICS.map((t) => ({
            icon: t.icon,
            title: t.title,
            text: t.text,
          }))}
        />
        <Reveal className="mt-6 grid gap-3 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <Link
              key={t.title}
              to={t.to}
              className="btn-lift inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
            >
              {t.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ))}
        </Reveal>
      </ColourBlock>

      <ColourBlock tone="white">
        <EditorialSectionHead
          eyebrow="Search answers"
          title="Frequently asked"
          lede="Type to search the most common support questions."
        />
        <div className="mx-auto max-w-2xl">
          <label htmlFor="support-search" className="sr-only">
            Search support questions
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              id="support-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions…"
              className="w-full rounded-full border border-line bg-ivory py-3.5 pl-12 pr-5 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
          </div>
          <div className="mt-6 space-y-3" role="status" aria-live="polite">
            {results.length === 0 ? (
              <p className="rounded-2xl border border-line bg-ivory p-6 text-sm text-muted">
                No matches for “{query}”. Try different words, or{" "}
                <Link to="/contact" className="font-semibold text-brand hover:underline">
                  send us a message
                </Link>
                .
              </p>
            ) : (
              results.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-line bg-ivory p-5 open:border-brand/40 sm:p-6"
                >
                  <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {f.q}
                      <span
                        aria-hidden="true"
                        className="text-brand transition-transform group-open:rotate-180"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </span>
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
                </details>
              ))
            )}
          </div>
        </div>
      </ColourBlock>

      <ColourBlock tone="mint">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <EditorialSectionHead
              eyebrow="Complaints"
              title="The complaint process"
              lede="Something wrong with your account, farm record or delivery workflow? Here's exactly how it's handled."
            />
            <StepsList steps={COMPLAINT_STEPS} />
            <Reveal className="mt-6">
              <Link
                to="/login"
                className="btn-lift inline-flex h-12 items-center gap-2 rounded-full bg-brand-forest px-7 text-sm font-semibold text-ivory hover:bg-brand-pine"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in to see your ticket history
              </Link>
            </Reveal>
          </div>
          <Reveal delay={0.08}>
            <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-brand-pine">
                  <Bot className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Chatbot preview</h3>
                  <p className="text-xs text-muted">A glimpse of the in-portal assistant</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {CHAT_PREVIEW.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.from === "you"
                        ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-white"
                        : "mr-auto max-w-[85%] rounded-2xl rounded-bl-md bg-palegreen px-4 py-2.5 text-sm text-ink"
                    }
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted">
                The full chatbot lives inside your portal after sign-in.
              </p>
            </div>
          </Reveal>
        </div>
      </ColourBlock>

      <ColourBlock tone="forest">
        <EditorialSectionHead
          dark
          eyebrow="Still stuck?"
          title="Talk to a human"
          lede="Our support team answers every message. Tell us what's happening and we'll sort it out."
        />
        <Reveal className="flex flex-wrap gap-3">
          <Link
            to="/contact"
            className="btn-lift inline-flex h-12 items-center gap-2 rounded-full bg-[#DDF06A] px-7 text-sm font-semibold text-brand-forest hover:brightness-105"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Contact support
          </Link>
          <span className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 px-6 text-sm text-ivory/75">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Prefer writing? Use the contact form — no account needed.
          </span>
        </Reveal>
        <Reveal className="mt-8 flex items-center gap-3 text-sm text-ivory/60">
          <ClipboardList className="h-5 w-5 text-[#DDF06A]" aria-hidden="true" />
          Personal ticket history is available after sign-in, in your portal's Support section.
        </Reveal>
      </ColourBlock>
    </div>
  );
}
