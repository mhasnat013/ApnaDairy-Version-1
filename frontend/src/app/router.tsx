import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { RequireAuth, RequireRole, RoleRedirect } from "./guards";
import { NotFound } from "../pages/public/NotFound";

// Home stays statically imported — owned by Agent 2 and the landing page.
import { Home } from "../pages/public/Home";

/** Route-level code splitting for public + auth pages (brief §29). */
function lazyPage<T extends React.ComponentType<Record<string, never>>>(
  importer: () => Promise<Record<string, T>>,
  exportName: string,
) {
  return lazy(async () => {
    const reloadKey = `apnadairy:chunk-reload:${window.location.pathname}`;
    try {
      const module = await importer();
      sessionStorage.removeItem(reloadKey);
      return { default: module[exportName] as T };
    } catch (error) {
      // An already-open tab can reference an old Vite chunk immediately after
      // a new production build. Reload once so it receives the current index
      // and chunk names instead of showing React Router's raw import error.
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
        return await new Promise<never>(() => undefined);
      }
      sessionStorage.removeItem(reloadKey);
      throw error;
    }
  });
}

function withSuspense(element: ReactNode): ReactNode {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading page">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-brand/25 border-t-brand" aria-hidden="true" />
        </div>
      }
    >
      {element}
    </Suspense>
  );
}

// Public pages (lazy)
const HowItWorks = lazyPage(() => import("../pages/public/HowItWorks"), "HowItWorks");
const FreshnessEngine = lazyPage(() => import("../pages/public/FreshnessEngine"), "FreshnessEngine");
const ForFarmers = lazyPage(() => import("../pages/public/ForFarmers"), "ForFarmers");
const ForCustomers = lazyPage(() => import("../pages/public/ForCustomers"), "ForCustomers");
const ForBusinesses = lazyPage(() => import("../pages/public/ForBusinesses"), "ForBusinesses");
const ForDeliveryRiders = lazyPage(() => import("../pages/public/ForDeliveryRiders"), "ForDeliveryRiders");
const Farms = lazyPage(() => import("../pages/public/Farms"), "Farms");
const FarmDetail = lazyPage(() => import("../pages/public/FarmDetail"), "FarmDetail");
const Marketplace = lazyPage(() => import("../pages/public/Marketplace"), "Marketplace");
const ProductDetail = lazyPage(() => import("../pages/public/ProductDetail"), "ProductDetail");
const DynamicPricing = lazyPage(() => import("../pages/public/DynamicPricing"), "DynamicPricing");
const About = lazyPage(() => import("../pages/public/About"), "About");
const Support = lazyPage(() => import("../pages/public/Support"), "Support");
const Contact = lazyPage(() => import("../pages/public/Contact"), "Contact");
const Faq = lazyPage(() => import("../pages/public/Faq"), "Faq");
const Privacy = lazyPage(() => import("../pages/public/Privacy"), "Privacy");
const Terms = lazyPage(() => import("../pages/public/Terms"), "Terms");
const Unauthorized = lazyPage(() => import("../pages/public/Unauthorized"), "Unauthorized");

// Auth pages (lazy)
const Login = lazyPage(() => import("../pages/auth/Login"), "Login");
const Register = lazyPage(() => import("../pages/auth/Register"), "Register");
const ForgotPassword = lazyPage(() => import("../pages/auth/ForgotPassword"), "ForgotPassword");
const ResetPassword = lazyPage(() => import("../pages/auth/ResetPassword"), "ResetPassword");

// Customer portal
import { CustomerDashboard } from "../pages/app/customer/Dashboard";
import { Shop as CustomerShop } from "../pages/app/customer/Shop";
import { CustomerProductDetail } from "../pages/app/customer/ProductDetail";
import { CartPage as CustomerCart } from "../pages/app/customer/Cart";
import { Checkout as CustomerCheckout } from "../pages/app/customer/Checkout";
import { CustomerOrders } from "../pages/app/customer/Orders";
import { CustomerOrderDetail } from "../pages/app/customer/OrderDetail";
import { CustomerTrackDelivery } from "../pages/app/customer/TrackDelivery";
import { CustomerSubscriptions } from "../pages/app/customer/Subscriptions";
import { SavedFarms as CustomerSavedFarms } from "../pages/app/customer/SavedFarms";
import { NotificationsPage as CustomerNotifications } from "../pages/app/customer/Notifications";
import { CustomerReviews } from "../pages/app/customer/Reviews";
import { CustomerComplaints } from "../pages/app/customer/Complaints";
import { CustomerSupport, CustomerProfile } from "../pages/app/customer/Wrappers";

// Farmer portal
import { FarmerDashboard } from "../pages/app/farmer/Dashboard";
import { FarmerOnboarding } from "../pages/app/farmer/Onboarding";
import { FarmProfile } from "../pages/app/farmer/FarmProfile";
import { FarmerBatches } from "../pages/app/farmer/Batches";
import { FarmerBatchDetail } from "../pages/app/farmer/BatchDetail";
import { FarmerIoT } from "../pages/app/farmer/IoT";
import { FarmerAI } from "../pages/app/farmer/AI";
import { FarmerProducts } from "../pages/app/farmer/Products";
import { FarmerPricing } from "../pages/app/farmer/Pricing";
import { FarmerOrders } from "../pages/app/farmer/Orders";
import { FarmerQuotations } from "../pages/app/farmer/Quotations";
import { FarmerAnalytics } from "../pages/app/farmer/Analytics";
import { FarmerComplaints } from "../pages/app/farmer/Complaints";
import { FarmerSupport, FarmerSettings } from "../pages/app/farmer/Wrappers";

// Business portal
import { BusinessDashboard } from "../pages/app/business/Dashboard";
import { BusinessRequests } from "../pages/app/business/Requests";
import { BusinessRequestDetail } from "../pages/app/business/RequestDetail";
import { BusinessSuppliers } from "../pages/app/business/Suppliers";
import { BusinessOrders, BusinessPayments, BusinessAnalytics } from "../pages/app/business/Commerce";
import { BusinessTrackingList } from "../pages/app/business/TrackingList";
import { BusinessSupport, BusinessProfile, BusinessTracking, BusinessOnboarding } from "../pages/app/business/Wrappers";

// Rider portal
import { RiderDashboard } from "../pages/app/rider/Dashboard";
import { RiderAssignments, RiderAssignmentDetail, RiderHistory } from "../pages/app/rider/Deliveries";
import { RiderSupport, RiderProfile } from "../pages/app/rider/Wrappers";

// Admin portal
import { AdminDashboard } from "../pages/app/admin/Dashboard";
import { AdminUsers } from "../pages/app/admin/Users";
import { AdminFarms } from "../pages/app/admin/Farms";
import { AdminOperations } from "../pages/app/admin/Operations";
import { AdminCommerce } from "../pages/app/admin/Commerce";
import { AdminB2B } from "../pages/app/admin/B2B";
import { AdminAIIoT } from "../pages/app/admin/AIIoT";
import { AdminAnalytics } from "../pages/app/admin/Analytics";
import { AdminSupport } from "../pages/app/admin/Support";
import { AdminProfile, AdminChat, AdminNotifications } from "../pages/app/admin/Wrappers";

// Super Admin governance portal
import { SuperAdminDashboard } from "../pages/app/superadmin/Dashboard";
import { SuperAdminCases } from "../pages/app/superadmin/Cases";
import { SuperAdminUsers } from "../pages/app/superadmin/Users";
import { SuperAdminFarms } from "../pages/app/superadmin/Farms";
import { SuperAdminAnalytics } from "../pages/app/superadmin/Analytics";
import { SuperAdminAuditLogs } from "../pages/app/superadmin/AuditLogs";
import { SuperAdminSupport } from "../pages/app/superadmin/Support";
import { SuperAdminSettings } from "../pages/app/superadmin/Settings";
import { ProfilePage } from "../pages/app/shared/Profile";

/** Portal section factory: /app/<role>/* guarded by auth + role, with explicit nested routes. */
function portal(
  role: "customer" | "farmer" | "business" | "rider" | "admin" | "superadmin",
  children: Array<{ index?: boolean; path?: string; element: ReactNode }>,
) {
  return {
    path: `/app/${role}`,
    element: (
      <RequireAuth>
        <RequireRole roles={[role]}>
          <DashboardLayout role={role} />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      ...children,
      { path: "*", element: <NotFound /> },
    ],
  };
}

const LEGACY_ADMIN_REDIRECTS: Array<[string, string]> = [
  ["/admin-dashboard", "/app/admin"],
  ["/farm-approvals", "/app/admin/farms"],
  ["/admin-milk-batches", "/app/admin/operations"],
  ["/admin-orders", "/app/admin/operations"],
  ["/admin-b2b", "/app/admin/b2b"],
  ["/admin-users", "/app/admin/users"],
  ["/admin-analytics", "/app/admin/analytics"],
  ["/admin-complaints", "/app/admin/support"],
  ["/admin-support", "/app/admin/support"],
  ["/admin-profile", "/app/admin/profile"],
];

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "how-it-works", element: withSuspense(<HowItWorks />) },
      { path: "freshness-engine", element: withSuspense(<FreshnessEngine />) },
      { path: "for-farmers", element: withSuspense(<ForFarmers />) },
      { path: "for-customers", element: withSuspense(<ForCustomers />) },
      { path: "for-businesses", element: withSuspense(<ForBusinesses />) },
      { path: "for-delivery-riders", element: withSuspense(<ForDeliveryRiders />) },
      { path: "farms", element: withSuspense(<Farms />) },
      { path: "farms/:farmId", element: withSuspense(<FarmDetail />) },
      { path: "marketplace", element: withSuspense(<Marketplace />) },
      { path: "products/:productId", element: withSuspense(<ProductDetail />) },
      { path: "dynamic-pricing", element: withSuspense(<DynamicPricing />) },
      { path: "about", element: withSuspense(<About />) },
      { path: "support", element: withSuspense(<Support />) },
      { path: "contact", element: withSuspense(<Contact />) },
      { path: "faq", element: withSuspense(<Faq />) },
      { path: "login", element: withSuspense(<Login />) },
      { path: "register", element: withSuspense(<Register />) },
      { path: "forgot-password", element: withSuspense(<ForgotPassword />) },
      { path: "reset-password", element: withSuspense(<ResetPassword />) },
      { path: "privacy", element: withSuspense(<Privacy />) },
      { path: "terms", element: withSuspense(<Terms />) },
      { path: "unauthorized", element: withSuspense(<Unauthorized />) },
      ...LEGACY_ADMIN_REDIRECTS.map(([from, to]) => ({
        path: from.replace(/^\//, ""),
        element: <Navigate to={to} replace />,
      })),
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/app",
    element: <RoleRedirect />,
  },
  portal("customer", [
    { path: "", element: <CustomerDashboard /> },
    { path: "shop", element: <CustomerShop /> },
    { path: "products/:id", element: <CustomerProductDetail /> },
    { path: "cart", element: <CustomerCart /> },
    { path: "checkout", element: <CustomerCheckout /> },
    { path: "orders", element: <CustomerOrders /> },
    { path: "orders/:id", element: <CustomerOrderDetail /> },
    { path: "track/:deliveryId", element: <CustomerTrackDelivery /> },
    { path: "subscriptions", element: <CustomerSubscriptions /> },
    { path: "farms/saved", element: <CustomerSavedFarms /> },
    { path: "notifications", element: <CustomerNotifications /> },
    { path: "reviews", element: <CustomerReviews /> },
    { path: "complaints", element: <CustomerComplaints /> },
    { path: "support", element: <CustomerSupport /> },
    { path: "profile", element: <CustomerProfile /> },
  ]),
  portal("farmer", [
    { path: "", element: <FarmerDashboard /> },
    { path: "onboarding", element: <FarmerOnboarding /> },
    { path: "profile", element: <FarmProfile /> },
    { path: "batches", element: <FarmerBatches /> },
    { path: "batches/:id", element: <FarmerBatchDetail /> },
    { path: "iot", element: <FarmerIoT /> },
    { path: "ai", element: <FarmerAI /> },
    { path: "products", element: <FarmerProducts /> },
    { path: "pricing", element: <FarmerPricing /> },
    { path: "orders", element: <FarmerOrders /> },
    { path: "bids", element: <FarmerQuotations /> },
    { path: "analytics", element: <FarmerAnalytics /> },
    { path: "complaints", element: <FarmerComplaints /> },
    { path: "support", element: <FarmerSupport /> },
    { path: "settings", element: <FarmerSettings /> },
  ]),
  portal("business", [
    { path: "", element: <BusinessDashboard /> },
    { path: "onboarding", element: <BusinessOnboarding /> },
    { path: "requests", element: <BusinessRequests /> },
    { path: "requests/:id", element: <BusinessRequestDetail /> },
    { path: "suppliers", element: <BusinessSuppliers /> },
    { path: "orders", element: <BusinessOrders /> },
    { path: "payments", element: <BusinessPayments /> },
    { path: "tracking", element: <BusinessTrackingList /> },
    { path: "tracking/:deliveryId", element: <BusinessTracking /> },
    { path: "analytics", element: <BusinessAnalytics /> },
    { path: "support", element: <BusinessSupport /> },
    { path: "profile", element: <BusinessProfile /> },
  ]),
  portal("rider", [
    { path: "", element: <RiderDashboard /> },
    { path: "assignments", element: <RiderAssignments /> },
    { path: "assignments/:id", element: <RiderAssignmentDetail /> },
    { path: "history", element: <RiderHistory /> },
    { path: "support", element: <RiderSupport /> },
    { path: "profile", element: <RiderProfile /> },
  ]),
  portal("admin", [
    { path: "", element: <AdminDashboard /> },
    { path: "users", element: <AdminUsers /> },
    { path: "farms", element: <AdminFarms /> },
    { path: "operations", element: <AdminOperations /> },
    { path: "commerce", element: <AdminCommerce /> },
    { path: "b2b", element: <AdminB2B /> },
    { path: "ai-iot", element: <AdminAIIoT /> },
    { path: "analytics", element: <AdminAnalytics /> },
    { path: "support", element: <AdminSupport /> },
    { path: "chat", element: <AdminChat /> },
    { path: "notifications", element: <AdminNotifications /> },
    { path: "profile", element: <AdminProfile /> },
  ]),
  portal("superadmin", [
    { path: "", element: <SuperAdminDashboard /> },
    { path: "cases", element: <SuperAdminCases /> },
    { path: "users", element: <SuperAdminUsers /> },
    { path: "farms", element: <SuperAdminFarms /> },
    { path: "ai-iot", element: <AdminAIIoT /> },
    { path: "analytics", element: <SuperAdminAnalytics /> },
    { path: "audit-logs", element: <SuperAdminAuditLogs /> },
    { path: "support", element: <SuperAdminSupport /> },
    { path: "settings", element: <SuperAdminSettings /> },
    { path: "profile", element: <ProfilePage role="superadmin" /> },
  ]),
]);
