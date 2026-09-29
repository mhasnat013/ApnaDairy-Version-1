import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/auth";
import { ROLE_HOME, type Role } from "../lib/constants";

/** Allow only safe internal redirect targets (prevents open-redirect attacks). */
export function safeNext(raw: string | null): string {
  if (!raw) return "/";
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    const target = url.pathname + url.search + url.hash;
    return target.startsWith("/") && !target.startsWith("//") ? target : "/";
  } catch {
    return "/";
  }
}

/** Requires a logged-in user; otherwise redirects to /login?next=<original URL>. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const location = useLocation();

  if (isInitializing) return null;
  if (!isAuthenticated()) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}

/** Requires one of the given roles; wrong role (or guest) goes to /unauthorized. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, isAuthenticated, isInitializing } = useAuthStore();
  const location = useLocation();

  if (isInitializing) return null;
  if (!isAuthenticated() || !user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
}

/** /app index: send each authenticated role to its own home. */
export function RoleRedirect() {
  const { user, isAuthenticated, isInitializing } = useAuthStore();
  const location = useLocation();

  if (isInitializing) return null;
  if (!isAuthenticated() || !user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}
