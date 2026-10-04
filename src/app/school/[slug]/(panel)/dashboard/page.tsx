"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserCog,
  GraduationCap,
  Calendar,
  IndianRupee,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Loader2,
  School,
  ClipboardList,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

function getAuthHeaders(tenantId: string): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return {
    "Content-Type": "application/json",
    "X-Tenant-ID": tenantId,
    "Authorization": `Bearer ${token}`,
  };
}

function findTenantId(slug: string): string {
  if (typeof window === "undefined") return "";
  const keys = [
    `tenant_id_${slug}`,
    `tenantId_${slug}`,
    `${slug}_tenant_id`,
    "tenant_id",
    "current_tenant_id",
    "tenantId",
  ];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v.length > 10) return v;
  }
  for (const k of Object.keys(localStorage)) {
    if (k.toLowerCase().includes("tenant")) {
      const v = localStorage.getItem(k);
      if (v && v.length > 10 && !v.startsWith("{")) return v;
    }
  }
  return "";
}

function extractCount(data: unknown): number {
  if (!data) return 0;
  const r = data as Record<string, unknown>;
  if (typeof r.total === "number") return r.total;
  if (typeof r.count === "number") return r.count;
  if (Array.isArray(r.items)) return r.items.length;
  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    if (typeof d.total === "number") return d.total;
    if (Array.isArray(d.items)) return d.items.length;
  }
  if (Array.isArray(data)) return data.length;
  return 0;
}

export default function SchoolDashboardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    setTenantId(findTenantId(slug));
  }, [slug]);

  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ["dash-students", tenantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/students/?per_page=1`, {
        headers: getAuthHeaders(tenantId),
      });
      if (!res.ok) return { total: 0 };
      return await res.json();
    },
    enabled: !!tenantId,
  });

  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ["dash-staff", tenantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/staff/?per_page=1`, {
        headers: getAuthHeaders(tenantId),
      });
      if (!res.ok) return { total: 0 };
      return await res.json();
    },
    enabled: !!tenantId,
  });

  const { data: classesData, isLoading: loadingClasses } = useQuery({
    queryKey: ["dash-classes", tenantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes/`, {
        headers: getAuthHeaders(tenantId),
      });
      if (!res.ok) return { items: [] };
      return await res.json();
    },
    enabled: !!tenantId,
  });

  const stats = useMemo(() => {
    return {
      students: extractCount(studentsData),
      staff: extractCount(staffData),
      classes: extractCount(classesData),
    };
  }, [studentsData, staffData, classesData]);

  const isLoading = loadingStudents || loadingStaff || loadingClasses;

  const quickLinks = [
    {
      title: "Students",
      description: "Manage student records",
      href: `/school/${slug}/students`,
      icon: Users,
      color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    },
    {
      title: "Staff",
      description: "Teachers & support staff",
      href: `/school/${slug}/staff`,
      icon: UserCog,
      color: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
    },
    {
      title: "Classes",
      description: "Classes & sections",
      href: `/school/${slug}/classes`,
      icon: GraduationCap,
      color: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
    },
    {
      title: "Attendance",
      description: "Mark daily attendance",
      href: `/school/${slug}/attendance`,
      icon: Calendar,
      color: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400",
    },
    {
      title: "Fees",
      description: "Fee collection",
      href: `/school/${slug}/fees`,
      icon: IndianRupee,
      color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400",
    },
    {
      title: "UDISE+",
      description: "Government compliance",
      href: `/school/${slug}/udise`,
      icon: ClipboardList,
      color: "from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <School className="w-6 h-6 text-blue-400" />
            School Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome to {slug.toUpperCase()} School Admin Panel
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Students"
            value={stats.students}
            icon={Users}
            color="blue"
            href={`/school/${slug}/students`}
          />
          <StatCard
            label="Total Staff"
            value={stats.staff}
            icon={UserCog}
            color="purple"
            href={`/school/${slug}/staff`}
          />
          <StatCard
            label="Total Classes"
            value={stats.classes}
            icon={GraduationCap}
            color="green"
            href={`/school/${slug}/classes`}
          />
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={`bg-gradient-to-br ${link.color} border rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer group`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-card/50">
                      <Icon className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="font-semibold text-base mt-3 text-foreground">{link.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{link.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Setup Progress */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          Setup Progress
        </h2>
        <div className="space-y-3">
          <ProgressItem label="Classes Created" done={stats.classes > 0} />
          <ProgressItem label="Students Added" done={stats.students > 0} />
          <ProgressItem label="Staff Added" done={stats.staff > 0} />
          <ProgressItem label="Attendance Started" done={false} />
          <ProgressItem label="Fees Configured" done={false} />
        </div>
      </div>

      {/* Tip */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
        <p className="text-blue-300">
          💡 <strong>Tip:</strong> Start by creating Classes → Add Students → Add Staff → Mark Attendance.
          Use the sidebar to navigate between modules.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  href: string;
}) {
  const colors: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
    green: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
  };
  return (
    <Link href={href}>
      <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer`}>
        <div className="flex items-center justify-between mb-2">
          <Icon className="w-7 h-7 opacity-70" />
          <span className="text-3xl font-bold">{value}</span>
        </div>
        <p className="text-sm font-medium opacity-90">{label}</p>
      </div>
    </Link>
  );
}

function ProgressItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${done ? "bg-green-500 text-white" : "bg-gray-600 text-gray-400"}`}>
        {done ? "✓" : "○"}
      </div>
      <span className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
      {done && <span className="text-xs text-green-400 ml-auto">Done</span>}
    </div>
  );
}