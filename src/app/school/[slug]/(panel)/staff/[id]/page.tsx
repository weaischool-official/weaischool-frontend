"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft, User, Briefcase, GraduationCap, FileText, Users,
  Loader2, Edit, Save, X, Trash2, Phone, Mail, Calendar,
  Wrench, BookOpen, Star, MapPin, Plus, CheckCircle2, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

// 🧠 MASTER SUBJECT LIST (Same as Timetable Page)
const QUICK_SUBJECTS = [
  "English", "Hindi", "Mathematics", "Science", "Social Science", 
  "Computer", "Computer Science", "EVS", "General Knowledge", "Physical Education", 
  "Art", "Physics", "Chemistry", "Biology", "History", "Geography", 
  "Political Science", "Economics", "Music", "Sanskrit", "Accountancy", 
  "Business Studies", "Psychology", "Philosophy", "Punjabi", "Painting", 
  "Entrepreneurship"
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
  
  // Subject Search States
  const [subjectInput, setSubjectInput] = useState("");
  const [apiSuggestions, setApiSuggestions] = useState<any[]>([]);

  useEffect(() => setTenantId(findTenantId(slug)), [slug]);

  // 1. Fetch Staff Data
  const { data: staffData, isLoading, refetch } = useQuery({
    queryKey: ["staff-detail", staffId, tenantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/staff/${staffId}`, { headers: getAuthHeaders(tenantId) });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return await res.json();
    },
    enabled: !!tenantId && !!staffId,
  });

  // 2. Fetch All Classes & Sections (For Proper Grouped Dropdown)
  const { data: classesData } = useQuery({
    queryKey: ["classes", tenantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes`, { headers: getAuthHeaders(tenantId) });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!tenantId && isEditing,
  });

  // 3. Fetch API Suggestions as user types (Same logic as Timetable)
  useEffect(() => {
    if (subjectInput.trim() === "" || !tenantId) {
      setApiSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`${API_BASE}/class-subjects/suggestions?query=${subjectInput}`, {
          headers: getAuthHeaders(tenantId)
        });
        const data = await res.json();
        setApiSuggestions(data.suggestions || []);
      } catch (error) {
        setApiSuggestions([]);
      }
    };
    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [subjectInput, tenantId]);

  // Derived Real Data
  const staff = useMemo(() => {
    if (!staffData) return null;
    const d = staffData as Record<string, unknown>;
    return (d?.data || d) as Record<string, unknown>;
  }, [staffData]);

  const extras = (staff?.extras as Record<string, unknown>) || {};
  const category = String(editForm.category || extras.category || staff?.category || "administrative");
  const isTeaching = category === "teaching" || String(editForm.role || staff?.role || "").toLowerCase() === "teacher";
  const isSupport = category === "support";

  // Start editing
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

    if (subjectsList.some((s) => s.toLowerCase() === clean.toLowerCase())) {
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

  // Generate Smart Options for Subject Dropdown
  const getDisplayedChips = () => {
    let chips: string[] = [];
    if (subjectInput.trim().length > 0) {
      const apiNames = apiSuggestions.map(s => s.name);
      const quickNames = QUICK_SUBJECTS.filter(s => s.toLowerCase().includes(subjectInput.toLowerCase()));
      // Combine and remove duplicates
      chips = Array.from(new Set([...apiNames, ...quickNames]));
    }
    // Filter out already added ones
    return chips.filter(c => !subjectsList.some(s => s.toLowerCase() === c.toLowerCase())).slice(0, 8);
  };

  const displayedSubjectChips = getDisplayedChips();
  const exactMatchExists = displayedSubjectChips.some(c => c.toLowerCase() === subjectInput.toLowerCase().trim());

  const updateMutation = useMutation({
    mutationFn: async (form: Record<string, unknown>) => {
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

  return (
    <div className="space-y-6 text-slate-200">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href={`/school/${slug}/staff`}>
            <Button variant="outline" size="sm" className="gap-2 border-slate-700 hover:bg-slate-800 text-slate-300">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{fullName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-blue-400 font-medium">{designation}</span>
              {staff.employee_id ? (
                <span className="text-sm text-slate-400">• ID: {String(staff.employee_id)}</span>
              ) : null}
              {viewExtras.is_class_teacher ? (
                <span className="text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-700/50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
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
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate(editForm)}
                disabled={updateMutation.isPending}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
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
                className="gap-2 text-red-400 hover:text-red-300 border-red-900/50 hover:bg-red-950/30"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remove
              </Button>
              <Button onClick={startEditing} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PROFILE CARD */}
      <div className={`bg-gradient-to-br ${categoryColors[viewCategory] || categoryColors.administrative} border rounded-xl p-6 flex items-center gap-6 flex-wrap`}>
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shrink-0 shadow-lg">
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
      <div className="border-b border-slate-800">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                  ${activeTab === tab.id ? "border-blue-500 text-blue-400 bg-blue-500/5" : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-sm">
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

        {/* ===== TEACHING ===== */}
        {activeTab === "teaching" && (
          <div className="space-y-5">
            {/* 1. MASTER SUBJECTS ADDER */}
            <div className="bg-emerald-900/10 border border-emerald-800/30 rounded-xl p-5">
              <p className="text-sm font-bold mb-4 flex items-center gap-2 text-emerald-400">
                <BookOpen className="w-4 h-4" /> Subjects Configured for Teacher
              </p>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {subjectsList.length === 0 && (
                      <p className="text-xs text-slate-500 italic">No subjects added yet.</p>
                    )}
                    {subjectsList.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1.5 text-sm bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 pl-3 pr-1.5 py-1.5 rounded-lg shadow-sm">
                        {s}
                        <button type="button" onClick={() => removeSubject(s)} className="w-5 h-5 rounded-md hover:bg-red-900/50 flex items-center justify-center text-emerald-300 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="relative max-w-md">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          value={subjectInput}
                          onChange={(e) => setSubjectInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && subjectInput.trim()) {
                              e.preventDefault();
                              addSubject(subjectInput);
                            }
                          }}
                          placeholder="Search any subject to assign..."
                          className="bg-[#0f172a] border-slate-700 text-white pl-9 w-full"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => addSubject(subjectInput)}
                        disabled={!subjectInput.trim()}
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </Button>
                    </div>

                    {/* Suggestions Box */}
                    {subjectInput.trim() && displayedSubjectChips.length > 0 && (
                      <div className="absolute z-20 mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-2">
                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-2 tracking-wider">Suggestions</p>
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                          {displayedSubjectChips.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => addSubject(s)}
                              className="text-left px-3 py-2 text-sm text-slate-300 hover:bg-blue-600/20 hover:text-blue-400 rounded-lg transition-colors flex items-center justify-between group"
                            >
                              {s}
                              <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {subjectInput.trim() && displayedSubjectChips.length === 0 && !exactMatchExists && (
                      <div className="absolute z-20 mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl p-3 flex justify-between items-center">
                        <span className="text-sm text-slate-300">"{subjectInput}"</span>
                        <Button type="button" size="sm" onClick={() => addSubject(subjectInput)} className="bg-slate-700 hover:bg-slate-600 h-7 text-xs">
                          Add Custom
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {String(viewExtras.subjects || "")
                    .split(",").map((s) => s.trim()).filter(Boolean)
                    .map((s, i) => (
                      <span key={i} className="text-sm bg-emerald-900/30 border border-emerald-800/50 text-emerald-300 px-3 py-1.5 rounded-lg shadow-sm">
                        {s}
                      </span>
                    ))}
                  {!viewExtras.subjects && <p className="text-sm text-slate-500 italic">No subjects assigned.</p>}
                </div>
              )}
            </div>

            {/* 2. AUTO-SYNC CLASSES TAUGHT */}
            <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl p-5">
              <p className="text-sm font-bold mb-1 flex items-center gap-2 text-blue-400">
                <Users className="w-4 h-4" /> Classes Currently Teaching
              </p>
              <p className="text-xs text-slate-400 mb-4">
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                This is automatically updated when you assign this teacher in the Timetable Grid.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {String(viewExtras.classes_taught || "")
                  .split(",").map((c) => c.trim()).filter(Boolean)
                  .map((c, i) => (
                    <span key={i} className="text-sm bg-blue-900/30 border border-blue-800/50 text-blue-300 px-3 py-1.5 rounded-lg shadow-sm">
                      {c}
                    </span>
                  ))}
                {!viewExtras.classes_taught && (
                  <p className="text-sm text-slate-500 border border-dashed border-slate-700 px-4 py-2 rounded-lg bg-slate-800/30">
                    Not assigned to any classes yet
                  </p>
                )}
              </div>
            </div>

            {/* 3. CLASS TEACHER SETUP (SMART NATIVE GROUPED DROPDOWN) */}
            <div className="bg-yellow-900/10 border border-yellow-800/30 rounded-xl p-5">
              <p className="text-sm font-bold mb-4 flex items-center gap-2 text-yellow-400">
                <Star className="w-4 h-4 fill-yellow-500" /> Class Teacher Setup
              </p>
              
              {isEditing ? (
                <div className="space-y-5 bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_class_teacher"
                      checked={Boolean(editForm.is_class_teacher)}
                      onChange={(e) => {
                        setField("is_class_teacher", e.target.checked);
                        if (!e.target.checked) setField("assigned_class", "");
                      }}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-yellow-500 focus:ring-yellow-500"
                    />
                    <Label htmlFor="is_class_teacher" className="text-sm font-semibold text-slate-200 cursor-pointer">
                      Make this staff member a Class Teacher
                    </Label>
                  </div>
                  
                  {Boolean(editForm.is_class_teacher) && (
                    <div className="max-w-sm ml-8">
                      <Label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Assign to Class & Section</Label>
                      
                      {/* NATIVE GROUPED SELECT - BULLETPROOF UI */}
                      <select
                        value={String(editForm.assigned_class || "")}
                        onChange={(e) => setField("assigned_class", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 outline-none focus:border-yellow-500 shadow-inner"
                      >
                        <option value="">-- Choose Class & Section --</option>
                        {classesData?.map((cls: any) => {
                          if (cls.sections && cls.sections.length > 0) {
                            return (
                              <optgroup key={cls.id} label={`📂 ${cls.name}`} className="bg-slate-800 text-slate-300 font-bold">
                                {cls.sections.map((sec: any) => (
                                  <option key={sec.id} value={`${cls.name} - ${sec.name}`} className="text-white font-normal bg-slate-900">
                                    ↳ {cls.name} (Section {sec.name})
                                  </option>
                                ))}
                              </optgroup>
                            );
                          } else {
                            return (
                              <option key={cls.id} value={cls.name} className="text-white bg-slate-900">
                                {cls.name} (No Sections)
                              </option>
                            );
                          }
                        })}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-2">Pick the exact class and section from the dropdown above.</p>
                    </div>
                  )}
                </div>
              ) : viewExtras.is_class_teacher ? (
                <div className="flex flex-col bg-[#0f172a] p-4 rounded-xl border border-slate-800 w-max">
                  <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Assigned To</span>
                  <p className="text-lg font-bold text-yellow-400">
                    {String(viewExtras.assigned_class || "Class not specified")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Not assigned as a class teacher.</p>
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
      <Icon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-200 truncate">{value}</p>
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
        <Label className="text-xs text-slate-400 uppercase tracking-wider">{label}</Label>
      ) : null}
      {editing ? (
        options ? (
          <select
            value={value === "-" ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-blue-500"
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
            className="bg-slate-900 border-slate-700 text-white focus:border-blue-500"
          />
        )
      ) : (
        <p className="text-base text-slate-200 min-h-[28px] py-1 border-b border-transparent">{value || "—"}</p>
      )}
    </div>
  );
}