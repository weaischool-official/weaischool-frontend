"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  UserPlus,
  X,
  Plus,
  Key,
  Copy,
  Check,
} from "lucide-react";
import ClassSectionSelector from "@/components/school/students/ClassSectionSelector";
import ComplianceBadge from "@/components/school/students/ComplianceBadge";
import {
  getUdiseCompliance,
  formatDate,
  formatGender,
  formatStatus,
  getInitials,
  getAvatarColor,
  downloadBlob,
  type StudentData,
} from "@/lib/studentHelpers";

interface StudentBrief {
  id: string;
  admission_number: string;
  roll_number: string | null;
  first_name: string;
  last_name: string | null;
  full_name: string;
  date_of_birth: string;
  age: number | null;
  gender: string;
  current_section_id: string | null;
  status: string;
  photo_url: string | null;
  created_at: string;
  [key: string]: unknown;
}

type ComplianceFilter = "all" | "complete" | "good" | "partial" | "pending";

export default function StudentsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params?.slug as string;

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSectionName, setSelectedSectionName] = useState("");
  const [search, setSearch] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [page, setPage] = useState(1);
  const perPage = 50;

  // Credential Modal State
  const [credStudent, setCredStudent] = useState<StudentBrief | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    data: studentsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "students",
      selectedClassId,
      selectedSectionId,
      statusFilter,
      search,
      page,
    ],
    queryFn: () =>
      studentApi
        .list({
          page,
          per_page: perPage,
          class_id: selectedClassId || undefined,
          section_id: selectedSectionId || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
        })
        .then((r) => r.data),
    enabled: !!selectedClassId,
  });

  const students: StudentBrief[] = studentsData?.items || [];
  const totalStudents = studentsData?.total || 0;
  const totalPages = studentsData?.total_pages || 1;

  // Filter by UDISE compliance
  const filteredStudents = students.filter((s) => {
    if (complianceFilter === "all") return true;
    const compliance = getUdiseCompliance(s as StudentData);
    return compliance.status === complianceFilter;
  });

  // Stats
  const stats = {
    total: totalStudents,
    complete: students.filter((s) => {
      const c = getUdiseCompliance(s as StudentData);
      return c.status === "complete";
    }).length,
    partial: students.filter((s) => {
      const c = getUdiseCompliance(s as StudentData);
      return c.status === "partial" || c.status === "good";
    }).length,
    pending: students.filter((s) => {
      const c = getUdiseCompliance(s as StudentData);
      return c.status === "pending";
    }).length,
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student deleted successfully");
    },
    onError: () => toast.error("Failed to delete student"),
  });

  async function handleExport() {
    try {
      toast.loading("Preparing export...", { id: "export" });
      const response = await studentApi.exportCsv({
        section_id: selectedSectionId || undefined,
        status: statusFilter || undefined,
      });
      const filename = `students_${selectedClassName || "all"}_${
        selectedSectionName || "all"
      }_${new Date().toISOString().split("T")[0]}.csv`;
      downloadBlob(response.data, filename);
      toast.success("Exported successfully!", { id: "export" });
    } catch {
      toast.error("Export failed", { id: "export" });
    }
  }

  function handleClassChange(id: string, name: string) {
    setSelectedClassId(id);
    setSelectedClassName(name);
    setSelectedSectionId("");
    setSelectedSectionName("");
    setSearch("");
    setPage(1);
  }

  function handleSectionChange(id: string, name: string) {
    setSelectedSectionId(id);
    setSelectedSectionName(name);
    setPage(1);
  }

  function getStudentEmail(admNumber: string) {
    const clean = admNumber.replace(/\//g, ".").replace(/\s/g, "").toLowerCase();
    return `${clean}@school.com`;
  }

  function copyCredentials(student: StudentBrief) {
    const email = getStudentEmail(student.admission_number);
    const textToCopy = `Student Mobile App Login:\nEmail: ${email}\nPassword: School@123`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Login credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-400" />
            Students Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage students section-wise. Auto-generated mobile login active.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => refetch()}
            disabled={!selectedClassId}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 rounded-xl text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExport}
            disabled={!selectedClassId || students.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-green-400 rounded-xl text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <Link
            href={`/school/${slug}/students/import${
              selectedClassId
                ? `?class_id=${selectedClassId}&section_id=${selectedSectionId}`
                : ""
            }`}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </Link>

          <Link
            href={`/school/${slug}/students/new${
              selectedClassId
                ? `?class_id=${selectedClassId}&section_id=${selectedSectionId}`
                : ""
            }`}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </Link>
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
          <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Select a Class to View Students
          </h3>
          <p className="text-gray-400">
            Choose a class and section from above to see students.
          </p>
        </div>
      )}

      {selectedClassId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Users}
              label="Total Students"
              value={stats.total}
              color="blue"
            />
            <StatCard
              icon={CheckCircle2}
              label="UDISE Complete"
              value={stats.complete}
              color="green"
            />
            <StatCard
              icon={AlertCircle}
              label="Partial Data"
              value={stats.partial}
              color="yellow"
            />
            <StatCard
              icon={UserPlus}
              label="Pending"
              value={stats.pending}
              color="red"
            />
          </div>

          {/* Filters */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name or admission number..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="transferred">Transferred</option>
                <option value="graduated">Graduated</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-400">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              slug={slug}
              hasStudents={students.length > 0}
              complianceFilter={complianceFilter}
              selectedClassId={selectedClassId}
              selectedSectionId={selectedSectionId}
            />
          ) : (
            <>
              <StudentsTable
                students={filteredStudents}
                slug={slug}
                onShowCreds={(s) => setCredStudent(s)}
                onDelete={(id, name) => {
                  if (
                    confirm(
                      `Delete student "${name}"? This will remove all their data.`
                    )
                  ) {
                    deleteMutation.mutate(id);
                  }
                }}
                deletingId={deleteMutation.variables}
              />
            </>
          )}
        </>
      )}

      {/* CREDENTIAL MODAL */}
      {credStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold text-white text-lg">Student Login Key</h3>
              </div>
              <button
                onClick={() => setCredStudent(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Parent or student can use these auto-generated credentials to log in to the Mobile App.
            </p>

            <div className="bg-gray-800/60 rounded-xl p-4 space-y-3 font-mono text-sm">
              <div>
                <span className="text-xs text-gray-500 block uppercase">Student Name</span>
                <span className="text-white font-semibold">{credStudent.full_name}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block uppercase">Admission #</span>
                <span className="text-blue-400">{credStudent.admission_number}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block uppercase">Mobile App Email / Login</span>
                <span className="text-green-400 select-all">{getStudentEmail(credStudent.admission_number)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block uppercase">Default Password</span>
                <span className="text-yellow-400 font-bold select-all">School@123</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => copyCredentials(credStudent)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Login Info"}
              </button>
              <button
                onClick={() => setCredStudent(null)}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
    red: "bg-red-500/10 text-red-400",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function StudentsTable({
  students,
  slug,
  onShowCreds,
  onDelete,
  deletingId,
}: {
  students: StudentBrief[];
  slug: string;
  onShowCreds: (student: StudentBrief) => void;
  onDelete: (id: string, name: string) => void;
  deletingId: string | undefined;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                Student
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                Admission #
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                Roll
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                Age
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                Gender
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                UDISE
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                slug={slug}
                onShowCreds={onShowCreds}
                onDelete={onDelete}
                isDeleting={deletingId === student.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentRow({
  student,
  slug,
  onShowCreds,
  onDelete,
  isDeleting,
}: {
  student: StudentBrief;
  slug: string;
  onShowCreds: (student: StudentBrief) => void;
  onDelete: (id: string, name: string) => void;
  isDeleting: boolean;
}) {
  const compliance = getUdiseCompliance(student as StudentData);
  const status = formatStatus(student.status);

  return (
    <tr
      className={`border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${
        isDeleting ? "opacity-40" : ""
      }`}
    >
      <td className="px-4 py-3">
        <Link
          href={`/school/${slug}/students/${student.id}`}
          className="flex items-center gap-3 group"
        >
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={student.full_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColor(
                student.full_name
              )}`}
            >
              {getInitials(student.full_name)}
            </div>
          )}
          <div>
            <p className="font-semibold text-white text-sm group-hover:text-blue-400">
              {student.full_name}
            </p>
            <p className="text-xs text-gray-500">
              DOB: {formatDate(student.date_of_birth)}
            </p>
          </div>
        </Link>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm text-gray-300 font-mono">
          {student.admission_number}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm text-gray-300">
          {student.roll_number || <span className="text-gray-600">—</span>}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm text-gray-300">
          {student.age ? `${student.age} yrs` : "—"}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm text-gray-300">
          {formatGender(student.gender)}
        </span>
      </td>

      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}
        >
          {status.label}
        </span>
      </td>

      <td className="px-4 py-3">
        <ComplianceBadge percentage={compliance.percentage} size="sm" />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onShowCreds(student)}
            className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded-lg"
            title="View Mobile App Login Credentials"
          >
            <Key className="w-4 h-4" />
          </button>

          <Link
            href={`/school/${slug}/students/${student.id}`}
            className="p-2 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded-lg"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>

          <button
            onClick={() => onDelete(student.id, student.full_name)}
            disabled={isDeleting}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg disabled:opacity-40"
            title="Delete"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

function EmptyState({ slug, hasStudents, complianceFilter, selectedClassId, selectedSectionId }: any) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
      <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">No Students Found</h3>
      <p className="text-gray-400 mb-6">Add or import students to this class.</p>
    </div>
  );
}