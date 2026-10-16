"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft, User, Briefcase, GraduationCap, FileText, Users,
  Loader2, Edit, Save, X, Trash2, Phone, Mail, Calendar,
  Wrench, BookOpen, Star, MapPin, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

const SUBJECT_SUGGESTIONS = [
  "English", "Hindi", "Mathematics", "Science", "Physics", "Chemistry",
  "Biology", "Social Science", "History", "Geography", "Political Science",
  "Economics", "Computer", "Computer Science", "EVS", "General Knowledge",
  "Physical Education", "Art", "Music", "Sanskrit", "Accountancy", "Business Studies",
];

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

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;
  const staffId = params.id as string;

  const [tenantId, setTenantId] = useState("");
  const [activeTab, setActiveTab] = useState("basic");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [subjectInput, setSubjectInput] = useState("");

  useEffect(() => setTenantId(findTenantId(slug)), [slug]);

  const { data: staffData, isLoading, refetch } = useQuery({
    queryKey: ["staff-detail", staffId, tenantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/staff/${staffId}`, { headers: getAuthHeaders(tenantId) });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return await res.json();
    },
    enabled: !!tenantId && !!staffId,
  });

  const staff = useMemo(() => {
    if (!staffData) return null;
    const d = staffData as Record<string, unknown>;
    return (d?.data || d) as Record<string, unknown>;
  }, [staffData]);

  const extras = (staff?.extras as Record<string, unknown>) || {};
  const category = String(editForm.category || extras.category || staff?.category || "administrative");
  const isTeaching = category === "teaching" || String(editForm.role || staff?.role || "").toLowerCase() === "teacher";
  const isSupport = category === "support";

  // Start editing — flatten staff + extras into form
  const startEditing = () => {
    if (!staff) return;
    const ex = (staff.extras as Record<string, unknown>) || {};
    setEditForm({
      first_name: staff.first_name || "",
      last_name: staff.last_name || "",
      phone: staff.phone || "",
      email: staff.email || "",
      date_of_birth: staff.date_of_birth || "",
      gender: staff.gender || "",
      blood_group: staff.blood_group || "",
      aadhaar_number: staff.aadhaar_number || "",
      religion: staff.religion || "",
      category: ex.category || staff.category || "teaching",
      designation: staff.designation || staff.role || "",
      department: staff.department || "",
      employee_id: staff.employee_id || "",
      address: staff.address || "",
      city: staff.city || "",
      state: staff.state || "",
      pincode: staff.pincode || "",
      // extras flattened
      qualification: ex.qualification || "",
      specialization: ex.specialization || "",
      experience_years: ex.experience_years || "",
      previous_school: ex.previous_school || "",
      join_date: ex.join_date || "",
      employment_type: ex.employment_type || "",
      salary: ex.salary || "",
      pan_number: ex.pan_number || "",
      subjects: ex.subjects || "",
      classes_taught: ex.classes_taught || "",
      is_class_teacher: ex.is_class_teacher || false,
      assigned_class: ex.assigned_class || "",
      shift: ex.shift || "",
      duty_area: ex.duty_area || "",
      reports_to: ex.reports_to || "",
    });
    setIsEditing(true);
  };

  const setField = (key: string, value: unknown) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  // Subjects as array helpers
  const subjectsList: string[] = useMemo(() => {
    const raw = String(editForm.subjects || "");
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }, [editForm.subjects]);

  const addSubject = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    if (subjectsList.some((s) => s.toLowerCase() === lower)) {
      toast.error("Subject already added");
      return;
    }
    const next = [...subjectsList, clean].join(", ");
    setField("subjects", next);
    setSubjectInput("");
  };

  const removeSubject = (name: string) => {
    const next = subjectsList.filter((s) => s !== name).join(", ");
    setField("subjects", next);
  };

  const updateMutation = useMutation({
    mutationFn: async (form: Record<string, unknown>) => {
      // Build clean payload — top-level fields + extras object
      const payload: Record<string, unknown> = {
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        phone: form.phone || null,
        email: form.email || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        blood_group: form.blood_group || null,
        aadhaar_number: form.aadhaar_number || null,
        religion: form.religion || null,
        designation: form.designation || null,
        department: form.department || null,
        employee_id: form.employee_id || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        extras: {
          category: form.category || "teaching",
          qualification: form.qualification || null,
          specialization: form.specialization || null,
          experience_years: form.experience_years ? Number(form.experience_years) : null,
          previous_school: form.previous_school || null,
          join_date: form.join_date || null,
          employment_type: form.employment_type || null,
          salary: form.salary ? Number(form.salary) : null,
          pan_number: form.pan_number || null,
          subjects: form.subjects || "",
          classes_taught: form.classes_taught || "",
          is_class_teacher: Boolean(form.is_class_teacher),
          assigned_class: form.assigned_class || null,
          shift: form.shift || null,
          duty_area: form.duty_area || null,
          reports_to: form.reports_to || null,
        },
      };

      const res = await fetch(`${API_BASE}/staff/${staffId}`, {
        method: "PUT",
        headers: getAuthHeaders(tenantId),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = (data as any)?.detail;
        const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg || d).join(", ") : "Update failed";
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: async () => {
      toast.success("Staff updated successfully! ✅");
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["staff-detail", staffId] });
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
      refetch();
    },
    onError: (err: Error) => toast.error(err.message || "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/staff/${staffId}`, {
        method: "DELETE",
        headers: getAuthHeaders(tenantId),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any)?.detail || "Delete failed");
      }
      return true;
    },
    onSuccess: () => {
      toast.success("Staff removed");
      router.push(`/school/${slug}/staff`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Staff member not found</p>
        <Link href={`/school/${slug}/staff`} className="text-blue-400 text-sm mt-2 inline-block hover:underline">
          ← Back to Staff
        </Link>
      </div>
    );
  }

  const fullName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Staff";
  const initials = fullName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "ST";
  const designation = String(staff.designation || staff.role || "Staff");
  const viewExtras = (staff.extras as Record<string, unknown>) || {};
  const viewCategory = String(viewExtras.category || staff.category || "administrative");
  const viewIsTeaching = viewCategory === "teaching" || String(staff.role || "").toLowerCase() === "teacher";
  const viewIsSupport = viewCategory === "support";

  const categoryColors: Record<string, string> = {
    teaching: "from-green-500/20 to-green-600/10 border-green-500/30",
    administrative: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    support: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  };

  const tabs = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "professional", label: "Professional", icon: GraduationCap },
    { id: "employment", label: "Employment", icon: Briefcase },
    { id: "teaching", label: "Teaching", icon: BookOpen },
    ...(viewIsSupport || isSupport ? [{ id: "duty", label: "Duty", icon: Wrench }] : []),
    { id: "address", label: "Address", icon: MapPin },
  ];

  // Filtered subject suggestions
  const filteredSuggestions = SUBJECT_SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(subjectInput.toLowerCase()) &&
      !subjectsList.some((x) => x.toLowerCase() === s.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href={`/school/${slug}/staff`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-blue-400 font-medium">{designation}</span>
              {staff.employee_id ? (
                <span className="text-sm text-muted-foreground">• ID: {String(staff.employee_id)}</span>
              ) : null}
              {viewExtras.is_class_teacher ? (
                <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400" />
                  Class Teacher
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setSubjectInput("");
                }}
                disabled={updateMutation.isPending}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate(editForm)}
                disabled={updateMutation.isPending}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm("Remove this staff member?")) deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
                className="gap-2 text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remove
              </Button>
              <Button onClick={startEditing} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PROFILE CARD */}
      <div
        className={`bg-gradient-to-br ${categoryColors[viewCategory] || categoryColors.administrative} border rounded-xl p-6 flex items-center gap-6 flex-wrap`}
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shrink-0">
          {initials}
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.phone ? <InfoItem icon={Phone} label="Phone" value={String(staff.phone)} /> : null}
          {staff.email ? <InfoItem icon={Mail} label="Email" value={String(staff.email)} /> : null}
          {staff.department ? (
            <InfoItem icon={Briefcase} label="Department" value={String(staff.department)} />
          ) : null}
          {viewExtras.experience_years ? (
            <InfoItem icon={Calendar} label="Experience" value={`${viewExtras.experience_years} years`} />
          ) : null}
          {viewExtras.employment_type ? (
            <InfoItem icon={FileText} label="Type" value={String(viewExtras.employment_type)} />
          ) : null}
          {viewExtras.subjects ? (
            <InfoItem icon={BookOpen} label="Subjects" value={String(viewExtras.subjects)} />
          ) : null}
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                  ${activeTab === tab.id ? "border-blue-500 text-blue-400" : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-600"}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      <div className="bg-card border border-border rounded-xl p-6">
        {/* ===== BASIC INFO ===== */}
        {activeTab === "basic" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <EditField label="First Name" value={isEditing ? String(editForm.first_name || "") : String(staff.first_name || "-")} editing={isEditing} onChange={(v) => setField("first_name", v)} />
            <EditField label="Last Name" value={isEditing ? String(editForm.last_name || "") : String(staff.last_name || "-")} editing={isEditing} onChange={(v) => setField("last_name", v)} />
            <EditField label="Date of Birth" value={isEditing ? String(editForm.date_of_birth || "") : String(staff.date_of_birth || "-")} editing={isEditing} onChange={(v) => setField("date_of_birth", v)} type="date" />
            <EditField label="Gender" value={isEditing ? String(editForm.gender || "") : String(staff.gender || "-")} editing={isEditing} onChange={(v) => setField("gender", v)} options={["Male", "Female", "Other"]} />
            <EditField label="Mobile" value={isEditing ? String(editForm.phone || "") : String(staff.phone || "-")} editing={isEditing} onChange={(v) => setField("phone", v)} />
            <EditField label="Email" value={isEditing ? String(editForm.email || "") : String(staff.email || "-")} editing={isEditing} onChange={(v) => setField("email", v)} type="email" />
            <EditField label="Blood Group" value={isEditing ? String(editForm.blood_group || "") : String(staff.blood_group || "-")} editing={isEditing} onChange={(v) => setField("blood_group", v)} options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]} />
            <EditField label="Aadhaar" value={isEditing ? String(editForm.aadhaar_number || "") : String(staff.aadhaar_number || "-")} editing={isEditing} onChange={(v) => setField("aadhaar_number", v)} />
            <EditField label="Category" value={isEditing ? String(editForm.category || "") : String(viewCategory || "-")} editing={isEditing} onChange={(v) => setField("category", v)} options={["teaching", "administrative", "support"]} />
            <EditField label="Religion" value={isEditing ? String(editForm.religion || "") : String(staff.religion || "-")} editing={isEditing} onChange={(v) => setField("religion", v)} />
          </div>
        )}

        {/* ===== PROFESSIONAL ===== */}
        {activeTab === "professional" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <EditField label="Designation" value={isEditing ? String(editForm.designation || "") : designation} editing={isEditing} onChange={(v) => setField("designation", v)} />
            <EditField label="Qualification" value={isEditing ? String(editForm.qualification || "") : String(viewExtras.qualification || "-")} editing={isEditing} onChange={(v) => setField("qualification", v)} />
            <EditField label="Specialization" value={isEditing ? String(editForm.specialization || "") : String(viewExtras.specialization || "-")} editing={isEditing} onChange={(v) => setField("specialization", v)} />
            <EditField label="Experience (years)" value={isEditing ? String(editForm.experience_years || "") : String(viewExtras.experience_years || "-")} editing={isEditing} onChange={(v) => setField("experience_years", v)} type="number" />
            <EditField label="Previous School/Employer" value={isEditing ? String(editForm.previous_school || "") : String(viewExtras.previous_school || "-")} editing={isEditing} onChange={(v) => setField("previous_school", v)} />
          </div>
        )}

        {/* ===== EMPLOYMENT ===== */}
        {activeTab === "employment" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <EditField label="Employee ID" value={isEditing ? String(editForm.employee_id || "") : String(staff.employee_id || "-")} editing={isEditing} onChange={(v) => setField("employee_id", v)} />
            <EditField label="Joining Date" value={isEditing ? String(editForm.join_date || "") : String(viewExtras.join_date || "-")} editing={isEditing} onChange={(v) => setField("join_date", v)} type="date" />
            <EditField label="Employment Type" value={isEditing ? String(editForm.employment_type || "") : String(viewExtras.employment_type || "-")} editing={isEditing} onChange={(v) => setField("employment_type", v)} options={["Permanent", "Contract", "Part-time", "Guest"]} />
            <EditField label="Department" value={isEditing ? String(editForm.department || "") : String(staff.department || "-")} editing={isEditing} onChange={(v) => setField("department", v)} />
            <EditField label="Salary" value={isEditing ? String(editForm.salary || "") : viewExtras.salary ? `₹${viewExtras.salary}` : "-"} editing={isEditing} onChange={(v) => setField("salary", v)} type="number" />
            <EditField label="PAN Number" value={isEditing ? String(editForm.pan_number || "") : String(viewExtras.pan_number || "-")} editing={isEditing} onChange={(v) => setField("pan_number", v)} />
          </div>
        )}

        {/* ===== TEACHING (always visible tab now) ===== */}
        {activeTab === "teaching" && (
          <div className="space-y-5">
            {/* Subjects — Smart Multi-Tag */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-green-400" />
                Subjects Taught
              </p>

              {isEditing ? (
                <div className="space-y-3">
                  {/* Current chips */}
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {subjectsList.length === 0 && (
                      <p className="text-xs text-muted-foreground">No subjects added yet. Type below to add.</p>
                    )}
                    {subjectsList.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1.5 text-sm bg-green-500/20 border border-green-500/40 text-green-300 pl-3 pr-1.5 py-1 rounded-full"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => removeSubject(s)}
                          className="w-5 h-5 rounded-full hover:bg-red-500/30 flex items-center justify-center text-green-300 hover:text-red-300 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add input */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <Input
                        value={subjectInput}
                        onChange={(e) => setSubjectInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSubject(subjectInput);
                          }
                        }}
                        placeholder="Type subject name & press Enter..."
                        className="bg-background"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addSubject(subjectInput)}
                        disabled={!subjectInput.trim()}
                        className="gap-1 bg-green-600 hover:bg-green-700 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>

                    {/* Suggestions */}
                    {subjectInput.trim() && filteredSuggestions.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                        {filteredSuggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => addSubject(s)}
                            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    These subjects will appear in Timetable → Assign Teachers dropdown filter.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {String(viewExtras.subjects || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((s, i) => (
                      <span
                        key={i}
                        className="text-sm bg-green-500/20 border border-green-500/40 text-green-300 px-3 py-1 rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  {!viewExtras.subjects && (
                    <p className="text-sm text-muted-foreground">No subjects assigned. Click Edit to add.</p>
                  )}
                </div>
              )}
            </div>

            {/* Classes Taught */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Classes Taught
              </p>
              {isEditing ? (
                <EditField
                  label=""
                  value={String(editForm.classes_taught || "")}
                  editing={true}
                  onChange={(v) => setField("classes_taught", v)}
                  placeholder="e.g. Class 9, Class 10"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {String(viewExtras.classes_taught || "")
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean)
                    .map((c, i) => (
                      <span
                        key={i}
                        className="text-sm bg-blue-500/20 border border-blue-500/40 text-blue-300 px-3 py-1 rounded-full"
                      >
                        {c}
                      </span>
                    ))}
                  {!viewExtras.classes_taught && (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              )}
            </div>

            {/* Class Teacher */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                Class Teacher
              </p>
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_class_teacher"
                      checked={Boolean(editForm.is_class_teacher)}
                      onChange={(e) => setField("is_class_teacher", e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600"
                    />
                    <Label htmlFor="is_class_teacher">Is Class Teacher?</Label>
                  </div>
                  {Boolean(editForm.is_class_teacher) && (
                    <EditField
                      label="Assigned Class"
                      value={String(editForm.assigned_class || "")}
                      editing={true}
                      onChange={(v) => setField("assigned_class", v)}
                      placeholder="e.g. Class 10-A"
                    />
                  )}
                </div>
              ) : viewExtras.is_class_teacher ? (
                <p className="text-lg font-bold text-yellow-300">
                  {String(viewExtras.assigned_class || "Yes")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Not a class teacher</p>
              )}
            </div>
          </div>
        )}

        {/* ===== DUTY (support) ===== */}
        {activeTab === "duty" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <EditField label="Shift" value={isEditing ? String(editForm.shift || "") : String(viewExtras.shift || "-")} editing={isEditing} onChange={(v) => setField("shift", v)} options={["Morning", "Afternoon", "Full Day", "Night"]} />
            <EditField label="Duty Area" value={isEditing ? String(editForm.duty_area || "") : String(viewExtras.duty_area || "-")} editing={isEditing} onChange={(v) => setField("duty_area", v)} />
            <div className="sm:col-span-2">
              <EditField label="Reports To" value={isEditing ? String(editForm.reports_to || "") : String(viewExtras.reports_to || "-")} editing={isEditing} onChange={(v) => setField("reports_to", v)} />
            </div>
          </div>
        )}

        {/* ===== ADDRESS ===== */}
        {activeTab === "address" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <div className="sm:col-span-2">
              <EditField label="Full Address" value={isEditing ? String(editForm.address || "") : String(staff.address || "-")} editing={isEditing} onChange={(v) => setField("address", v)} />
            </div>
            <EditField label="City" value={isEditing ? String(editForm.city || "") : String(staff.city || "-")} editing={isEditing} onChange={(v) => setField("city", v)} />
            <EditField label="State" value={isEditing ? String(editForm.state || "") : String(staff.state || "-")} editing={isEditing} onChange={(v) => setField("state", v)} />
            <EditField label="Pincode" value={isEditing ? String(editForm.pincode || "") : String(staff.pincode || "-")} editing={isEditing} onChange={(v) => setField("pincode", v)} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== SMALL COMPONENTS ========== */

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  editing,
  onChange,
  type = "text",
  options,
  placeholder,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  type?: string;
  options?: string[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
      ) : null}
      {editing ? (
        options ? (
          <select
            value={value === "-" ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select --</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type={type}
            value={value === "-" ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            className="bg-background"
          />
        )
      ) : (
        <p className="text-base text-foreground min-h-[28px]">{value || "—"}</p>
      )}
    </div>
  );
}