// ============================================================
// WEAISCHOOL TEC — Dashboard Page (v4 - WITH CHARTS!)
// Complete production-ready dashboard
// Real backend data + beautiful interactive charts
// ============================================================

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  GraduationCap,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Database,
  Server,
  UserCircle,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { godModeApi } from "@/lib/api";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatDate,
  formatIndianNumber,
  getPlanColor,
  getStatusColor,
} from "@/lib/utils";
import {
  StatusDistributionChart,
  PlanDistributionChart,
  PlatformComparisonChart,
} from "@/components/shared/DashboardCharts";

// ═══════════════════════════════════════════════════════════
// TYPES — Match backend response exactly
// ═══════════════════════════════════════════════════════════

interface RecentTenant {
  school_name: string;
  slug: string;
  plan: string;
  status: string;
  created_at: string;
}

interface DashboardResponse {
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  suspended_tenants: number;
  expired_tenants: number;
  total_students: number;
  total_staff: number;
  total_users: number;
  total_revenue: number;
  plan_breakdown?: Record<string, number>;
  recent_tenants: RecentTenant[];
  generated_at?: string;
}

interface TenantStatsItem {
  tenant_id: string;
  school_name: string;
  slug: string;
  plan: string;
  status: string;
  student_count: number;
  staff_count: number;
  user_count: number;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════

export default function DashboardPage() {
  // ─── Fetch dashboard data ───
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
    isFetching: dashboardFetching,
  } = useQuery({
    queryKey: ["god-mode-dashboard"],
    queryFn: () =>
      godModeApi.dashboard().then((r) => r.data as DashboardResponse),
  });

  // ─── Fetch per-tenant stats ───
  const { data: tenantStats, refetch: refetchStats } = useQuery({
    queryKey: ["god-mode-tenant-stats"],
    queryFn: () =>
      godModeApi.tenantStats().then((r) => {
        const data = r.data;
        if (Array.isArray(data)) return data as TenantStatsItem[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((data as any).items || []) as TenantStatsItem[];
      }),
  });

  const handleRefresh = () => {
    refetchDashboard();
    refetchStats();
  };

  const isLoading = dashboardLoading;
  const isFetching = dashboardFetching;

  // ═══════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Platform Dashboard
            {isFetching && (
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            WeAISchool TEC — Super Admin Overview
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={isFetching}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link href="/schools/new">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20">
              <Plus className="w-4 h-4 mr-2" />
              Add School
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Main Stats Cards ─── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse h-32"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Schools"
            value={formatIndianNumber(dashboard?.total_tenants ?? 0)}
            subtitle="Registered on platform"
            icon={Building2}
            color="blue"
          />
          <StatCard
            title="Active Schools"
            value={formatIndianNumber(dashboard?.active_tenants ?? 0)}
            subtitle="Currently active"
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            title="Total Students"
            value={formatIndianNumber(dashboard?.total_students ?? 0)}
            subtitle="Across all schools"
            icon={GraduationCap}
            color="purple"
          />
          <StatCard
            title="Total Staff"
            value={formatIndianNumber(dashboard?.total_staff ?? 0)}
            subtitle="Across all schools"
            icon={Users}
            color="orange"
          />
        </div>
      )}

      {/* ─── Secondary Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Trial Schools */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">
                Trial Schools
              </p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {dashboard?.trial_tenants ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Suspended */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">
                Suspended
              </p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {dashboard?.suspended_tenants ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">
                Total Users
              </p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {formatIndianNumber(dashboard?.total_users ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-800/50 rounded-xl p-5 hover:border-green-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-white mt-0.5">
                ₹{formatIndianNumber(dashboard?.total_revenue ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CHARTS SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution Pie Chart */}
        <StatusDistributionChart
          active={dashboard?.active_tenants ?? 0}
          trial={dashboard?.trial_tenants ?? 0}
          suspended={dashboard?.suspended_tenants ?? 0}
          expired={dashboard?.expired_tenants ?? 0}
        />

        {/* Platform Comparison Bar Chart */}
        <PlatformComparisonChart
          students={dashboard?.total_students ?? 0}
          staff={dashboard?.total_staff ?? 0}
          users={dashboard?.total_users ?? 0}
        />
      </div>

      {/* ─── Plan Distribution Bar Chart (full width) ─── */}
      {dashboard?.plan_breakdown &&
        Object.keys(dashboard.plan_breakdown).length > 0 && (
          <PlanDistributionChart planBreakdown={dashboard.plan_breakdown} />
        )}

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/schools" className="group">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-600 hover:bg-slate-900/80 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center transition-colors">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">Manage Schools</p>
                <p className="text-slate-500 text-xs">View & edit all</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/god-mode" className="group">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-purple-600 hover:bg-slate-900/80 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 flex items-center justify-center transition-colors">
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">God Mode</p>
                <p className="text-slate-500 text-xs">Platform internals</p>
              </div>
            </div>
          </div>
        </Link>

        <a
          href="http://127.0.0.1:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="group"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-green-600 hover:bg-slate-900/80 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 flex items-center justify-center transition-colors">
                <Server className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">API Docs</p>
                <p className="text-slate-500 text-xs">Swagger UI</p>
              </div>
            </div>
          </div>
        </a>
      </div>

      {/* ─── Per-School Statistics Table ─── */}
      {tenantStats && tenantStats.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-800">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-white font-semibold">School-wise Statistics</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-6 py-3 font-medium">School</th>
                  <th className="text-left px-6 py-3 font-medium">Plan</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-right px-6 py-3 font-medium">Students</th>
                  <th className="text-right px-6 py-3 font-medium">Staff</th>
                  <th className="text-right px-6 py-3 font-medium">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tenantStats.map((school) => (
                  <tr
                    key={school.tenant_id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/schools/${school.tenant_id}`}
                        className="block"
                      >
                        <p className="text-white font-medium text-sm hover:text-blue-400 transition-colors">
                          {school.school_name}
                        </p>
                        <p className="text-slate-500 text-xs">{school.slug}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getPlanColor(school.plan as never)}>
                        {school.plan}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={getStatusColor(school.status as never)}
                      >
                        {school.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300 text-sm">
                      {school.student_count}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300 text-sm">
                      {school.staff_count}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300 text-sm">
                      {school.user_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Recent Schools ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Recent Schools
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {dashboard?.recent_tenants?.length || 0} school
              {(dashboard?.recent_tenants?.length || 0) !== 1 ? "s" : ""} shown
            </p>
          </div>
          <Link href="/schools">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              View All →
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-slate-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : !dashboard?.recent_tenants ||
          dashboard.recent_tenants.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">No schools yet</p>
            <p className="text-slate-500 text-sm mt-1 mb-4">
              Get started by adding your first school
            </p>
            <Link href="/schools/new">
              <Button className="bg-blue-600 hover:bg-blue-500">
                <Plus className="w-4 h-4 mr-2" />
                Add First School
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {dashboard.recent_tenants.map((school, idx) => (
              <div
                key={`${school.slug}-${idx}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">
                      {school.school_name}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5 truncate">
                      {school.slug} • Added {formatDate(school.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge className={getPlanColor(school.plan as never)}>
                    {school.plan}
                  </Badge>
                  <Badge className={getStatusColor(school.status as never)}>
                    {school.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}