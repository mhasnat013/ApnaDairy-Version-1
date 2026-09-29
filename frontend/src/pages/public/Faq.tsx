import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  EditorialHero,
  ColourBlock,
  EditorialSectionHead,
} from "../../components/public/Editorial";
import { Reveal } from "../../components/ui/Reveal";
import { cn } from "../../lib/cn";

const FAQS = [
  {
    q: "What is ApnaDairy?",
    a: "ApnaDairy is a smart dairy operations platform for verified farms, monitored milk batches, delivery workflows and AI-supported freshness insight.",
  },
  {
    q: "What does the freshness score mean?",
    a: "The score (0–100) is a demonstration estimate from machine-learning models trained on cold-chain data. It is not laboratory certification and never a guarantee of shelf life — and it's always labelled as an estimate.",
  },
  {
    q: "Are the sensor readings real?",
    a: "In this demo they are simulated. The ingestion, storage and dashboard pipeline is real; the hardware feed is simulated and labelled as such wherever it appears.",
  },
  {
    q: "Can anyone register as an admin?",
    a: "No. Admin accounts are provisioned internally. Public registration is open to customers, farmers, businesses and delivery riders only.",
  },
  {
    q: "Is my payment real?",
    a: "No — demo payments are simulated end to end. No real money is charged at any point in the demo.",
  },
  {
    q: "How do I join as a farmer?",
    a: "Register as a farmer, complete onboarding with your identity documents and farm location, and our team will verify your application. Once approved you can record batches and use the monitoring tools.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white shadow-card transition-all",
        open ? "border-brand/40" : "border-line hover:-translate-y-0.5 hover:shadow-lift",
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-semibold text-ink">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 320, damping: 22 }
          }
          className="flex shrink-0"
        >
          <ChevronDown className="h-5 w-5 text-brand" aria-hidden="true" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 260, damping: 30 }
            }
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm leading-relaxed text-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Faq() {
  return (
    <div>
      <EditorialHero
        eyebrow="FAQ"
        title={"Questions,\nanswered"}
        lede="The short answers to the questions we hear most about the network, the tech and the demo."
      />
      <ColourBlock tone="ivory">
        <EditorialSectionHead
          eyebrow="The essentials"
          title="Frequently asked"
        />
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={Math.min(i * 0.03, 0.2)}>
              <FaqItem q={f.q} a={f.a} />
            </Reveal>
          ))}
        </div>
        <Reveal className="mx-auto mt-8 max-w-3xl">
          <p className="text-sm text-muted">
            Still curious?{" "}
            <Link to="/contact" className="font-semibold text-brand hover:text-brand-pine hover:underline">
              Send us a message
            </Link>{" "}
            or browse the{" "}
            <Link to="/support" className="font-semibold text-brand hover:text-brand-pine hover:underline">
              support hub
            </Link>
            .
          </p>
        </Reveal>
      </ColourBlock>
    </div>
  );
}
