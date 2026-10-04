// ============================================================
// WEAISCHOOL TEC — Dashboard Layout
// Sidebar + Header wrap karta hai dashboard pages ko
// Auth check bhi yahan hota hai
// ============================================================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  // Auth check — login nahi to login page pe bhejo
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    // Super admin nahi to access deny karo
    if (user.role !== "SUPER_ADMIN") {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  // Loading state
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}