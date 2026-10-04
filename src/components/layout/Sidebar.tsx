// ============================================================
// WEAISCHOOL TEC — Sidebar Navigation
// Left side navigation bar
// ============================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  School,
  LayoutDashboard,
  Building2,
  Database,
  Settings,
  Shield,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── NAV ITEMS ──────────────────────────────────────────────
const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Schools",
    href: "/schools",
    icon: Building2,
  },
  {
    label: "God Mode",
    href: "/god-mode",
    icon: Shield,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

// ─── SIDEBAR COMPONENT ──────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <School className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">
            WeAISchool
          </p>
          <p className="text-slate-500 text-xs mt-0.5">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-white" : "text-slate-500 group-hover:text-white"
                )}
              />
              <span>{item.label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Platform Badge */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
          <Database className="w-4 h-4 text-green-400" />
          <div>
            <p className="text-white text-xs font-medium">Backend Status</p>
            <p className="text-green-400 text-xs">Online ✓</p>
          </div>
        </div>
      </div>
    </aside>
  );
}