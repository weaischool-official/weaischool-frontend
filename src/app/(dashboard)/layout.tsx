// ============================================================
// WEAISCHOOL TEC — Super Admin Dashboard Layout (FULL RESTORED)
// Includes Sidebar + Header + Hydration-Safe 30-Day Session Guard
// ============================================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, _hasHydrated, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Direct physical inspection of localStorage to prevent hydration race conditions
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("userToken");

    const hasToken = Boolean(
      token && token !== "undefined" && token !== "null" && token.length > 10
    );

    if (!hasToken) {
      console.warn("[SuperAdmin Layout] No token found in storage -> redirecting to login");
      router.replace("/login");
    } else {
      checkAuth();
      setIsChecking(false);
    }
  }, [router, checkAuth, _hasHydrated]);

  // Loading spinner while rehydrating session from disk
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Super Admin Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <Header />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}