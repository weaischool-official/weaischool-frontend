// ============================================================
// WEAISCHOOL TEC — Auth State Management
// Zustand se global state manage karte hain
// Login, Logout, User info yahan store hota hai
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserProfile } from "@/types";

interface AuthState {
  // State
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: UserProfile) => void;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ── Initial State ──────────────────────────────────────
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // ── Actions ───────────────────────────────────────────

      // User set karo (login ke baad)
      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
        }),

      // Tokens set karo aur localStorage mein bhi save karo
      setTokens: (access, refresh) => {
        // localStorage mein bhi save (API interceptor ke liye)
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", access);
          localStorage.setItem("refresh_token", refresh);
        }
        set({
          accessToken: access,
          refreshToken: refresh,
          isAuthenticated: true,
        });
      },

      // Logout — sab clear karo
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      // Loading state
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "weaischool-admin-auth", // localStorage key
      partialize: (state) => ({
        // Sirf ye save karo localStorage mein
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);