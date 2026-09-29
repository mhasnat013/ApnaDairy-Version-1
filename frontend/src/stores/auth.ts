import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "../lib/constants";

/** Authenticated user shape — mirrors POST /auth/me from the API plan (§10). */
export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  isVerified: boolean;
  /** Account status — riders start "pending" until an admin approves them. */
  status?: string | null;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  /** True while the session is being restored/validated on boot. */
  isInitializing: boolean;
  login: (token: string, refreshToken: string, user: AuthUser) => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null, refreshToken?: string | null) => void;
  setInitializing: (value: boolean) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

/**
 * Auth store. API wiring (login/register/refresh calls) lands in Phase 2;
 * this shape already matches the backend contract so feature agents can build on it.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isInitializing: true,
      login: (token, refreshToken, user) => set({ token, refreshToken, user }),
      setUser: (user) => set({ user }),
      setToken: (token, refreshToken = null) =>
        set((s) => ({ token, refreshToken: refreshToken ?? s.refreshToken })),
      setInitializing: (value) => set({ isInitializing: value }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
      isAuthenticated: () => get().token !== null && get().user !== null,
    }),
    {
      name: "apnadairy-auth",
      partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken, user: s.user }),
    },
  ),
);
