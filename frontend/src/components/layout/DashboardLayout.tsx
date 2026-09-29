import { ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "../brand/Logo";
import { useAuthStore } from "../../stores/auth";
import { useUiStore } from "../../stores/ui";
import { PORTALS, findPortalRoute, roleNav, resolvePortalPath } from "../../app/portalConfig";
import { ROLE_LABEL, type Role } from "../../lib/constants";
import { cn } from "../../lib/cn";

/* ------------------------------------------------------------------ */
/* Design tokens (locked palette §4)                                   */
/* ------------------------------------------------------------------ */
const DISPLAY = "font-['Archivo_Narrow',sans-serif]";

/* ------------------------------------------------------------------ */
/* Sidebar section map — cosmetic grouping of nav items per role.      */
/* Keys are relative portal paths; unmatched items fall into "More".   */
/* Routes, labels and order come from portalConfig; this only groups.  */
/* ------------------------------------------------------------------ */
interface NavSection {
  label: string;
  keys: string[];
}

const NAV_SECTIONS: Record<Role, NavSection[]> = {
  customer: [
    { label: "Overview", keys: [""] },
    { label: "Marketplace", keys: ["shop", "cart", "orders", "subscriptions"] },
    { label: "My dairy", keys: ["farms/saved", "notifications", "reviews"] },
    { label: "Help", keys: ["complaints", "support", "profile"] },
  ],
  farmer: [
    { label: "Overview", keys: ["", "analytics"] },
    { label: "Farm", keys: ["profile", "batches", "products", "pricing"] },
    { label: "Freshness", keys: ["iot", "ai"] },
    { label: "Trade", keys: ["orders", "bids"] },
    { label: "Help", keys: ["complaints", "support", "settings"] },
  ],
  business: [
    { label: "Overview", keys: ["", "analytics"] },
    { label: "Procurement", keys: ["requests", "suppliers"] },
    { label: "Orders", keys: ["orders", "payments", "tracking"] },
    { label: "Help", keys: ["support", "profile"] },
  ],
  rider: [
    { label: "Overview", keys: [""] },
    { label: "Deliveries", keys: ["assignments", "history"] },
    { label: "Help", keys: ["support", "profile"] },
  ],
  admin: [
    { label: "Overview", keys: ["", "analytics"] },
    { label: "Manage", keys: ["users", "farms", "operations", "commerce", "b2b"] },
    { label: "Science", keys: ["ai-iot"] },
    { label: "Help", keys: ["support", "notifications", "profile"] },
  ],
  superadmin: [
    { label: "Governance", keys: ["", "cases", "users", "farms"] },
    { label: "Oversight", keys: ["ai-iot", "analytics", "audit-logs"] },
    { label: "System", keys: ["support", "settings", "profile"] },
  ],
};

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

function sectionize(role: Role, items: NavItem[]): Array<{ label: string; items: NavItem[] }> {
  const base = `/app/${role}`;
  const seen = new Set<string>();
  const sections = NAV_SECTIONS[role]
    .map((s) => {
      const sectionItems = s.keys
        .map((k) => (k === "" ? base : `${base}/${k}`))
        .map((to) => items.find((i) => i.to === to))
        .filter((i): i is NavItem => Boolean(i));
      sectionItems.forEach((i) => seen.add(i.to));
      return { label: s.label, items: sectionItems };
    })
    .filter((s) => s.items.length > 0);
  const rest = items.filter((i) => !seen.has(i.to));
  if (rest.length > 0) sections.push({ label: "More", items: rest });
  return sections;
}

function isItemActive(pathname: string, item: NavItem, role: Role): boolean {
  if (pathname === item.to) return true;
  const base = `/app/${role}`;
  if (item.to === base) return pathname === item.to;
  return pathname.startsWith(item.to + "/");
}

function NavPill({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[44px] items-center gap-3 text-sm font-medium transition-colors duration-150",
        collapsed ? "justify-center rounded-full p-3" : "rounded-full px-4 py-2.5",
        active
          ? "bg-[#00A878] text-[#0B3D33] shadow-[0_2px_10px_rgba(0,168,120,0.35)]"
          : "text-ivory/70 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

function Sidebar({
  role,
  onNavigate,
  collapsed,
  bare = false,
}: {
  role: Role;
  onNavigate?: () => void;
  collapsed: boolean;
  /** Drawer mode: skip the brand header and collapse toggle (the drawer has its own). */
  bare?: boolean;
}) {
  const location = useLocation();
  const items = useMemo(() => roleNav(role), [role]);
  const sections = useMemo(() => sectionize(role, items), [role, items]);

  return (
    <div className="flex h-full flex-col bg-[#0B3D33]">
      {!bare && (
        <Link
          to="/"
          onClick={onNavigate}
          aria-label="ApnaDairy home"
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-white/10",
            collapsed ? "justify-center px-2" : "gap-2.5 px-5",
          )}
        >
          <Logo compact={collapsed} className="[&_span]:!text-ivory" />
        </Link>
      )}

      <nav
        aria-label={`${ROLE_LABEL[role]} navigation`}
        className={cn("flex-1 overflow-y-auto", collapsed ? "px-2.5 py-4" : "px-3 py-5")}
      >
        {sections.map((section) => (
          <div key={section.label} className={cn(!collapsed && "mb-5 last:mb-0", collapsed && "mb-4 last:mb-0")}>
            {!collapsed ? (
              <p
                className={cn(
                  DISPLAY,
                  "mb-2 px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-ivory/40",
                )}
              >
                {section.label}
              </p>
            ) : (
              <span className="sr-only">{section.label}</span>
            )}
            <ul className={cn(collapsed ? "space-y-1.5" : "space-y-1")}>
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavPill
                    item={item}
                    active={isItemActive(location.pathname, item, role)}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-white/10",
          collapsed ? "flex flex-col items-center gap-2 p-3" : "p-4",
        )}
      >
        {!bare && <CollapseToggle collapsed={collapsed} />}
        {!collapsed && (
          <Link
            to="/"
            onClick={onNavigate}
            className="mt-3 block text-xs font-medium text-ivory/55 transition-colors hover:text-[#00A878]"
          >
            ← Back to website
          </Link>
        )}
      </div>
    </div>
  );
}

function CollapseToggle({ collapsed }: { collapsed: boolean }) {
  const { toggleSidebar } = useUiStore();
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-pressed={collapsed}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2.5 text-ivory/55 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Portal quick-find: searches the role's nav destinations and         */
/* navigates on select. Every result is a real route.                  */
/* ------------------------------------------------------------------ */
function PortalSearch({
  role,
  id,
  onNavigate,
  autoFullWidth,
}: {
  role: Role;
  id: string;
  onNavigate?: () => void;
  autoFullWidth?: boolean;
}) {
  const items = useMemo(() => roleNav(role), [role]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = `${id}-listbox`;

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return items.filter((i) => i.label.toLowerCase().includes(t)).slice(0, 7);
  }, [q, items]);

  useEffect(() => setHighlight(0), [results.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open ]);

  const go = (to: string) => {
    setOpen(false);
    setQ("");
    onNavigate?.();
    navigate(to);
  };

  return (
    <div ref={wrapRef} className={cn("relative", autoFullWidth ? "w-full" : "w-full max-w-xs")}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ivory/40"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id={id}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={`Search ${ROLE_LABEL[role]} sections`}
        placeholder={`Search ${PORTALS[role].label.toLowerCase()} sections…`}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && results.length > 0) {
            e.preventDefault();
            setHighlight((h) => (h + 1) % results.length);
          } else if (e.key === "ArrowUp" && results.length > 0) {
            e.preventDefault();
            setHighlight((h) => (h - 1 + results.length) % results.length);
          } else if (e.key === "Enter" && results.length > 0) {
            e.preventDefault();
            go(results[highlight].to);
          } else if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        className="h-11 w-full rounded-full border border-white/10 bg-white/[0.06] pl-10 pr-4 text-sm text-ivory placeholder:text-ivory/35 focus:border-[#00A878]/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {open && q.trim() !== "" && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0E3529] shadow-lift">
          {results.length === 0 ? (
            <p className="px-4 py-3.5 text-sm text-ivory/55">
              No sections match “{q.trim()}”.
            </p>
          ) : (
            <ul role="listbox" id={listId} aria-label="Matching sections" className="py-1.5">
              {results.map((r, i) => {
                const Icon = r.icon;
                return (
                  <li key={r.to} role="option" aria-selected={i === highlight}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => go(r.to)}
                      className={cn(
                        "flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-sm transition-colors",
                        i === highlight ? "bg-[#00A878]/20 text-white" : "text-ivory/75",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {r.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile menu: dynamic authenticated identity, profile/settings      */
/* links derived from the portal config, working logout.               */
/* ------------------------------------------------------------------ */
function rolePage(role: Role, paths: string[]): string | null {
  const routes = PORTALS[role].routes;
  for (const p of paths) {
    if (routes.some((r) => r.path === p)) return `/app/${role}/${p}`;
  }
  return null;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ProfileMenu({ role }: { role: Role }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const name = user?.fullName ?? ROLE_LABEL[role];
  const email = user?.email ?? "";

  const profileTo = rolePage(role, ["profile", "settings"]);
  const settingsTo = rolePage(role, ["settings"]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${name}`}
        className="flex min-h-[44px] items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-white/10"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00A878] text-xs font-bold tracking-wide text-[#0B3D33]"
        >
          {initialsOf(name)}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-ivory/60 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            id={menuId}
            role="menu"
            aria-label="Account"
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-lift"
          >
            <div className="border-b border-line bg-ivory px-4 py-3.5">
              <p className="truncate text-sm font-semibold">{name}</p>
              {email && <p className="truncate text-xs text-muted">{email}</p>}
              <p
                className={cn(
                  DISPLAY,
                  "mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-moss",
                )}
              >
                {ROLE_LABEL[role]}
              </p>
            </div>
            <div className="p-1.5">
              {profileTo && (
                <Link
                  to={profileTo}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink transition-colors hover:bg-palegreen"
                >
                  <UserRound className="h-4 w-4 text-brand-moss" aria-hidden="true" />
                  My profile
                </Link>
              )}
              {settingsTo && settingsTo !== profileTo && (
                <Link
                  to={settingsTo}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink transition-colors hover:bg-palegreen"
                >
                  <Settings className="h-4 w-4 text-brand-moss" aria-hidden="true" />
                  Settings
                </Link>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  logout();
                  navigate("/login");
                }}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Topbar: menu, dynamic identity, quick-find, notifications, profile.  */
/* ------------------------------------------------------------------ */
function Topbar({ role }: { role: Role }) {
  const { user } = useAuthStore();
  const { setMobileNavOpen } = useUiStore();
  const location = useLocation();
  const searchId = useId();
  const resolved = resolvePortalPath(location.pathname);
  const def = resolved && resolved.role === role ? findPortalRoute(role, resolved.relative) : undefined;
  const notifRoute = PORTALS[role].routes.find((r) => r.path === "notifications");
  const notifTo = notifRoute ? `/app/${role}/notifications` : null;
  const name = user?.fullName ?? ROLE_LABEL[role];

  return (
    <div className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#0B3D33]/95 px-3 py-2 backdrop-blur-xl sm:gap-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-ivory transition-colors hover:bg-white/10 lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="hidden max-w-xs md:block lg:max-w-none">
          <PortalSearch role={role} id={searchId} />
        </div>
        <div className="min-w-0 md:ml-1">
          <p className="truncate text-sm font-semibold text-ivory">{name}</p>
          <p
            className={cn(
              DISPLAY,
              "truncate text-[11px] font-medium uppercase tracking-[0.18em] text-ivory/50",
            )}
          >
            {def?.title ?? PORTALS[role].label} · {ROLE_LABEL[role]}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {notifTo && (
          <Link
            to={notifTo}
            aria-label="Notifications"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2.5 text-ivory/65 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Link>
        )}
        <ProfileMenu role={role} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Breadcrumbs: Home → portal → current page (config-derived title).   */
/* ------------------------------------------------------------------ */
function Breadcrumbs({ role }: { role: Role }) {
  const location = useLocation();
  const resolved = resolvePortalPath(location.pathname);
  const def = resolved && resolved.role === role ? findPortalRoute(role, resolved.relative) : undefined;
  const current = def?.title ?? "Portal";

  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted transition-colors hover:text-brand"
          >
            Home
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3.5 w-3.5 text-muted/60" />
        </li>
        <li>
          <Link
            to={`/app/${role}`}
            className={cn(DISPLAY, "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted transition-colors hover:text-brand")}
          >
            {PORTALS[role].label} portal
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3.5 w-3.5 text-muted/60" />
        </li>
        <li>
          <span
            aria-current="page"
            className={cn(DISPLAY, "text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-pine")}
          >
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile drawer: slide-in panel, focus trap, Escape close, scroll      */
/* lock, ≥44px targets, focus return.                                  */
/* ------------------------------------------------------------------ */
function MobileDrawer({ role }: { role: Role }) {
  const { mobileNavOpen, setMobileNavOpen } = useUiStore();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const searchId = useId();
  const close = () => setMobileNavOpen(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    previouslyFocused.current = document.activeElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    const t = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>('button[aria-label="Close navigation"]')
        ?.focus();
    }, 60);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(t);
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileNavOpen]);

  return (
    <AnimatePresence>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.button
            type="button"
            aria-label="Close navigation"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 cursor-default bg-[#0B3D33]/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${ROLE_LABEL[role]} navigation`}
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-80 max-w-[88vw] flex-col bg-[#0B3D33] shadow-lift outline-none"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", damping: 30, stiffness: 320 }
            }
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <Link to="/" onClick={close} aria-label="ApnaDairy home" className="min-w-0">
                <Logo className="[&_span]:!text-ivory" />
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label="Close navigation"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-ivory/65 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="shrink-0 border-b border-white/10 p-3">
              <PortalSearch role={role} id={searchId} autoFullWidth onNavigate={close} />
            </div>
            <div className="min-h-0 flex-1">
              <Sidebar role={role} onNavigate={close} collapsed={false} bare />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Authenticated portal shell — Ploy-inspired editorial chrome:
 * deep-forest sidebar + topbar (ink #10261E family), ivory text,
 * #00A878 active pill accents, light ivory content surface.
 * Feature pages render inside via <Outlet/> — page logic untouched.
 */
export function DashboardLayout({ role, children }: { role: Role; children?: ReactNode }) {
  const location = useLocation();
  const { mobileNavOpen, setMobileNavOpen, sidebarCollapsed } = useUiStore();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-screen bg-brand-forest">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#00A878] focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-[#0B3D33]"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-white/10 bg-[#0B3D33] transition-[width] duration-200 lg:block",
          sidebarCollapsed ? "w-[76px]" : "w-64",
        )}
        aria-hidden={false}
      >
        <Sidebar role={role} collapsed={sidebarCollapsed} />
      </aside>

      <MobileDrawer role={role} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} />
        <main id="main-content" className="flex-1 bg-ivory p-4 text-ink sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-6xl">
            <Breadcrumbs role={role} />
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
