"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  Check,
  X,
  Clock,
  UserCheck,
  Loader2,
  Save,
  BarChart3,
  Search,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Settings,
  GraduationCap,
  Briefcase,
  Camera,
  Fingerprint,
  CreditCard,
  QrCode,
  Hand,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

type AttendanceStatus = "present" | "absent" | "late" | "leave" | "unmarked";
type RoleType = "students" | "teachers" | "staff";

const METHOD_ICONS: Record<string, React.ElementType> = {
  manual: Hand,
  rfid: CreditCard,
  biometric: Fingerprint,
  face: Camera,
  qr: QrCode,
};

// Helpers
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
  for (const key of ["items", "classes", "sections", "students", "staff", "results", "data"]) {
    const val = r[key];
    if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
  }
  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    for (const key of ["items", "classes", "sections", "students", "staff"]) {
      const val = d[key];
      if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
    }
  }
  return [];
}

export default function AttendancePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [tenantId, setTenantId] = useState("");
  const [config, setConfig] = useState<any>(null);
  const [activeRole, setActiveRole] = useState<RoleType>("students");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setTenantId(findTenantId(slug));
    const saved = localStorage.getItem(`attendance_config_${slug}`);
    if (saved) {
      try {
        const cfg = JSON.parse(saved);
        setConfig(cfg);
        // Auto-select first enabled role
        if (cfg.trackStudents) setActiveRole("students");
        else if (cfg.trackTeachers) setActiveRole("teachers");
        else if (cfg.trackStaff) setActiveRole("staff");
      } catch {}
    }
  }, [slug]);

  // Fetch classes (only for students)
  const { data: classesData } = useQuery({
    queryKey: ["classes", tenantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes/`, { headers: getAuthHeaders(tenantId) });
      if (!res.ok) return { items: [] };
      return await res.json();
    },
    enabled: !!tenantId && activeRole === "students",
  });

  const classes = useMemo(() => extractArray(classesData), [classesData]);

  // Fetch sections
  const { data: sectionsData } = useQuery({
    queryKey: ["sections", tenantId, selectedClassId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes/${selectedClassId}/sections`, {
        headers: getAuthHeaders(tenantId),
      });
      if (!res.ok) return { sections: [] };
      return await res.json();
    },
    enabled: !!tenantId && !!selectedClassId,
  });

  const sections = useMemo(() => extractArray(sectionsData), [sectionsData]);

  // Fetch people based on active role
  const { data: peopleData, isLoading: peopleLoading } = useQuery({
    queryKey: ["attendance-people", tenantId, activeRole, selectedSectionId],
    queryFn: async () => {
      let url = "";
      if (activeRole === "students") {
        if (!selectedSectionId) return { items: [] };
        url = `${API_BASE}/students/?per_page=200&current_section_id=${selectedSectionId}`;
      } else {
        // Teachers or Staff
        url = `${API_BASE}/staff/?per_page=200`;
      }
      const res = await fetch(url, { headers: getAuthHeaders(tenantId) });
      if (!res.ok) return { items: [] };
      return await res.json();
    },
    enabled: !!tenantId && (activeRole === "students" ? !!selectedSectionId : true),
  });

  const allPeople = useMemo(() => {
    const arr = extractArray(peopleData);
    if (activeRole === "teachers") {
      return arr.filter((p: any) => {
        const category = p?.extras?.category;
        return category === "teaching" || p.role === "teacher" || p.role === "principal";
      });
    } else if (activeRole === "staff") {
      return arr.filter((p: any) => {
        const category = p?.extras?.category;
        return category === "support" || category === "administrative";
      });
    }
    return arr;
  }, [peopleData, activeRole]);

  // Filter by search
  const filteredPeople = useMemo(() => {
    if (!search.trim()) return allPeople;
    const q = search.toLowerCase();
    return allPeople.filter((s: any) => {
      const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
      const id = (s.employee_id || s.admission_number || "").toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [allPeople, search]);

  // Stats
  const stats = useMemo(() => {
    const total = allPeople.length;
    let present = 0, absent = 0, late = 0, leave = 0;
    allPeople.forEach((s: any) => {
      const status = attendance[s.id];
      if (status === "present") present++;
      else if (status === "absent") absent++;
      else if (status === "late") late++;
      else if (status === "leave") leave++;
    });
    const marked = present + absent + late + leave;
    return { total, present, absent, late, leave, marked, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
  }, [allPeople, attendance]);

  const markAttendance = useCallback((id: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [id]: status }));
    setHasChanges(true);
  }, []);

  const markAllPresent = () => {
    const newAtt: Record<string, AttendanceStatus> = {};
    allPeople.forEach((p: any) => { newAtt[p.id] = "present"; });
    setAttendance(newAtt);
    setHasChanges(true);
    toast.success(`Marked all ${allPeople.length} as Present`);
  };

  const saveAttendance = () => {
    const key = `attendance_${tenantId}_${activeRole}_${selectedSectionId || 'all'}_${selectedDate}`;
    localStorage.setItem(key, JSON.stringify(attendance));
    toast.success("Attendance saved! 🎉");
    setHasChanges(false);
  };

  // Load saved attendance
  useEffect(() => {
    if (!tenantId || !selectedDate) return;
    const key = `attendance_${tenantId}_${activeRole}_${selectedSectionId || 'all'}_${selectedDate}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setAttendance(JSON.parse(saved));
        setHasChanges(false);
      } catch {
        setAttendance({});
      }
    } else {
      setAttendance({});
    }
  }, [tenantId, activeRole, selectedSectionId, selectedDate]);

  // ─── If not configured, show setup prompt ───
  if (!config || !config.isConfigured) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-400" />
            Attendance Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure your attendance system first
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-xl p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to Attendance!</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Let&apos;s set up your attendance system. Choose who to track (Students, Teachers, Staff),
            which methods to use (Manual, Biometric, Face, RFID, etc.), and configure devices.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto mb-8 text-sm">
            <div className="bg-card border border-border rounded-lg p-3">
              <GraduationCap className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="font-medium">Students</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="font-medium">Teachers</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <Briefcase className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="font-medium">Staff</p>
            </div>
          </div>

          <Link href={`/school/${slug}/attendance/setup`}>
            <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Sparkles className="w-5 h-5" />
              Start Setup Wizard
            </Button>
          </Link>

          <p className="text-xs text-muted-foreground mt-4">Takes just 3 minutes</p>
        </div>
      </div>
    );
  }

  // ─── Configured: Show attendance interface ───
  const enabledRoles: RoleType[] = [];
  if (config.trackStudents) enabledRoles.push("students");
  if (config.trackTeachers) enabledRoles.push("teachers");
  if (config.trackStaff) enabledRoles.push("staff");

  const currentMethods = activeRole === "students" ? config.studentMethods
    : activeRole === "teachers" ? config.teacherMethods
    : config.staffMethods;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-400" />
            Attendance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Mark daily attendance for {enabledRoles.join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/school/${slug}/attendance/reports`}>
            <Button variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Reports
            </Button>
          </Link>
          <Link href={`/school/${slug}/attendance/settings`}>
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* ROLE TABS */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {enabledRoles.map((role) => {
            const isActive = activeRole === role;
            const icons: Record<RoleType, React.ElementType> = {
              students: GraduationCap,
              teachers: Users,
              staff: Briefcase,
            };
            const Icon = icons[role];
            const labels: Record<RoleType, string> = {
              students: "Students",
              teachers: "Teachers",
              staff: "Staff",
            };
            return (
              <button
                key={role}
                onClick={() => {
                  setActiveRole(role);
                  setSelectedClassId("");
                  setSelectedSectionId("");
                  setAttendance({});
                }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all
                  ${isActive ? "border-blue-500 text-blue-400" : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-600"}`}
              >
                <Icon className="w-4 h-4" />
                {labels[role]}
              </button>
            );
          })}
        </div>
      </div>

      {/* METHOD INDICATORS */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">Enabled methods:</span>
        {currentMethods.map((method: string) => {
          const Icon = METHOD_ICONS[method] || Hand;
          return (
            <span
              key={method}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs text-blue-300"
            >
              <Icon className="w-3 h-3" />
              {method.charAt(0).toUpperCase() + method.slice(1)}
            </span>
          );
        })}
      </div>

      {/* SELECTORS */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeRole === "students" && (
            <>
              <div className="space-y-1.5">
                <Label>Class</Label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId("");
                  }}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Section</Label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  disabled={!selectedClassId}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                >
                  <option value="">
                    {!selectedClassId ? "Select class first" : "-- Select Section --"}
                  </option>
                  {sections.map((s: any) => (
                    <option key={s.id} value={s.id}>Section {s.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className={`space-y-1.5 ${activeRole !== "students" ? "md:col-span-3" : ""}`}>
            <Label>Date</Label>
            <Input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* If students but no section selected */}
      {activeRole === "students" && !selectedSectionId ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select Class & Section</h3>
          <p className="text-sm text-muted-foreground">Choose a class and section above to load students</p>
        </div>
      ) : peopleLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : allPeople.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No {activeRole === "students" ? "Students" : activeRole === "teachers" ? "Teachers" : "Staff"} Found
          </h3>
        </div>
      ) : (
        <>
          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatBox label="Total" value={stats.total} color="blue" />
            <StatBox label="Present" value={stats.present} color="green" />
            <StatBox label="Absent" value={stats.absent} color="red" />
            <StatBox label="Late" value={stats.late} color="yellow" />
            <StatBox label="Leave" value={stats.leave} color="blue" />
          </div>

          {/* ACTIONS */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={markAllPresent} variant="outline" className="gap-2 text-green-400 border-green-500/30 hover:bg-green-500/10">
              <Sparkles className="w-4 h-4" />
              Mark All Present
            </Button>
            <Button onClick={saveAttendance} disabled={!hasChanges} className="gap-2 bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4" />
              Save
            </Button>
          </div>

          {/* PEOPLE LIST */}
          <div className="space-y-2">
            {filteredPeople.map((person: any) => (
              <PersonRow
                key={person.id}
                person={person}
                status={attendance[person.id] || "unmarked"}
                onMark={(s) => markAttendance(person.id, s)}
                role={activeRole}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    green: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
    red: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-400",
    yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
    </div>
  );
}

function PersonRow({
  person,
  status,
  onMark,
  role,
}: {
  person: any;
  status: AttendanceStatus;
  onMark: (s: AttendanceStatus) => void;
  role: RoleType;
}) {
  const fullName = `${person.first_name || ""} ${person.last_name || ""}`.trim();
  const initials = fullName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  const idField = role === "students" ? person.admission_number : person.employee_id;

  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-4">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{fullName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {idField || "No ID"}
          {person.designation && ` · ${person.designation}`}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {[
          { s: "present" as const, icon: Check, color: "green" },
          { s: "absent" as const, icon: X, color: "red" },
          { s: "late" as const, icon: Clock, color: "yellow" },
          { s: "leave" as const, icon: UserCheck, color: "blue" },
        ].map(({ s, icon: Icon, color }) => {
          const activeColors: Record<string, string> = {
            green: "bg-green-500 border-green-400 text-white",
            red: "bg-red-500 border-red-400 text-white",
            yellow: "bg-yellow-500 border-yellow-400 text-white",
            blue: "bg-blue-500 border-blue-400 text-white",
          };
          const hoverColors: Record<string, string> = {
            green: "hover:bg-green-500/10 hover:border-green-500/40 hover:text-green-400",
            red: "hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400",
            yellow: "hover:bg-yellow-500/10 hover:border-yellow-500/40 hover:text-yellow-400",
            blue: "hover:bg-blue-500/10 hover:border-blue-500/40 hover:text-blue-400",
          };
          return (
            <button
              key={s}
              onClick={() => onMark(s)}
              className={`w-10 h-10 rounded-lg border transition-all flex items-center justify-center
                ${status === s ? activeColors[color] + " shadow-lg scale-105" : "border-border text-muted-foreground " + hoverColors[color]}`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}