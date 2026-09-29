import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ClipboardList,
  FileText,
  FlaskConical,
  Heart,
  History,
  LayoutDashboard,
  MessageCircle,
  Milk,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tags,
  Thermometer,
  Truck,
  Users,
  Wallet,
  Handshake,
  Building2,
  Route as RouteIcon,
  BarChart3,
  PackageCheck,
  ScrollText,
} from "lucide-react";
import type { Role } from "../lib/constants";
import { DEMO_LABELS } from "../lib/constants";

export interface PortalRouteDef {
  /** Relative path under the role base, e.g. "batches" or "batches/:id". "" = index. */
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Shown in the sidebar when present. */
  navLabel?: string;
  emptyHint: string;
}

export interface PortalDef {
  label: string;
  routes: PortalRouteDef[];
}

const notifHint = "You're all caught up — new updates will appear here.";
const listHint =
  "Nothing here yet. New items will appear in this list as soon as there's activity.";

export const PORTALS: Record<Role, PortalDef> = {
  customer: {
    label: "Customer",
    routes: [
      { path: "", title: "Dashboard", description: "Your orders, subscriptions and updates at a glance.", icon: LayoutDashboard, navLabel: "Dashboard", emptyHint: "Your dashboard will light up once you start ordering." },
      { path: "shop", title: "Marketplace", description: "Fresh dairy from verified farms, with AI freshness scores on every listing.", icon: ShoppingBag, navLabel: "Shop", emptyHint: "Products will appear here once the catalog is live." },
      { path: "products/:id", title: "Product details", description: "Full product information and farm origin.", icon: Package, emptyHint: listHint },
      { path: "cart", title: "Cart", description: "Review your items before checkout.", icon: ShoppingCart, navLabel: "Cart", emptyHint: "Your cart is empty — browse the marketplace to add fresh dairy." },
      { path: "checkout", title: "Checkout", description: `Complete your order. ${DEMO_LABELS.payment}.`, icon: Wallet, emptyHint: "Your cart is empty, so there's nothing to check out yet." },
      { path: "orders", title: "My orders", description: "Track and review all your orders in one place.", icon: ClipboardList, navLabel: "Orders", emptyHint: "You haven't placed any orders yet." },
      { path: "orders/:id", title: "Order details", description: "Items, payment and delivery status for this order.", icon: FileText, emptyHint: listHint },
      { path: "track/:deliveryId", title: "Delivery tracking", description: "Live status of your delivery from farm to doorstep.", icon: Truck, emptyHint: "No active deliveries right now." },
      { path: "subscriptions", title: "Subscriptions", description: "Daily or weekly milk plans — pause, skip or cancel anytime.", icon: History, navLabel: "Subscriptions", emptyHint: "No subscriptions yet — set up a daily milk plan from any product." },
      { path: "farms/saved", title: "Saved farms", description: "Farms you follow for quick access.", icon: Heart, navLabel: "Saved farms", emptyHint: "You haven't saved any farms yet." },
      { path: "notifications", title: "Notifications", description: "Account, farm and delivery updates.", icon: Bell, navLabel: "Notifications", emptyHint: notifHint },
      { path: "reviews", title: "My reviews", description: "Ratings and reviews you've left for farms and products.", icon: Star, navLabel: "Reviews", emptyHint: "You haven't written any reviews yet." },
      { path: "complaints", title: "Complaints", description: "Raise and follow up on issues with orders or products.", icon: MessageCircle, navLabel: "Complaints", emptyHint: "No complaints filed — we hope it stays that way." },
      { path: "support", title: "Support", description: "FAQs and help from the ApnaDairy team.", icon: MessageCircle, navLabel: "Support", emptyHint: "Browse the FAQs or start a conversation." },
      { path: "profile", title: "Profile & settings", description: "Your account details, addresses and preferences.", icon: Settings, navLabel: "Profile", emptyHint: listHint },
    ],
  },
  farmer: {
    label: "Farmer",
    routes: [
      { path: "", title: "Farm dashboard", description: "Your farm at a glance — batches, monitoring and freshness.", icon: LayoutDashboard, navLabel: "Dashboard", emptyHint: "Complete onboarding to activate your dashboard." },
      { path: "onboarding", title: "Farm onboarding", description: "Register your farm: identity, location and verification.", icon: ShieldCheck, emptyHint: listHint },
      { path: "profile", title: "Farm profile", description: "Your verified farm identity and operating details.", icon: Building2, navLabel: "Farm profile", emptyHint: "Your public farm profile will appear here after verification." },
      { path: "batches", title: "Milk batches", description: "Record and manage every milking batch with a unique traceable code.", icon: Milk, navLabel: "Batches", emptyHint: "No batches recorded yet — add your first milking batch." },
      { path: "batches/:id", title: "Batch details", description: "Readings, AI scores and traceability for this batch.", icon: FileText, emptyHint: listHint },
      { path: "iot", title: "IoT monitoring", description: `Sensor readings across your batches. ${DEMO_LABELS.iot}.`, icon: Thermometer, navLabel: "IoT", emptyHint: "No sensor readings yet — readings appear as batches are monitored." },
      { path: "ai", title: "AI freshness", description: `Shelf-life estimates and spoilage risk per batch. ${DEMO_LABELS.ai}.`, icon: FlaskConical, navLabel: "AI freshness", emptyHint: "No predictions yet — scores appear after batches are analyzed." },
      { path: "products", title: "Products", description: "List dairy products from your farm for the marketplace.", icon: Package, navLabel: "Products", emptyHint: "No products listed yet — create your first listing." },
      { path: "pricing", title: "Pricing & discounts", description: "Set prices and create discounts; every change is logged.", icon: Tags, navLabel: "Pricing", emptyHint: "No pricing rules yet." },
      { path: "orders", title: "Orders", description: "Customer and bulk orders placed against your products.", icon: ShoppingCart, navLabel: "Orders", emptyHint: "No orders yet — they'll appear here when customers buy." },
      { path: "bids", title: "B2B quotations", description: "Quote on bulk purchase requests from business buyers.", icon: Handshake, navLabel: "B2B bids", emptyHint: "No quotation requests right now." },
      { path: "analytics", title: "Analytics", description: "Revenue, production and quality analytics for your farm.", icon: BarChart3, navLabel: "Analytics", emptyHint: "Analytics unlock as your farm records activity." },
      { path: "complaints", title: "Complaints", description: "Customer complaints linked to your farm or products.", icon: MessageCircle, navLabel: "Complaints", emptyHint: "No complaints — keep up the good work." },
      { path: "support", title: "Support", description: "Help and FAQs for farmers.", icon: MessageCircle, navLabel: "Support", emptyHint: "Browse the FAQs or start a conversation." },
      { path: "settings", title: "Settings", description: "Account and notification preferences.", icon: Settings, navLabel: "Settings", emptyHint: listHint },
    ],
  },
  business: {
    label: "Business",
    routes: [
      { path: "", title: "Business dashboard", description: "Procurement overview — requests, quotations and bulk orders.", icon: LayoutDashboard, navLabel: "Dashboard", emptyHint: "Complete onboarding to activate your dashboard." },
      { path: "onboarding", title: "Buyer onboarding", description: "Set up your business to start bulk procurement.", icon: Building2, emptyHint: listHint },
      { path: "requests", title: "Bulk requests", description: "Post what you need; verified farms respond with quotations.", icon: ClipboardList, navLabel: "Requests", emptyHint: "No purchase requests yet — post your first requirement." },
      { path: "requests/:id", title: "Request details", description: "Quotations received for this request, side by side.", icon: FileText, emptyHint: listHint },
      { path: "suppliers", title: "Suppliers", description: "Verified dairy farms on the ApnaDairy network.", icon: Users, navLabel: "Suppliers", emptyHint: "No suppliers listed yet." },
      { path: "orders", title: "Orders", description: "Accepted bulk orders and their fulfilment status.", icon: PackageCheck, navLabel: "Orders", emptyHint: "No orders yet." },
      { path: "payments", title: "Payments", description: `Payment records for orders. ${DEMO_LABELS.payment}.`, icon: Wallet, navLabel: "Payments", emptyHint: "No payments recorded yet." },
      { path: "tracking", title: "Deliveries", description: "Track deliveries from farm to your facility.", icon: Truck, navLabel: "Tracking", emptyHint: "No deliveries right now." },
      { path: "tracking/:deliveryId", title: "Delivery tracking", description: "Live status of this delivery.", icon: Truck, emptyHint: "No active deliveries right now." },
      { path: "analytics", title: "Analytics", description: "Spend, volume and order analytics.", icon: BarChart3, navLabel: "Analytics", emptyHint: "Analytics unlock as you procure." },
      { path: "support", title: "Support", description: "Help and FAQs for business buyers.", icon: MessageCircle, navLabel: "Support", emptyHint: "Browse the FAQs or start a conversation." },
      { path: "profile", title: "Profile", description: "Business details and preferences.", icon: Settings, navLabel: "Profile", emptyHint: listHint },
    ],
  },
  rider: {
    label: "Delivery Rider",
    routes: [
      { path: "", title: "Rider dashboard", description: "Today's assignments and delivery status.", icon: LayoutDashboard, navLabel: "Dashboard", emptyHint: "New assignments will appear here." },
      { path: "assignments", title: "Assignments", description: "Deliveries assigned to you — pick up, move and deliver.", icon: ClipboardList, navLabel: "Assignments", emptyHint: "No assignments right now — check back soon." },
      { path: "assignments/:id", title: "Assignment details", description: "Delivery details, status updates and tracking notes.", icon: RouteIcon, emptyHint: listHint },
      { path: "history", title: "Delivery history", description: "Completed deliveries and your record.", icon: History, navLabel: "History", emptyHint: "No completed deliveries yet." },
      { path: "support", title: "Support", description: "Help and FAQs for riders.", icon: MessageCircle, navLabel: "Support", emptyHint: "Browse the FAQs or start a conversation." },
      { path: "profile", title: "Profile", description: "Your rider details and preferences.", icon: Settings, navLabel: "Profile", emptyHint: listHint },
    ],
  },
  admin: {
    label: "Administrator",
    routes: [
      { path: "", title: "Admin dashboard", description: "Platform health — users, farms, batches and alerts.", icon: LayoutDashboard, navLabel: "Dashboard", emptyHint: "Platform metrics will appear here once data flows in." },
      { path: "users", title: "Users", description: "Manage all platform users across roles.", icon: Users, navLabel: "Users", emptyHint: "No users found for this filter." },
      { path: "farms", title: "Farms", description: "Review and verify farm applications; oversee all farms.", icon: ShieldCheck, navLabel: "Farms", emptyHint: "No pending farm applications." },
      { path: "operations", title: "Operations", description: "Batches, orders, payments and deliveries across the platform.", icon: ClipboardList, navLabel: "Operations", emptyHint: "No activity yet." },
      { path: "commerce", title: "Commerce", description: "Catalog, pricing rules and subscriptions.", icon: ShoppingCart, navLabel: "Commerce", emptyHint: "No commerce activity yet." },
      { path: "b2b", title: "B2B oversight", description: "Bulk requests and quotation activity.", icon: Handshake, navLabel: "B2B", emptyHint: "No B2B activity yet." },
      { path: "ai-iot", title: "AI & IoT", description: `Model health and freshness flags. ${DEMO_LABELS.ai}.`, icon: FlaskConical, navLabel: "AI & IoT", emptyHint: "No predictions yet." },
      { path: "analytics", title: "Analytics", description: "Platform-wide revenue, quality and growth analytics.", icon: BarChart3, navLabel: "Analytics", emptyHint: "Analytics unlock as the platform records activity." },
      { path: "support", title: "Support", description: "Complaints and the admin action log.", icon: MessageCircle, navLabel: "Support", emptyHint: "No open tickets." },
      { path: "chat", title: "Chat oversight", description: "Read-only review of assistant conversations.", icon: MessageCircle, navLabel: "Chat", emptyHint: "No conversations yet." },
      { path: "notifications", title: "Notifications", description: "Platform-wide notification broadcast.", icon: Bell, navLabel: "Notifications", emptyHint: notifHint },
      { path: "profile", title: "Profile", description: "Administrator account details.", icon: Settings, navLabel: "Profile", emptyHint: listHint },
    ],
  },
  superadmin: {
    label: "Super Admin",
    routes: [
      { path: "", title: "Governance dashboard", description: "Platform access, farms, cases and system integrity.", icon: LayoutDashboard, navLabel: "Dashboard", emptyHint: "Governance metrics will appear here." },
      { path: "cases", title: "Cases", description: "Escalations and complaints in one review queue.", icon: MessageCircle, navLabel: "Cases", emptyHint: "No cases require review." },
      { path: "users", title: "Users & Admin access", description: "Accounts, Admin applications and farm assignments.", icon: Users, navLabel: "Users & Admins", emptyHint: "No accounts match this view." },
      { path: "farms", title: "Farm oversight", description: "Platform-wide farm verification and coverage.", icon: Building2, navLabel: "Farms", emptyHint: "No farms match this view." },
      { path: "ai-iot", title: "AI & IoT oversight", description: `Model status, batch flags and sensor monitoring. ${DEMO_LABELS.ai}.`, icon: FlaskConical, navLabel: "AI & IoT", emptyHint: "No AI or IoT activity yet." },
      { path: "analytics", title: "Platform analytics", description: "Account, farm, batch, case and monitoring trends.", icon: BarChart3, navLabel: "Analytics", emptyHint: "No analytics are available yet." },
      { path: "audit-logs", title: "Audit logs", description: "Administrative and governance actions.", icon: ScrollText, navLabel: "Audit logs", emptyHint: "No administrative actions recorded." },
      { path: "support", title: "Technical support", description: "Configured technical support contacts.", icon: MessageCircle, navLabel: "Support", emptyHint: "No support contacts configured." },
      { path: "settings", title: "Platform settings", description: "Safe non-secret platform configuration.", icon: Settings, navLabel: "Settings", emptyHint: "No platform settings configured." },
      { path: "profile", title: "Profile", description: "Super Administrator account details.", icon: Settings, navLabel: "Profile", emptyHint: listHint },
    ],
  },
};

/** Sidebar navigation entries for a role (only routes with navLabel). */
export function roleNav(role: Role): Array<{ to: string; label: string; icon: LucideIcon }> {
  const base = `/app/${role}`;
  return PORTALS[role].routes
    .filter((r) => r.navLabel)
    .map((r) => ({
      to: r.path === "" ? base : `${base}/${r.path}`,
      label: r.navLabel as string,
      icon: r.icon,
    }));
}

/** Find a route def by its relative path (params like ":id" matched loosely). */
export function findPortalRoute(role: Role, relativePath: string): PortalRouteDef | undefined {
  const routes = PORTALS[role].routes;
  const exact = routes.find((r) => r.path === relativePath);
  if (exact) return exact;
  // Match ":param" segments
  return routes.find((r) => {
    const pattern = `^${r.path.replace(/:[^/]+/g, "[^/]+")}$`;
    return new RegExp(pattern).test(relativePath);
  });
}

/** Map a router path (e.g. "/app/farmer/batches/12") to role + relative path. */
export function resolvePortalPath(pathname: string): { role: Role; relative: string } | null {
  const m = pathname.match(/^\/app\/(customer|farmer|business|rider|admin|superadmin)(\/.*)?$/);
  if (!m) return null;
  const role = m[1] as Role;
  const relative = (m[2] ?? "/").replace(/^\//, "");
  return { role, relative };
}
