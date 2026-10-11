// ============================================================
// WEAISCHOOL TEC — Web Auth Store (HYDRATION SAFE)
// Fixes auto-logout on refresh / tab reopen / idle
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UserProfile } from "@/types";

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;

  setUser: (user: UserProfile) => void;
  setTokens: (access: string, refresh?: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
  checkAuth: () => boolean;
}

function readTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("userToken");
  if (!t || t === "undefined" || t === "null" || t.length < 10) return null;
  return t;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      _hasHydrated: false,

      setHasHydrated: (state) =>
        set({ _hasHydrated: state, isLoading: false }),

      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        }),

      setTokens: (access, refresh = "") => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", access);
          localStorage.setItem("token", access);
          if (refresh) {
            localStorage.setItem("refresh_token", refresh);
          }
        }
        set({
          accessToken: access,
          refreshToken: refresh || get().refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("token");
          localStorage.removeItem("userToken");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          localStorage.removeItem("user_info");
          localStorage.removeItem("user_profile");
          localStorage.removeItem("weaischool-admin-auth");
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      // Sync memory state with physical localStorage token
      checkAuth: () => {
        const token = readTokenFromStorage();
        const ok = Boolean(token);
        if (ok && !get().isAuthenticated) {
          set({
            isAuthenticated: true,
            accessToken: token,
            isLoading: false,
          });
        }
        if (!ok && get().isAuthenticated) {
          set({
            isAuthenticated: false,
            accessToken: null,
            isLoading: false,
          });
        }
        return ok;
      },
    }),
    {
      name: "weaischool-admin-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setHasHydrated(true);

        // Hard sync after rehydrate — prevent false logout
        if (typeof window !== "undefined") {
          const token = readTokenFromStorage();
          if (token) {
            state.isAuthenticated = true;
            state.accessToken = token;
            state.isLoading = false;
          }
        }
      },
    }
  )
);