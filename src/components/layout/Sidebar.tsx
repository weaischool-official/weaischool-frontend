// ============================================================
// WEAISCHOOL TEC — Super Admin Sidebar Navigation
// Includes Dashboard Links, Backend Status, and Clear Logout
// ============================================================

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  School,
  Terminal,
  Settings,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Schools",
    href: "/schools",
    icon: School,
  },
  {
    title: "God Mode",
    href: "/god-mode",
    icon: Terminal,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleSuperAdminLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore API errors
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        localStorage.removeItem("userToken");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        localStorage.removeItem("weaischool-admin-auth");
      }
      logout();
      toast.success("Super Admin Logged Out");
      router.replace("/login");
    }
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen flex-shrink-0">
      {/* Platform Branding */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight">
            WeAISchool
          </h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            Admin Panel
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section — Backend Status & Super Admin Logout */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <p className="text-xs font-semibold text-white">Backend Status</p>
            <p className="text-[10px] text-emerald-400">Online ✓</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSuperAdminLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout Super Admin</span>
        </button>
      </div>
    </aside>
  );
}