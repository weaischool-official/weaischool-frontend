// ============================================================
// WEAISCHOOL TEC — Dashboard Charts
// Beautiful interactive charts for platform overview
// ============================================================

"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";

// ─── COLOR PALETTE ──────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  TRIAL: "#eab308",       // yellow
  STARTER: "#3b82f6",     // blue
  GROWTH: "#a855f7",      // purple
  ENTERPRISE: "#22c55e",  // green
};

// ═══════════════════════════════════════════════════════════
// 1. STATUS DISTRIBUTION — Pie Chart
// ═══════════════════════════════════════════════════════════

interface StatusPieProps {
  active: number;
  trial: number;
  suspended: number;
  expired: number;
}

export function StatusDistributionChart({
  active,
  trial,
  suspended,
  expired,
}: StatusPieProps) {
  const data = [
    { name: "Active", value: active, color: "#22c55e" },
    { name: "Trial", value: trial, color: "#eab308" },
    { name: "Suspended", value: suspended, color: "#ef4444" },
    { name: "Expired", value: expired, color: "#64748b" },
  ].filter((d) => d.value > 0);

  const total = active + trial + suspended + expired;

  if (total === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
          <PieIcon className="w-5 h-5 text-purple-400" />
          School Status Distribution
        </h3>
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
          No schools yet to display
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
        <PieIcon className="w-5 h-5 text-purple-400" />
        School Status Distribution
      </h3>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
            label={(entry) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const e = entry as any;
              return `${e.name}: ${((e.value / total) * 100).toFixed(0)}%`;
            }}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#fff",
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{
              paddingTop: "10px",
              color: "#94a3b8",
              fontSize: "12px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 2. PLAN DISTRIBUTION — Bar Chart
// ═══════════════════════════════════════════════════════════

interface PlanBarProps {
  planBreakdown: Record<string, number>;
}

export function PlanDistributionChart({ planBreakdown }: PlanBarProps) {
  const data = Object.entries(planBreakdown).map(([plan, count]) => ({
    plan: plan.toUpperCase(),
    schools: count,
    color: PLAN_COLORS[plan.toUpperCase()] || "#64748b",
  }));

  if (data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Plan Distribution
        </h3>
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
          No plans data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-blue-400" />
        Plan Distribution
      </h3>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            vertical={false}
          />
          <XAxis
            dataKey="plan"
            stroke="#64748b"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: "12px" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#fff",
            }}
            cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
          />
          <Bar dataKey="schools" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 3. PLATFORM COMPARISON — Horizontal Bar Chart
// ═══════════════════════════════════════════════════════════

interface ComparisonProps {
  students: number;
  staff: number;
  users: number;
}

export function PlatformComparisonChart({
  students,
  staff,
  users,
}: ComparisonProps) {
  const data = [
    { category: "Students", count: students, color: "#a855f7" },
    { category: "Staff", count: staff, color: "#f97316" },
    { category: "Users", count: users, color: "#06b6d4" },
  ];

  const hasData = students > 0 || staff > 0 || users > 0;

  if (!hasData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Platform Overview
        </h3>
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
          Add students and staff to see comparison
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-green-400" />
        Platform Overview
      </h3>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            horizontal={false}
          />
          <XAxis
            type="number"
            stroke="#64748b"
            style={{ fontSize: "12px" }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            stroke="#64748b"
            style={{ fontSize: "12px" }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#fff",
            }}
            cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
          />
          <Bar dataKey="count" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}