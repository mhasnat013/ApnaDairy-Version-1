import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { ArrowRight, Check, Info, Milk, Handshake, Thermometer, FlaskConical } from "lucide-react";
import { MODULES, type ModuleId } from "../../lib/constants";
import { Modal } from "../ui/Modal";
import { Logo } from "../brand/Logo";
import { cn } from "../../lib/cn";
import { Reveal } from "../ui/Reveal";
import { Magnetic } from "../motion/Magnetic";
import { Parallax } from "../motion/Parallax";

/** Cubic-bezier ease shared by ecosystem motion. */
const ENTRANCE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const MODULE_ICONS = {
  b2c: Milk,
  b2b: Handshake,
  iot: Thermometer,
  ai: FlaskConical,
} as const;

/** Node positions around the dial: top, right, bottom, left. */
const NODE_ORDER: ModuleId[] = ["b2c", "b2b", "iot", "ai"];
const NODE_POS: Record<ModuleId, { x: number; y: number }> = {
  b2c: { x: 50, y: 18 },
  b2b: { x: 82, y: 50 },
  iot: { x: 50, y: 82 },
  ai: { x: 18, y: 50 },
};

/** Technology module destinations. */
const EXPLORE_TO: Record<ModuleId, string> = {
  b2c: "/marketplace",
  b2b: "/for-businesses",
  iot: "/freshness-engine#iot",
  ai: "/freshness-engine#ai",
};

/** Per-module visual + floating stat card for the dynamic panel (§7 mapping). */
const MODULE_VISUAL: Record<
  ModuleId,
  { src: string; alt: string; statTitle: string; statText: string; chip?: string }
> = {
  b2c: {
    src: "/media/cold-chain-delivery.png",
    alt: "A refrigerated ApnaDairy delivery being handed to a household customer",
    statTitle: "Verified farm and batch origin",
    statText: "See the farm, milk batch and freshness score attached to a product.",
    chip: "Verified farms",
  },
  b2b: {
    src: "/media/farm-collection.png",
    alt: "A dairy farmer preparing fresh milk for collection and bulk supply",
    statTitle: "Bulk procurement, simplified",
    statText: "Post a requirement and compare quotations from verified farms.",
    chip: "Live bidding",
  },
  iot: {
    src: "/media/dairy-facility.png",
    alt: "Milk bottle and steel cans inside a modern ApnaDairy dairy facility",
    statTitle: "Cold chain, watched live",
    statText: "Chiller A · 3.8°C — Transit van · 4.1°C — Farm tank · 3.6°C",
    chip: "Simulated IoT reading",
  },
  ai: {
    src: "/media/ai-quality-monitoring.png",
    alt: "A dairy quality specialist monitoring milk with connected equipment and a tablet",
    statTitle: "Freshness, estimated",
    statText: "Shelf-life and spoilage risk from cold-chain data.",
    chip: "Demonstration prediction",
  },
};

/** Accessible module popup (§8): title, description, image, features,
 *  beneficiaries, Explore More, Close — focus trap + Escape via Modal,
 *  full-screen sheet on mobile. */
export function ModuleModal({ moduleId, onClose }: { moduleId: ModuleId | null; onClose: () => void }) {
  const navigate = useNavigate();
  const mod = MODULES.find((m) => m.id === moduleId);
  if (!mod) return null;
  const Icon = MODULE_ICONS[mod.id];
  const visual = MODULE_VISUAL[mod.id];

  return (
    <Modal open={moduleId !== null} onClose={onClose} title={mod.title} description={mod.short}>
      <figure className="overflow-hidden rounded-2xl border border-line">
        <img src={visual.src} alt={visual.alt} className="aspect-[16/8] w-full object-cover" loading="lazy" />
      </figure>
      <div className="mt-5 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="text-sm leading-relaxed text-muted">{mod.description}</p>
      </div>
      <ul className="mt-5 space-y-2.5">
        {mod.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-ink">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint text-brand">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            {f}
          </li>
        ))}
      </ul>
      <p className="mt-5 rounded-xl bg-palegreen px-4 py-3 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-ink">Who benefits: </span>
        {mod.beneficiaries}
      </p>
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => {
            onClose();
            navigate(EXPLORE_TO[mod.id]);
          }}
          className="btn-pill-dark"
        >
          Explore more
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </Modal>
  );
}

/** The orbit dial: central ApnaDairy + four module selectors.
 *  Hover / keyboard-focus previews a module; click selects it; clicking the
 *  active module opens its detail popup. */
function OrbitDial({
  active,
  preview,
  onPreview,
  onSelect,
  onOpenDetails,
}: {
  active: ModuleId;
  preview: ModuleId | null;
  onPreview: (id: ModuleId | null) => void;
  onSelect: (id: ModuleId) => void;
  onOpenDetails: (id: ModuleId) => void;
}) {
  const reduce = useReducedMotion();
  const shown = preview ?? active;
  return (
    <div
      role="group"
      aria-label="Ecosystem modules — hover or focus to preview, activate to select"
      className="relative mx-auto aspect-square w-full max-w-[300px] sm:max-w-[540px]"
    >
      {/* Orbit rings draw in on mount */}
      <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="#087857"
          strokeOpacity="0.35"
          strokeWidth="0.5"
          strokeDasharray="2.5 2"
          className={reduce ? undefined : "orbit-draw"}
        />
        <circle cx="50" cy="50" r="27" fill="none" stroke="#087857" strokeOpacity="0.14" strokeWidth="0.5" />
        {/* Connection line animates toward the previewed/selected module's visual */}
        <line
          x1="50"
          y1="50"
          x2={NODE_POS[shown].x}
          y2={NODE_POS[shown].y}
          stroke="#087857"
          strokeOpacity="0.5"
          strokeWidth="0.6"
          className={reduce ? undefined : "transition-all duration-500"}
        />
      </svg>

      {/* Central brand node */}
      <div className="absolute left-1/2 top-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-line bg-white text-center shadow-lift sm:h-48 sm:w-48">
        <Logo compact className="[&_span]:!text-ink" />
        <p className="display mt-2 px-4 text-xl uppercase text-ink">
          ApnaDairy
        </p>
        <p className="mt-1 px-6 text-[11px] leading-snug text-muted">Freshness you can trust.</p>
      </div>

      {/* Satellite module nodes */}
      {NODE_ORDER.map((id, i) => {
        const mod = MODULES.find((m) => m.id === id)!;
        const Icon = MODULE_ICONS[id];
        const pos = NODE_POS[id];
        const selected = id === active;
        const isShown = id === shown;
        return (
          <motion.button
            key={id}
            type="button"
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, delay: i * 0.1, ease: ENTRANCE_EASE }}
            onClick={() => (selected ? onOpenDetails(id) : onSelect(id))}
            onMouseEnter={() => onPreview(id)}
            onMouseLeave={() => onPreview(null)}
            onFocus={() => onPreview(id)}
            onBlur={() => onPreview(null)}
            aria-pressed={selected}
            aria-label={`${mod.title} — ${selected ? "selected, activate for details" : "select to preview"}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            className={cn(
              "absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border bg-white shadow-card transition-all duration-300 sm:h-28 sm:w-28",
              selected
                ? "scale-110 border-brand ring-4 ring-brand/15"
                : isShown
                  ? "-translate-y-1 border-brand/60 shadow-lift"
                  : "border-line hover:-translate-y-1 hover:border-brand/50 hover:shadow-lift",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-colors sm:h-10 sm:w-10",
                selected ? "bg-brand text-white" : "bg-mint text-brand",
              )}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 w-full whitespace-normal break-words px-1.5 text-center text-[10px] font-semibold leading-tight text-ink sm:px-2 sm:text-[11px]">
              {mod.short}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/** Full-bleed dynamic visual panel — photograph, Ken Burns drift,
 *  floating glass stat card with cursor parallax. Changes with the
 *  previewed/selected module. No layout shift: fixed aspect ratio. */
function VisualPanel({ active }: { active: ModuleId }) {
  const reduce = useReducedMotion();
  const visual = MODULE_VISUAL[active];
  const mod = MODULES.find((m) => m.id === active)!;
  const panelRef = useRef<HTMLDivElement>(null);
  const fine = useRef(false);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 120, damping: 20, mass: 0.5 });
  const py = useSpring(my, { stiffness: 120, damping: 20, mass: 0.5 });

  const onMouseMove = (e: React.MouseEvent) => {
    if (reduce || !fine.current || !panelRef.current) return;
    const r = panelRef.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 22);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 16);
  };
  const onMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div
      ref={panelRef}
      onMouseMove={(e) => {
        fine.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        onMouseMove(e);
      }}
      onMouseLeave={onMouseLeave}
      tabIndex={0}
      aria-label={`${mod.title} preview. Focus or hover to reveal details.`}
      className="group relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-line bg-palegreen shadow-lift outline-none ring-brand/30 transition-shadow focus-visible:ring-4 sm:aspect-[16/12]"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.5, ease: ENTRANCE_EASE }}
          className="absolute inset-0"
        >
          <img
            src={visual.src}
            alt={visual.alt}
            className={cn("h-full w-full object-cover", !reduce && "kenburns")}
            loading="lazy"
          />
          <div aria-hidden="true" className="cinematic-grade absolute inset-0" />
        </motion.div>
      </AnimatePresence>

      {/* Module caption chip */}
      <div className="absolute left-4 top-4 sm:left-5 sm:top-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={active}
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.3 }}
            className="inline-block rounded-full bg-ivory/90 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-pine backdrop-blur"
          >
            {mod.short}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Floating glass stat card — cursor parallax wrapper */}
      <motion.div
        style={reduce ? undefined : { x: px, y: py }}
        className="pointer-events-none absolute bottom-4 left-4 right-4 translate-y-5 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-xs"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: ENTRANCE_EASE }}
            className={cn(!reduce && "floaty")}
          >
            <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-lift backdrop-blur-md sm:p-5">
              {visual.chip && (
                <p className="inline-block rounded-full bg-mint px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-pine">
                  {visual.chip}
                </p>
              )}
              <p className="display mt-2 text-lg uppercase leading-snug text-ink">
                {visual.statTitle}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted sm:text-[13px]">{visual.statText}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/** Interactive ApnaDairy ecosystem (§7) — the orbit dial lives below the hero
 *  now, restyled in the editorial language. */
export function HeroEcosystem() {
  const [active, setActive] = useState<ModuleId>("b2c");
  const [preview, setPreview] = useState<ModuleId | null>(null);
  const [modalModule, setModalModule] = useState<ModuleId | null>(null);
  const shown = preview ?? active;
  const mod = MODULES.find((m) => m.id === shown)!;

  return (
    <section id="ecosystem" aria-label="The ApnaDairy ecosystem" className="relative overflow-hidden bg-ivory">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(48rem 30rem at 85% -10%, rgba(0,168,120,0.10), transparent 60%), radial-gradient(40rem 26rem at -10% 30%, rgba(8,120,87,0.08), transparent 60%)",
        }}
      />
      <div className="container-x relative py-16 sm:py-24">
        <Reveal>
          <p className="eyebrow">The ApnaDairy ecosystem</p>
          <h2 className="display-lg mt-4 max-w-3xl text-ink">
            One network.<br />Four connected modules.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Verified farms, traceable batches, monitored cold chain and freshness
            intelligence — working as one system. Select a module to preview it.
          </p>
        </Reveal>

        <div className="mt-10 grid items-center gap-10 sm:mt-14 lg:grid-cols-2 lg:gap-14">
          <Reveal delay={0.08}>
            <OrbitDial
              active={active}
              preview={preview}
              onPreview={setPreview}
              onSelect={setActive}
              onOpenDetails={setModalModule}
            />
          </Reveal>
          <Reveal delay={0.16}>
            <Parallax speed={0.06}>
              <VisualPanel active={shown} />
            </Parallax>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-8 sm:mt-10">
          <div className="flex flex-wrap items-center gap-4">
            <Magnetic>
              <button
                onClick={() => setModalModule(active)}
                className="btn-pill-light"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
                About {mod.title}
              </button>
            </Magnetic>
            <p className="text-sm text-muted" role="status" aria-live="polite">
              <span className="font-semibold text-ink">{mod.short}</span> — hover or
              focus a module to preview it, click to select, click the active
              module for details.
            </p>
          </div>
        </Reveal>
      </div>

      <ModuleModal moduleId={modalModule} onClose={() => setModalModule(null)} />
    </section>
  );
}
