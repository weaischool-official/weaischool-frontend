// ============================================================
// WEAISCHOOL TEC — Auth State Management (HYDRATION SAFE)
// Prevents premature redirects & preserves sessions permanently
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
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
  checkAuth: () => boolean;
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

      setHasHydrated: (state) => set({ _hasHydrated: state, isLoading: false }),

      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        }),

      setTokens: (access, refresh) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", access);
          localStorage.setItem("token", access); // dual-key fallback
          localStorage.setItem("refresh_token", refresh);
        }
        set({
          accessToken: access,
          refreshToken: refresh,
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

      checkAuth: () => {
        if (typeof window === "undefined") return false;
        const token =
          localStorage.getItem("access_token") ||
          localStorage.getItem("token") ||
          localStorage.getItem("userToken");

        const hasValidToken = Boolean(
          token && token !== "undefined" && token !== "null" && token.length > 10
        );

        if (hasValidToken && !get().isAuthenticated) {
          set({ isAuthenticated: true, accessToken: token, isLoading: false });
        }
        return hasValidToken;
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
        if (state) {
          state.setHasHydrated(true);
          // Hard sync with direct localStorage check
          if (typeof window !== "undefined") {
            const token =
              localStorage.getItem("access_token") ||
              localStorage.getItem("token") ||
              localStorage.getItem("userToken");

            if (token && token !== "undefined" && token !== "null" && token.length > 10) {
              state.isAuthenticated = true;
              state.accessToken = token;
              state.isLoading = false;
            }
          }
        }
      },
    }
  )
);