"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { tenantApi } from "@/lib/api";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  IndianRupee,
  CalendarCheck,
  FileText,
  Clock,
  Bell,
  Bus,
  Settings,
  Menu,
  X,
  School,
  ChevronRight,
  LogOut,
  Landmark,
} from "lucide-react";

const navItems = [
  { href: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "main" },
  { href: "students", label: "Students", icon: GraduationCap, section: "main" },
  { href: "staff", label: "Staff", icon: Users, section: "main" },
  { href: "classes", label: "Classes", icon: BookOpen, section: "main" },
  { href: "udise", label: "UDISE+", icon: Landmark, section: "compliance", badge: "NEW" },
  { href: "fees", label: "Fees", icon: IndianRupee, section: "operations" },
  { href: "attendance", label: "Attendance", icon: CalendarCheck, section: "operations" },
  { href: "exams", label: "Exams & Results", icon: FileText, section: "operations" },
  { href: "timetable", label: "Timetable", icon: Clock, section: "operations" },
  { href: "notices", label: "Notices", icon: Bell, section: "operations" },
  { href: "transport", label: "Transport", icon: Bus, section: "operations" },
  { href: "settings", label: "Settings", icon: Settings, section: "settings" },
];

const sectionLabels: Record<string, string> = {
  main: "MAIN",
  compliance: "GOVERNMENT",
  operations: "OPERATIONS",
  settings: "SYSTEM",
};

export default function SchoolPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenantLoaded, setTenantLoaded] = useState(false);
  const [tenantError, setTenantError] = useState("");

  const basePath = `/school/${slug}`;

  useEffect(() => {
    if (!slug) return;

    const cachedId = localStorage.getItem(`tenant_id_${slug}`);
    if (cachedId) {
      setTenantLoaded(true);
      return;
    }

    tenantApi
      .list(1, 100, slug)
      .then((res) => {
        const tenants = res.data?.items || [];
        const found = tenants.find((t: { slug: string }) => t.slug === slug);
        if (found?.id) {
          localStorage.setItem(`tenant_id_${slug}`, found.id);
          setTenantLoaded(true);
        } else {
          setTenantError("School not found!");
          setTenantLoaded(true);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch tenant:", err);
        setTenantError("Failed to load school data");
        setTenantLoaded(true);
      });
  }, [slug]);

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-200 flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-800 flex-shrink-0">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <School className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate capitalize">
              {slug.replace(/-/g, " ")}
            </p>
            <p className="text-xs text-gray-500">School Admin</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section}>
              <p className="text-xs font-bold text-gray-600 uppercase px-3 mb-2 tracking-wider">
                {sectionLabels[section]}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const fullPath = `${basePath}/${item.href}`;
                  const isActive =
                    pathname === fullPath || pathname?.startsWith(fullPath + "/");
                  const Icon = item.icon;
                  const isUdise = item.href === "udise";

                  return (
                    <Link
                      key={item.href}
                      href={fullPath}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? isUdise
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                            : "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : isUdise
                          ? "text-purple-300 hover:text-white hover:bg-purple-500/10"
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-purple-500/20 text-purple-300"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && !item.badge && (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 flex-shrink-0">
          <Link
            href="/schools"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Back to Super Admin</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-6 gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-sm text-gray-400">School Admin Panel</p>
          </div>
        </header>

        <div className="flex-1 p-6">
          {tenantError ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-xl mx-auto mt-10">
              <p className="text-red-400 font-semibold mb-2">
                ⚠️ {tenantError}
              </p>
              <Link
                href="/schools"
                className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl"
              >
                Back to Schools
              </Link>
            </div>
          ) : tenantLoaded ? (
            children
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-400 animate-pulse">
                Loading school data...
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}