"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Filter,
  Loader2,
  GraduationCap,
  Briefcase,
  Wrench,
  Phone,
  Mail,
  Download,
  ChevronRight,
  BookOpen,
  Star,
  Shield,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

// ═══════════════════════════════════════════════════════════════════════════
// ROLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_CATEGORIES = {
  teaching: {
    label: "Teaching Staff",
    icon: GraduationCap,
    color: "green",
    roles: [
      "Principal", "Vice Principal", "Head Teacher", "HOD",
      "Senior Teacher", "PGT", "TGT", "PRT", "Pre-Primary Teacher",
      "Sports Teacher", "Music Teacher", "Art Teacher", "Substitute Teacher", "Guest Faculty",
    ],
  },
  administrative: {
    label: "Administrative Staff",
    icon: Briefcase,
    color: "purple",
    roles: [
      "Administrator", "Academic Coordinator", "Exam Coordinator",
      "Office Manager", "Clerk", "Accountant", "Receptionist", "Librarian",
    ],
  },
  support: {
    label: "Support Staff",
    icon: Wrench,
    color: "orange",
    roles: [
      "Peon", "Security Guard", "Driver", "Bus Conductor",
      "Cleaner", "Cook", "Gardener", "Lab Assistant",
      "Computer Operator", "Nurse", "Helper",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

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
  const possibleKeys = [
    `tenant_id_${slug}`, `tenantId_${slug}`, `${slug}_tenant_id`,
    "tenant_id", "current_tenant_id", "tenantId",
  ];
  for (const key of possibleKeys) {
    const val = localStorage.getItem(key);
    if (val && val.length > 10) return val;
  }
  const allKeys = Object.keys(localStorage);
  for (const key of allKeys) {
    if (key.toLowerCase().includes("tenant")) {
      const val = localStorage.getItem(key);
      if (val && val.length > 10 && !val.startsWith("{")) return val;
    }
  }
  return "";
}

function extractArray(data: unknown): Array<Record<string, unknown>> {
  if (!data) return [];
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  const r = data as Record<string, unknown>;
  for (const key of ["items", "staff", "users", "results", "data"]) {
    const val = r[key];
    if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
  }
  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    for (const key of ["items", "staff", "users", "results"]) {
      const val = d[key];
      if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
    }
  }
  return [];
}

// Get category from role
function getCategoryFromRole(role: string, designation: string): string {
  const roleStr = (designation || role || "").toLowerCase();
  for (const [catKey, catData] of Object.entries(ROLE_CATEGORIES)) {
    if (catData.roles.some(r => roleStr.includes(r.toLowerCase()))) {
      return catKey;
    }
  }
  // Fallback based on backend role
  if (role === "teacher" || role === "principal") return "teaching";
  if (role === "admin") return "administrative";
  return "support";
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Staff {
  id: string;
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  gender?: string;
  status?: string;
  profile_photo_url?: string;
  extras?: Record<string, unknown>;
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function StaffListPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [tenantId, setTenantId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [classTeacherFilter, setClassTeacherFilter] = useState<string>("all");

  useEffect(() => {
    setTenantId(findTenantId(slug));
  }, [slug]);

  const { data: staffRaw, isLoading } = useQuery({
    queryKey: ["staff-list", tenantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/staff/?per_page=100`, {
        headers: getAuthHeaders(tenantId),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return await res.json();
    },
    enabled: !!tenantId,
  });

  const allStaff = useMemo(() => extractArray(staffRaw) as Staff[], [staffRaw]);

  // Filter
  const filteredStaff = useMemo(() => {
    return allStaff.filter((s) => {
      const extras = (s.extras as Record<string, unknown>) || {};
      const category = getCategoryFromRole(s.role || "", s.designation || "");

      // Category filter
      if (categoryFilter !== "all" && category !== categoryFilter) return false;

      // Subject filter (teachers only)
      if (subjectFilter !== "all") {
        const subjects = String(extras.subjects || "").toLowerCase();
        if (!subjects.includes(subjectFilter.toLowerCase())) return false;
      }

      // Class teacher filter
      if (classTeacherFilter === "yes" && !extras.is_class_teacher) return false;
      if (classTeacherFilter === "no" && extras.is_class_teacher) return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
        const empId = (s.employee_id || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        const phone = (s.phone || "").toLowerCase();
        const desig = (s.designation || "").toLowerCase();
        if (!name.includes(q) && !empId.includes(q) && !email.includes(q) && !phone.includes(q) && !desig.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allStaff, search, categoryFilter, subjectFilter, classTeacherFilter]);

  // Stats
  const stats = useMemo(() => {
    const teaching = allStaff.filter(s => getCategoryFromRole(s.role || "", s.designation || "") === "teaching").length;
    const admin = allStaff.filter(s => getCategoryFromRole(s.role || "", s.designation || "") === "administrative").length;
    const support = allStaff.filter(s => getCategoryFromRole(s.role || "", s.designation || "") === "support").length;
    const classTeachers = allStaff.filter(s => {
      const extras = (s.extras as Record<string, unknown>) || {};
      return extras.is_class_teacher === true;
    }).length;
    return { total: allStaff.length, teaching, admin, support, classTeachers };
  }, [allStaff]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="w-6 h-6 text-blue-400" />
            Staff Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage teachers, administrators, and support staff
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Link href={`/school/${slug}/staff/new`}>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Add Staff Member
            </Button>
          </Link>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total Staff" value={stats.total} icon={Users} color="blue" />
        <StatCard label="Teaching" value={stats.teaching} icon={GraduationCap} color="green" />
        <StatCard label="Administrative" value={stats.admin} icon={Briefcase} color="purple" />
        <StatCard label="Support" value={stats.support} icon={Wrench} color="orange" />
        <StatCard label="Class Teachers" value={stats.classTeachers} icon={Star} color="yellow" />
      </div>

      {/* CATEGORY TABS */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          <CategoryTab
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
            icon={Users}
            label="All Staff"
            count={stats.total}
          />
          <CategoryTab
            active={categoryFilter === "teaching"}
            onClick={() => setCategoryFilter("teaching")}
            icon={GraduationCap}
            label="Teaching"
            count={stats.teaching}
          />
          <CategoryTab
            active={categoryFilter === "administrative"}
            onClick={() => setCategoryFilter("administrative")}
            icon={Briefcase}
            label="Administrative"
            count={stats.admin}
          />
          <CategoryTab
            active={categoryFilter === "support"}
            onClick={() => setCategoryFilter("support")}
            icon={Wrench}
            label="Support"
            count={stats.support}
          />
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, employee ID, designation, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Only show these filters when Teaching category is selected */}
          {categoryFilter === "teaching" && (
            <>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-[160px]">
                  <BookOpen className="w-4 h-4 mr-1" />
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="social">Social Studies</SelectItem>
                  <SelectItem value="computer">Computer</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="biology">Biology</SelectItem>
                </SelectContent>
              </Select>

              <Select value={classTeacherFilter} onValueChange={setClassTeacherFilter}>
                <SelectTrigger className="w-[160px]">
                  <Star className="w-4 h-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  <SelectItem value="yes">Class Teachers</SelectItem>
                  <SelectItem value="no">Subject Teachers</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {(search || categoryFilter !== "all" || subjectFilter !== "all" || classTeacherFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
                setSubjectFilter("all");
                setClassTeacherFilter("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredStaff.length}</span> of {allStaff.length} staff members
        </div>
      </div>

      {/* LIST */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading staff...</span>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <UserCog className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {allStaff.length === 0 ? "No Staff Yet" : "No Results Found"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {allStaff.length === 0
              ? "Start by adding your teachers, admin staff, or support staff"
              : "Try adjusting your search or filters"}
          </p>
          {allStaff.length === 0 && (
            <Link href={`/school/${slug}/staff/new`}>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Add First Staff Member
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
            <StaffCard
              key={staff.id}
              staff={staff}
              onClick={() => router.push(`/school/${slug}/staff/${staff.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function CategoryTab({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
        ${active ? "border-blue-500 text-blue-400" : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-600"}`}
    >
      <Icon className="w-4 h-4" />
      {label}
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${active ? "bg-blue-500/20" : "bg-muted"}`}>
        {count}
      </span>
    </button>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    green: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
    orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400",
    yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6 opacity-70" />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs font-medium opacity-90">{label}</p>
    </div>
  );
}

function StaffCard({
  staff,
  onClick,
}: {
  staff: Staff;
  onClick: () => void;
}) {
  const fullName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Unknown";
  const initials = fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  const extras = (staff.extras as Record<string, unknown>) || {};
  const category = getCategoryFromRole(staff.role || "", staff.designation || "");
  const isClassTeacher = extras.is_class_teacher === true;
  const subjects = String(extras.subjects || "");
  const assignedClass = String(extras.assigned_class || "");

  const categoryData = ROLE_CATEGORIES[category as keyof typeof ROLE_CATEGORIES] || ROLE_CATEGORIES.support;
  const CategoryIcon = categoryData.icon;

  const badgeColors: Record<string, string> = {
    teaching: "bg-green-500/10 text-green-400 border-green-500/20",
    administrative: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    support: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-blue-500/50 hover:shadow-lg transition-all group relative"
    >
      {/* Class Teacher Star */}
      {isClassTeacher && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2 py-0.5">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-400">Class Teacher</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {staff.profile_photo_url ? (
          <img
            src={staff.profile_photo_url}
            alt={fullName}
            className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/30"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-base truncate group-hover:text-blue-400 transition-colors">
            {fullName}
          </h4>
          {staff.employee_id && (
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: {String(staff.employee_id)}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${badgeColors[category]}`}>
              <CategoryIcon className="w-3 h-3" />
              {staff.designation || categoryData.label}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 pt-3 border-t border-border">
        {/* Show subjects for teachers */}
        {category === "teaching" && subjects && (
          <div className="flex items-start gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-xs">
              <span className="text-muted-foreground">Teaches:</span>{" "}
              <span className="text-foreground font-medium">{subjects}</span>
            </span>
          </div>
        )}

        {/* Show assigned class for class teachers */}
        {category === "teaching" && assignedClass && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs">
              <span className="text-muted-foreground">Class:</span>{" "}
              <span className="text-yellow-400 font-medium">{assignedClass}</span>
            </span>
          </div>
        )}

        {/* Show department */}
        {staff.department && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs truncate">{String(staff.department)}</span>
          </div>
        )}

        {/* Contact */}
        {staff.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <a href={`tel:${staff.phone}`} onClick={(e) => e.stopPropagation()} className="text-blue-400 hover:underline text-xs">
              {String(staff.phone)}
            </a>
          </div>
        )}
        {staff.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <a href={`mailto:${staff.email}`} onClick={(e) => e.stopPropagation()} className="text-blue-400 hover:underline text-xs truncate">
              {String(staff.email)}
            </a>
          </div>
        )}
      </div>

      {/* View arrow */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Click to view details</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
      </div>
    </div>
  );
}