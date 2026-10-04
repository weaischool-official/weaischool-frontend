"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft, User, Briefcase, GraduationCap, FileText, Users,
  Loader2, Edit, Save, X, Trash2, Phone, Mail, Calendar,
  Wrench, BookOpen, Star, MapPin,
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

  useEffect(() => setTenantId(findTenantId(slug)), [slug]);

  const { data: staffData, isLoading } = useQuery({
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
  const category = String(extras.category || "administrative");
  const isTeaching = category === "teaching";
  const isSupport = category === "support";

  useEffect(() => {
    if (isEditing && staff) setEditForm({ ...staff, ...extras });
  }, [isEditing, staff]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`${API_BASE}/staff/${staffId}`, {
        method: "PUT",
        headers: getAuthHeaders(tenantId),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Update failed");
      return data;
    },
    onSuccess: () => {
      toast.success("Updated successfully! ✅");
      queryClient.invalidateQueries({ queryKey: ["staff-detail", staffId] });
      setIsEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/staff/${staffId}`, {
        method: "DELETE",
        headers: getAuthHeaders(tenantId),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Delete failed");
      }
      return true;
    },
    onSuccess: () => {
      toast.success("Staff removed");
      router.push(`/school/${slug}/staff`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!staff) return <div className="text-center py-20"><p>Not found</p></div>;

  const fullName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim();
  const initials = fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  const designation = String(staff.designation || staff.role || "Staff");

  const categoryColors: Record<string, string> = {
    teaching: "from-green-500/20 to-green-600/10 border-green-500/30",
    administrative: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    support: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  };

  const tabs = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "professional", label: "Professional", icon: GraduationCap },
    { id: "employment", label: "Employment", icon: Briefcase },
    ...(isTeaching ? [{ id: "teaching", label: "Teaching", icon: BookOpen }] : []),
    ...(isSupport ? [{ id: "duty", label: "Duty", icon: Wrench }] : []),
    { id: "address", label: "Address", icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/school/${slug}/staff`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-blue-400 font-medium">{designation}</span>
              {staff.employee_id ? <span className="text-sm text-muted-foreground">• ID: {String(staff.employee_id)}</span> : null}
              {extras.is_class_teacher && (
                <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400" />
                  Class Teacher
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={updateMutation.isPending}>
                <X className="w-4 h-4 mr-2" />Cancel
              </Button>
              <Button onClick={() => updateMutation.mutate({ ...editForm, id: undefined })} disabled={updateMutation.isPending} className="gap-2 bg-green-600 hover:bg-green-700">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => confirm("Remove this staff member?") && deleteMutation.mutate()} disabled={deleteMutation.isPending} className="gap-2 text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10">
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Remove
              </Button>
              <Button onClick={() => setIsEditing(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Edit className="w-4 h-4" />Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PROFILE CARD */}
      <div className={`bg-gradient-to-br ${categoryColors[category] || categoryColors.administrative} border rounded-xl p-6 flex items-center gap-6`}>
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shrink-0">
          {initials}
        </div>
        <div className="flex-1 grid grid-cols-3 gap-4">
          {staff.phone ? <InfoItem icon={Phone} label="Phone" value={String(staff.phone)} /> : null}
          {staff.email ? <InfoItem icon={Mail} label="Email" value={String(staff.email)} /> : null}
          {staff.department ? <InfoItem icon={Briefcase} label="Department" value={String(staff.department)} /> : null}
          {extras.experience_years ? <InfoItem icon={Calendar} label="Experience" value={`${extras.experience_years} years`} /> : null}
          {extras.employment_type ? <InfoItem icon={FileText} label="Type" value={String(extras.employment_type)} /> : null}
          {isTeaching && extras.subjects ? <InfoItem icon={BookOpen} label="Subjects" value={String(extras.subjects)} /> : null}
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map(tab => {
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
        {activeTab === "basic" && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="First Name" value={String(staff.first_name || "-")} />
            <Field label="Last Name" value={String(staff.last_name || "-")} />
            <Field label="Date of Birth" value={String(staff.date_of_birth || "-")} />
            <Field label="Gender" value={String(staff.gender || "-")} />
            <Field label="Mobile" value={String(staff.phone || "-")} />
            <Field label="Email" value={String(staff.email || "-")} />
            <Field label="Blood Group" value={String(staff.blood_group || "-")} />
            <Field label="Aadhaar" value={String(staff.aadhaar_number || "-")} />
            <Field label="Category" value={String(staff.category || "-")} />
            <Field label="Religion" value={String(staff.religion || "-")} />
          </div>
        )}

        {activeTab === "professional" && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Designation" value={designation} />
            <Field label="Qualification" value={String(extras.qualification || "-")} />
            <Field label="Specialization" value={String(extras.specialization || "-")} />
            <Field label="Experience" value={String(extras.experience_years || "-") + " years"} />
            <Field label="Previous School/Employer" value={String(extras.previous_school || "-")} />
          </div>
        )}

        {activeTab === "employment" && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Employee ID" value={String(staff.employee_id || "-")} />
            <Field label="Joining Date" value={String(extras.join_date || "-")} />
            <Field label="Employment Type" value={String(extras.employment_type || "-")} />
            <Field label="Department" value={String(staff.department || "-")} />
            <Field label="Salary" value={extras.salary ? `₹${extras.salary}` : "-"} />
            <Field label="PAN Number" value={String(extras.pan_number || "-")} />
          </div>
        )}

        {activeTab === "teaching" && isTeaching && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-green-400" />
                Subjects Taught
              </p>
              <div className="flex flex-wrap gap-2">
                {String(extras.subjects || "").split(",").filter(Boolean).map((s, i) => (
                  <span key={i} className="text-sm bg-green-500/20 border border-green-500/40 text-green-300 px-3 py-1 rounded-full">
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>

            {extras.classes_taught && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Classes Taught
                </p>
                <div className="flex flex-wrap gap-2">
                  {String(extras.classes_taught || "").split(",").filter(Boolean).map((c, i) => (
                    <span key={i} className="text-sm bg-blue-500/20 border border-blue-500/40 text-blue-300 px-3 py-1 rounded-full">
                      {c.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {extras.is_class_teacher && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  Class Teacher of
                </p>
                <p className="text-lg font-bold text-yellow-300">{String(extras.assigned_class || "-")}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "duty" && isSupport && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Shift" value={String(extras.shift || "-")} />
            <Field label="Duty Area" value={String(extras.duty_area || "-")} />
            <div className="col-span-2">
              <Field label="Reports To" value={String(extras.reports_to || "-")} />
            </div>
          </div>
        )}

        {activeTab === "address" && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div className="col-span-2">
              <Field label="Full Address" value={String(staff.address || "-")} />
            </div>
            <Field label="City" value={String(staff.city || "-")} />
            <Field label="State" value={String(staff.state || "-")} />
            <Field label="Pincode" value={String(staff.pincode || "-")} />
          </div>
        )}
      </div>
    </div>
  );
}

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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
      <p className="text-base text-foreground">{value || "-"}</p>
    </div>
  );
}