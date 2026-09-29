import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Milk,
  Users,
  Building2,
  Bike,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "../brand/Logo";
import { useAuthStore } from "../../stores/auth";
import { ROLE_HOME, ROLE_LABEL } from "../../lib/constants";
import { cn } from "../../lib/cn";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    setMatches(mq.matches);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

interface NavItem {
  to: string;
  label: string;
  desc?: string;
  icon?: LucideIcon;
}

const ROLE_ITEMS: NavItem[] = [
  { to: "/for-farmers", label: "Farmers", desc: "Record batches, monitor the cold chain, sell direct.", icon: Milk },
  { to: "/for-customers", label: "Customers", desc: "Verified dairy, ordering and subscriptions.", icon: Users },
  { to: "/for-businesses", label: "Businesses", desc: "Bulk procurement with competitive bidding.", icon: Building2 },
  { to: "/for-delivery-riders", label: "Delivery Riders", desc: "Assignments, pickups and route tracking.", icon: Bike },
];

/** Links always shown as top-level pills on desktop (xl). */
const TOP_LINKS: NavItem[] = [
  { to: "/how-it-works", label: "How It Works" },
  { to: "/freshness-engine", label: "Freshness Engine" },
  { to: "/farms", label: "Verified Farms" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/support", label: "Support" },
];

/** At lg (1024–1280px) these move into a "More" dropdown to fit the pill. */
const OVERFLOW_LABELS = new Set(["How It Works", "Freshness Engine", "Verified Farms", "Support"]);

/**
 * Accessible dropdown for the pill nav: click toggles, hover opens on
 * fine-pointer devices, ArrowUp/Down/Home/End move between items,
 * Escape closes and returns focus to the trigger, Tab closes.
 */
function PillDropdown({
  id,
  label,
  items,
  openId,
  setOpenId,
}: {
  id: string;
  label: string;
  items: NavItem[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  const open = openId === id;
  const reduce = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [finePointer] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  // Hover opens the menu on fine-pointer devices; a subsequent click on the
  // trigger keeps it open (and "claims" it so a second click closes it).
  const hoverOpened = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpenId(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, setOpenId]);

  const focusItem = (index: number) => {
    menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')?.[index]?.focus();
  };

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpenId(id);
      window.setTimeout(() => focusItem(0), 30);
    } else if (e.key === "Escape" && open) {
      setOpenId(null);
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const els = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const at = els.indexOf(document.activeElement as HTMLElement);
    const n = els.length;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpenId(null);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem((at + 1 + n) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem((at - 1 + n) % n);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(n - 1);
    } else if (e.key === "Tab") {
      setOpenId(null);
    }
  };

  const panel = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      onKeyDown={onMenuKeyDown}
      className="w-80 overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-lift"
    >
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          role="menuitem"
          onClick={() => setOpenId(null)}
          className="flex min-h-[44px] items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-palegreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
        >
          {item.icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mint text-brand-pine">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <span>
            <span className="block text-sm font-semibold text-ink">{item.label}</span>
            {item.desc && <span className="mt-0.5 block text-xs leading-snug text-muted">{item.desc}</span>}
          </span>
        </Link>
      ))}
    </div>
  );

  return (
    <div
      className="relative"
      onMouseEnter={
        finePointer
          ? () => {
              hoverOpened.current = true;
              setOpenId(id);
            }
          : undefined
      }
      onMouseLeave={
        finePointer
          ? () => {
              hoverOpened.current = false;
              setOpenId(null);
            }
          : undefined
      }
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`nav-menu-${id}`}
        onClick={() => {
          if (open && hoverOpened.current) {
            // Click right after hover-open: keep open, claim as click-opened.
            hoverOpened.current = false;
          } else {
            setOpenId(open ? null : id);
          }
        }}
        onKeyDown={onButtonKeyDown}
        className={cn(
          "nav-link inline-flex min-h-[44px] items-center gap-1 rounded-full px-2.5 text-[13px] font-medium transition-colors xl:px-3 xl:text-sm",
          open ? "active text-brand" : "text-ink/75 hover:text-brand",
        )}
      >
        {label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      <div id={`nav-menu-${id}`} className="absolute left-1/2 top-full -translate-x-1/2 pt-2">
        <AnimatePresence>
          {open &&
            (reduce ? (
              <div key="panel">{panel}</div>
            ) : (
              <motion.div
                key="panel"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                {panel}
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Floating pill navigation (§5). Fixed 20px from the top, white/ivory pill,
 * soft shadow, rounded-full. Replaces the previous sticky navbar.
 */
export function FloatingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const reduce = useReducedMotion();
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const isXl = useMediaQuery("(min-width: 1280px)");

  const authed = isAuthenticated() && user;

  // Close menus on route change.
  useEffect(() => {
    setOpenId(null);
    setMenuOpen(false);
  }, [location.pathname]);

  // Scroll state: shrink pill after 8px; hide on scroll-down (desktop only).
  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 8);
        const desktop = window.matchMedia("(min-width: 1024px)").matches;
        const goingDown = y > lastY + 4;
        setHidden(desktop && !reduce && y > 220 && goingDown);
        lastY = y;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  // Close any open dropdown when the pill hides; close mobile menu at lg+.
  useEffect(() => {
    if (hidden) setOpenId(null);
  }, [hidden]);
  useEffect(() => {
    if (isXl) setMenuOpen(false);
  }, [isXl]);

  // Mobile menu: Escape closes, body scroll locks, focus returns to trigger.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
      menuTriggerRef.current?.focus();
    };
  }, [menuOpen]);

  const moreItems = TOP_LINKS.filter((l) => OVERFLOW_LABELS.has(l.label));
  const visibleLinks = isXl ? TOP_LINKS : TOP_LINKS.filter((l) => !OVERFLOW_LABELS.has(l.label));

  const desktopAuth = authed ? (
    <>
      <Link
        to={ROLE_HOME[user.role]}
        className="btn-pill-dark ml-1 whitespace-nowrap"
      >
        <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
        {ROLE_LABEL[user.role]} portal
      </Link>
      <button
        type="button"
        onClick={() => {
          logout();
          navigate("/");
        }}
        aria-label="Log out"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-palegreen hover:text-brand-pine"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  ) : (
    <>
      <Link to="/login" className="btn-pill-light whitespace-nowrap">
        Login
      </Link>
      <Link to="/register" className="btn-pill-dark whitespace-nowrap">
        Create Account
      </Link>
    </>
  );

  const mobileSections: { heading: string; links: NavItem[] }[] = [
    { heading: "Explore", links: TOP_LINKS },
    { heading: "For Your Role", links: ROLE_ITEMS },
  ];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-brand focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "fixed inset-x-0 z-50 px-5 transition-transform duration-300 ease-out",
          hidden ? "top-5 -translate-y-[130%]" : "top-5 translate-y-0",
        )}
      >
        {/* Desktop pill */}
        <nav
          aria-label="Primary"
          className={cn(
            "mx-auto hidden w-fit max-w-[calc(100vw-2.5rem)] items-center gap-0.5 rounded-full bg-white/95 shadow-pill backdrop-blur-xl transition-all duration-300 lg:flex",
            scrolled ? "py-1 pl-4 pr-1.5" : "py-2 pl-5 pr-2",
          )}
        >
          <Link to="/" aria-label="ApnaDairy home" className="mr-1 shrink-0">
            <Logo />
          </Link>
          {visibleLinks.slice(0, 1).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "nav-link inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium transition-colors xl:px-3 xl:text-sm",
                  isActive ? "active text-brand" : "text-ink/75 hover:text-brand",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          <PillDropdown id="roles" label="For Your Role" items={ROLE_ITEMS} openId={openId} setOpenId={setOpenId} />
          {visibleLinks.slice(1).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "nav-link inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium transition-colors xl:px-3 xl:text-sm",
                  isActive ? "active text-brand" : "text-ink/75 hover:text-brand",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          {!isXl && (
            <PillDropdown id="more" label="More" items={moreItems} openId={openId} setOpenId={setOpenId} />
          )}
          <div className="ml-1 flex shrink-0 items-center gap-2">{desktopAuth}</div>
        </nav>

        {/* Mobile pills: logo/menu left, Create Account right */}
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <div className="flex items-center gap-1 rounded-full bg-white/95 py-1.5 pl-3 pr-1.5 shadow-pill backdrop-blur-xl">
            <Link to="/" aria-label="ApnaDairy home" onClick={() => setMenuOpen(false)}>
              <Logo compact />
            </Link>
            <button
              ref={menuTriggerRef}
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-palegreen"
            >
              {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
          {authed ? (
            <Link to={ROLE_HOME[user.role]} className="btn-pill-dark shadow-pill">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Link>
          ) : (
            <Link to="/register" className="btn-pill-dark shadow-pill">
              Create Account
            </Link>
          )}
        </div>
      </header>

      {/* Mobile full-screen slide-down menu (separate from header so fixed
          positioning is viewport-relative, not transform-contained). */}
      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            key="mobile-nav"
            id="mobile-nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -24 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 overflow-y-auto bg-ivory pt-28 lg:hidden"
          >
            <div className="space-y-6 px-5 pb-12">
              {mobileSections.map((group) => (
                <nav key={group.heading} aria-label={`Menu — ${group.heading}`}>
                  <p className="eyebrow px-3">{group.heading}</p>
                  <div className="mt-2 flex flex-col gap-1">
                    {group.links.map((l) => (
                      <Link
                        key={`${group.heading}-${l.to}`}
                        to={l.to}
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink transition-colors hover:bg-palegreen active:bg-palegreen"
                      >
                        {l.icon && (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mint text-brand-pine">
                            <l.icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </nav>
              ))}
              <div className="flex flex-col gap-3 border-t border-line pt-6">
                {authed ? (
                  <>
                    <Link to={ROLE_HOME[user.role]} onClick={() => setMenuOpen(false)} className="btn-pill-dark w-full">
                      <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                      {ROLE_LABEL[user.role]} portal
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate("/");
                        setMenuOpen(false);
                      }}
                      className="btn-pill-outline w-full"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-pill-light w-full">
                      Login
                    </Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-pill-dark w-full">
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
