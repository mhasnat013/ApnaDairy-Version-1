import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { queryClient } from "./lib/queryClient";
import { useAuthStore } from "./stores/auth";
// Ploy-inspired typography (§4): bold condensed display + Inter body.
// Fontsource self-hosts the files, so `npm run build` works fully offline.
import "@fontsource/archivo-narrow/500.css";
import "@fontsource/archivo-narrow/600.css";
import "@fontsource/archivo-narrow/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./index.css";

// Restore any persisted session before first paint of routes, validating the
// token against GET /auth/me instead of trusting it blindly.
async function bootAuth(): Promise<void> {
  const { token, setUser, logout, setInitializing } = useAuthStore.getState();
  if (token) {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1"}/auth/me`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const me = await res.json();
        setUser({
          id: me.id ?? me.userId,
          fullName: me.fullName ?? me.full_name ?? "",
          email: me.email ?? "",
          role: me.role,
          isVerified: me.isVerified ?? me.is_verified ?? true,
        });
      } else {
        logout();
      }
    } catch {
      // Backend unreachable — keep the persisted session; the apiClient
      // clears it on the first 401 once the API is reachable again.
    }
  }
  setInitializing(false);
}

void bootAuth();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
