"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import {
  Landmark,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Loader2,
  Search,
  TrendingUp,
  FileText,
  Filter,
  X,
} from "lucide-react";
import ClassSectionSelector from "@/components/school/students/ClassSectionSelector";
import UdiseStudentGrid from "@/components/school/udise/UdiseStudentGrid";
import {
  getUdiseCompliance,
  downloadBlob,
  type StudentData,
} from "@/lib/studentHelpers";
import { UDISE_CATEGORIES } from "@/lib/udiseConfig";

type ComplianceFilter = "all" | "complete" | "good" | "partial" | "pending";

interface StudentBrief {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string | null;
  full_name: string;
  photo_url: string | null;
  [key: string]: unknown;
}

export default function UdiseDashboardPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSectionName, setSelectedSectionName] = useState("");
  const [search, setSearch] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("all");

  const {
    data: studentsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["udise-students", selectedClassId, selectedSectionId, search],
    queryFn: () =>
      studentApi
        .list({
          per_page: 200,
          class_id: selectedClassId || undefined,
          section_id: selectedSectionId || undefined,
          search: search || undefined,
          status: "active",
        })
        .then((r) => r.data),
    enabled: !!selectedClassId,
  });

  const allStudents: StudentBrief[] = studentsData?.items || [];

  const filteredStudents = allStudents.filter((s) => {
    if (complianceFilter === "all") return true;
    const compliance = getUdiseCompliance(s as StudentData);
    return compliance.status === complianceFilter;
  });

  const stats = useMemo(() => {
    let complete = 0;
    let good = 0;
    let partial = 0;
    let pending = 0;

    const categoryTotals: Record<string, { total: number; filled: number }> = {};
    UDISE_CATEGORIES.filter((c) => c.id !== "documents").forEach((cat) => {
      categoryTotals[cat.id] = { total: 0, filled: 0 };
    });

    allStudents.forEach((s) => {
      const compliance = getUdiseCompliance(s as StudentData);
      if (compliance.status === "complete") complete++;
      else if (compliance.status === "good") good++;
      else if (compliance.status === "partial") partial++;
      else pending++;

      compliance.categoryResults.forEach((cat) => {
        if (categoryTotals[cat.categoryId]) {
          categoryTotals[cat.categoryId].total += cat.totalFields;
          categoryTotals[cat.categoryId].filled += cat.filledFields;
        }
      });
    });

    const categoryStats = UDISE_CATEGORIES.filter((c) => c.id !== "documents").map(
      (cat) => {
        const totals = categoryTotals[cat.id] || { total: 1, filled: 0 };
        const percentage =
          totals.total > 0 ? Math.round((totals.filled / totals.total) * 100) : 0;
        return {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          percentage,
        };
      }
    );

    return {
      total: allStudents.length,
      complete,
      good,
      partial,
      pending,
      categoryStats,
      overallCompliance:
        allStudents.length > 0
          ? Math.round(
              ((complete + good * 0.7 + partial * 0.4) / allStudents.length) * 100
            )
          : 0,
    };
  }, [allStudents]);

  async function handleExport() {
    try {
      toast.loading("Preparing UDISE report...", { id: "udise-export" });
      const response = await studentApi.exportCsv({
        section_id: selectedSectionId || undefined,
        status: "active",
      });
      const filename = `UDISE_Report_${selectedClassName || "All"}_${
        selectedSectionName || "All"
      }_${new Date().toISOString().split("T")[0]}.csv`;
      downloadBlob(response.data, filename);
      toast.success("UDISE report exported!", { id: "udise-export" });
    } catch {
      toast.error("Export failed", { id: "udise-export" });
    }
  }

  function handleClassChange(id: string, name: string) {
    setSelectedClassId(id);
    setSelectedClassName(name);
    setSelectedSectionId("");
    setSelectedSectionName("");
    setSearch("");
  }

  function handleSectionChange(id: string, name: string) {
    setSelectedSectionId(id);
    setSelectedSectionName(name);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Landmark className="w-7 h-7 text-purple-400" />
            </div>
            UDISE+ Compliance Manager
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Government-standard student data management & reporting
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => refetch()}
            disabled={!selectedClassId}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 rounded-xl text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={!selectedClassId || allStudents.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export UDISE Report
          </button>
        </div>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Landmark className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-purple-300">What is UDISE+?</p>
            <p className="text-xs text-purple-200/70 mt-1">
              UDISE+ (Unified District Information System for Education Plus) is
              India&apos;s official student database. All schools must maintain
              student records as per UDISE+ standards.
            </p>
          </div>
        </div>
      </div>

      <ClassSectionSelector
        selectedClassId={selectedClassId}
        selectedSectionId={selectedSectionId}
        onClassChange={handleClassChange}
        onSectionChange={handleSectionChange}
        showStudentCount={true}
      />

      {!selectedClassId && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <Landmark className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Select a Class to View UDISE Compliance
          </h3>
          <p className="text-gray-400 mb-6">
            Choose a class and section to see student-wise UDISE compliance data.
          </p>
          <Link
            href={`/school/${slug}/students`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium"
          >
            <Users className="w-4 h-4" />
            Go to Students Module
          </Link>
        </div>
      )}

      {selectedClassId && (
        <>
          {isLoading ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-3" />
              <p className="text-gray-400">Loading UDISE data...</p>
            </div>
          ) : allStudents.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Students Found</h3>
              <p className="text-gray-400 mb-6">
                This class/section has no active students.
              </p>
              <Link
                href={`/school/${slug}/students`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium"
              >
                <Users className="w-4 h-4" />
                Manage Students
              </Link>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-purple-300 font-semibold uppercase mb-1">
                      Overall School Compliance
                    </p>
                    <h2 className="text-5xl font-bold text-white">
                      {stats.overallCompliance}%
                    </h2>
                    <p className="text-sm text-gray-400 mt-2">
                      Based on {stats.total} active students in {selectedClassName}
                      {selectedSectionName ? ` - Section ${selectedSectionName}` : ""}
                    </p>
                  </div>
                  <TrendingUp className="w-16 h-16 text-purple-400 opacity-50" />
                </div>
                <div className="w-full bg-purple-900/50 rounded-full h-3 mt-4">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                    style={{ width: `${stats.overallCompliance}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard icon={Users} label="Total Students" value={stats.total} color="blue" />
                <StatCard
                  icon={CheckCircle2}
                  label="UDISE Ready"
                  value={stats.complete}
                  color="green"
                  subtitle={`${Math.round((stats.complete / stats.total) * 100) || 0}%`}
                />
                <StatCard
                  icon={Clock}
                  label="Good"
                  value={stats.good}
                  color="blue-light"
                  subtitle={`${Math.round((stats.good / stats.total) * 100) || 0}%`}
                />
                <StatCard
                  icon={AlertCircle}
                  label="Partial"
                  value={stats.partial}
                  color="yellow"
                  subtitle={`${Math.round((stats.partial / stats.total) * 100) || 0}%`}
                />
                <StatCard
                  icon={XCircle}
                  label="Pending"
                  value={stats.pending}
                  color="red"
                  subtitle={`${Math.round((stats.pending / stats.total) * 100) || 0}%`}
                />
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  Category-wise Compliance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {stats.categoryStats.map((cat) => (
                    <div key={cat.id} className="bg-gray-800/50 rounded-xl p-4 text-center">
                      <p className="text-2xl mb-1">{cat.icon}</p>
                      <p className="text-xs text-gray-400 mb-2 font-medium">{cat.name}</p>
                      <p
                        className={`text-2xl font-bold ${
                          cat.percentage >= 90
                            ? "text-green-400"
                            : cat.percentage >= 70
                            ? "text-blue-400"
                            : cat.percentage >= 40
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {cat.percentage}%
                      </p>
                      <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
                        <div
                          className={`h-1.5 rounded-full ${
                            cat.percentage >= 90
                              ? "bg-green-500"
                              : cat.percentage >= 70
                              ? "bg-blue-500"
                              : cat.percentage >= 40
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search students..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    Compliance Filter:
                  </span>
                  {(
                    [
                      { key: "all", label: `All (${stats.total})` },
                      { key: "complete", label: `🟢 Complete (${stats.complete})` },
                      { key: "good", label: `🔵 Good (${stats.good})` },
                      { key: "partial", label: `🟡 Partial (${stats.partial})` },
                      { key: "pending", label: `🔴 Pending (${stats.pending})` },
                    ] as const
                  ).map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setComplianceFilter(filter.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        complianceFilter === filter.key
                          ? "bg-purple-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    No Students Match Filter
                  </h3>
                  <p className="text-gray-400">Try a different compliance filter.</p>
                </div>
              ) : (
                <UdiseStudentGrid students={filteredStudents} slug={slug} />
              )}

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Link
                    href={`/school/${slug}/students`}
                    className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl"
                  >
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Manage Students</p>
                      <p className="text-xs text-gray-400">Add/edit student data</p>
                    </div>
                  </Link>

                  <button
                    onClick={handleExport}
                    className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-left"
                  >
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Export UDISE CSV</p>
                      <p className="text-xs text-gray-400">Download compliance report</p>
                    </div>
                  </button>

                  <Link
                    href={`/school/${slug}/students/import`}
                    className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl"
                  >
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Bulk Import</p>
                      <p className="text-xs text-gray-400">Import students via CSV</p>
                    </div>
                  </Link>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: "blue" | "green" | "yellow" | "red" | "blue-light";
  subtitle?: string;
}) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    "blue-light": "bg-cyan-500/10 text-cyan-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
    red: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {subtitle && (
            <p className={`text-xs font-semibold ${colorMap[color].split(" ")[1]}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}