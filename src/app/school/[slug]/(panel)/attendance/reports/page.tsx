"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Loader2,
  Download,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const keys = [`tenant_id_${slug}`, "tenant_id", "current_tenant_id", "tenantId"];
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

function extractArray(data: unknown): Array<Record<string, unknown>> {
  if (!data) return [];
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  const r = data as Record<string, unknown>;
  for (const key of ["items", "classes", "sections", "results", "data"]) {
    const val = r[key];
    if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
  }
  return [];
}

interface ClassStat {
  className: string;
  sectionName: string;
  totalDays: number;
  presentCount: number;
  absentCount: number;
  totalStudents: number;
  attendancePercent: number;
}

export default function AttendanceReportsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [tenantId, setTenantId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    setTenantId(findTenantId(slug));
  }, [slug]);

  // Fetch classes
  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ["classes-report", tenantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes/`, {
        headers: getAuthHeaders(tenantId),
      });
      if (!res.ok) return { items: [] };
      return await res.json();
    },
    enabled: !!tenantId,
  });

  const classes = useMemo(() => extractArray(classesData), [classesData]);

  // Calculate stats from localStorage (temporary until backend endpoint ready)
  const classStats = useMemo(() => {
    if (!tenantId || typeof window === "undefined") return [];

    const stats: ClassStat[] = [];
    const allKeys = Object.keys(localStorage);
    const attendanceKeys = allKeys.filter(k => k.startsWith(`attendance_${tenantId}_`));

    // Group by section
    const sectionData: Record<string, { dates: string[], marks: Record<string, string>[] }> = {};

    attendanceKeys.forEach(key => {
      // Format: attendance_TENANT_SECTION_DATE
      const parts = key.replace(`attendance_${tenantId}_`, "").split("_");
      if (parts.length < 2) return;
      const date = parts.pop() || "";
      const sectionId = parts.join("_");

      // Filter by date range
      if (date < dateFrom || date > dateTo) return;

      const data = localStorage.getItem(key);
      if (!data) return;

      try {
        const marks = JSON.parse(data);
        if (!sectionData[sectionId]) {
          sectionData[sectionId] = { dates: [], marks: [] };
        }
        sectionData[sectionId].dates.push(date);
        sectionData[sectionId].marks.push(marks);
      } catch {
        // skip
      }
    });

    // Calculate stats per section
    Object.entries(sectionData).forEach(([sectionId, data]) => {
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalMarks = 0;
      const studentIds = new Set<string>();

      data.marks.forEach(dayMarks => {
        Object.entries(dayMarks).forEach(([studentId, status]) => {
          studentIds.add(studentId);
          totalMarks++;
          if (status === "present") totalPresent++;
          else if (status === "absent") totalAbsent++;
        });
      });

      const totalStudents = studentIds.size;
      const attendancePercent = totalMarks > 0 ? Math.round((totalPresent / totalMarks) * 100) : 0;

      stats.push({
        className: "Section",
        sectionName: sectionId.substring(0, 8) + "...",
        totalDays: data.dates.length,
        presentCount: totalPresent,
        absentCount: totalAbsent,
        totalStudents,
        attendancePercent,
      });
    });

    return stats;
  }, [tenantId, dateFrom, dateTo, classes]);

  // Overall stats
  const overallStats = useMemo(() => {
    const totalPresent = classStats.reduce((sum, c) => sum + c.presentCount, 0);
    const totalAbsent = classStats.reduce((sum, c) => sum + c.absentCount, 0);
    const totalMarks = totalPresent + totalAbsent;
    const avgPercent = totalMarks > 0 ? Math.round((totalPresent / totalMarks) * 100) : 0;
    const totalStudents = classStats.reduce((sum, c) => sum + c.totalStudents, 0);
    const totalDays = Math.max(...classStats.map(c => c.totalDays), 0);
    return { totalPresent, totalAbsent, avgPercent, totalStudents, totalDays };
  }, [classStats]);

  const exportCsv = () => {
    const csv = [
      "Section,Total Students,Days Marked,Present,Absent,Attendance %",
      ...classStats.map(s =>
        `${s.sectionName},${s.totalStudents},${s.totalDays},${s.presentCount},${s.absentCount},${s.attendancePercent}%`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/school/${slug}/attendance`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              Attendance Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Class-wise attendance summary and analytics
            </p>
          </div>
        </div>
        <Button onClick={exportCsv} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* DATE FILTERS */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Date Range</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* OVERALL STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={overallStats.totalStudents}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Days Tracked"
          value={overallStats.totalDays}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          label="Average Attendance"
          value={`${overallStats.avgPercent}%`}
          icon={overallStats.avgPercent >= 75 ? TrendingUp : TrendingDown}
          color={overallStats.avgPercent >= 75 ? "green" : overallStats.avgPercent >= 50 ? "yellow" : "red"}
        />
        <StatCard
          label="Total Presence"
          value={overallStats.totalPresent}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* CLASS-WISE TABLE */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Section-wise Attendance
          </h3>
        </div>

        {classesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : classStats.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Attendance Data Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start marking daily attendance to see reports here
            </p>
            <Link href={`/school/${slug}/attendance`}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Go to Attendance
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 text-sm">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Section</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Students</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Days</th>
                  <th className="text-center px-4 py-3 font-medium text-green-400">Present</th>
                  <th className="text-center px-4 py-3 font-medium text-red-400">Absent</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {classStats.map((stat, idx) => (
                  <tr key={idx} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3 font-medium">{stat.sectionName}</td>
                    <td className="text-center px-4 py-3">{stat.totalStudents}</td>
                    <td className="text-center px-4 py-3">{stat.totalDays}</td>
                    <td className="text-center px-4 py-3 text-green-400">{stat.presentCount}</td>
                    <td className="text-center px-4 py-3 text-red-400">{stat.absentCount}</td>
                    <td className="text-center px-4 py-3">
                      <div className="inline-flex items-center gap-2">
                        <span className={`font-bold ${
                          stat.attendancePercent >= 75 ? "text-green-400" :
                          stat.attendancePercent >= 50 ? "text-yellow-400" :
                          "text-red-400"
                        }`}>
                          {stat.attendancePercent}%
                        </span>
                        <div className="w-16 bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              stat.attendancePercent >= 75 ? "bg-green-500" :
                              stat.attendancePercent >= 50 ? "bg-yellow-500" :
                              "bg-red-500"
                            }`}
                            style={{ width: `${stat.attendancePercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NOTE */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
        <p className="text-blue-300">
          💡 <strong>Note:</strong> Currently attendance is stored in your browser locally.
          Backend integration will sync data across devices. Reports show data from the selected date range.
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
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    green: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
    yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400",
    red: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-400",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6 opacity-70" />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs font-medium opacity-90">{label}</p>
    </div>
  );
}