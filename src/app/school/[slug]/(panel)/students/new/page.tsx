"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Users,
  Tag,
  Home,
  GraduationCap,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"];
// Backend accepts: hindu, muslim, christian, sikh, buddhist, jain, parsi, jewish, other, not_specified
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Parsi", "Jewish", "Other", "Not Specified"];
const EDUCATION_LEVELS = [
  "Illiterate", "Primary", "Middle", "High School", "Intermediate",
  "Graduate", "Post Graduate", "Doctorate", "Professional",
];
const GUARDIAN_RELATIONS = ["Uncle", "Aunt", "Grandparent", "Sibling", "Other Relative", "Legal Guardian"];
const INCOME_RANGES = [
  "Below ₹1 Lakh", "₹1-3 Lakh", "₹3-5 Lakh", "₹5-8 Lakh",
  "₹8-12 Lakh", "₹12-20 Lakh", "Above ₹20 Lakh",
];
const DISABILITY_TYPES = [
  "Visual Impairment", "Hearing Impairment", "Speech Impairment",
  "Locomotor Disability", "Intellectual Disability", "Learning Disability",
  "Cerebral Palsy", "Autism Spectrum", "Multiple Disabilities", "Other",
];
const TRANSPORT_MODES = [
  "Walk", "Bicycle", "School Bus", "Public Bus", "Auto Rickshaw",
  "Private Vehicle", "Van/Pool", "Other",
];
const MEDIUMS = ["Hindi", "English", "Urdu", "Regional Language", "Other"];
const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "IGCSE", "Other"];
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
  "Andaman & Nicobar", "Dadra & Nagar Haveli", "Daman & Diu", "Lakshadweep",
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

// ═══════════════════════════════════════════════════════════════════════════
// API HELPERS
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
    `tenant_id_${slug}`,
    `tenantId_${slug}`,
    `${slug}_tenant_id`,
    "tenant_id",
    "current_tenant_id",
    "tenantId",
  ];
  
  for (const key of possibleKeys) {
    const val = localStorage.getItem(key);
    if (val && val.length > 10) {
      return val;
    }
  }
  
  const allKeys = Object.keys(localStorage);
  for (const key of allKeys) {
    if (key.toLowerCase().includes("tenant")) {
      const val = localStorage.getItem(key);
      if (val && val.length > 10 && !val.startsWith("{")) {
        return val;
      }
    }
  }
  
  return "";
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONFIG
// ═══════════════════════════════════════════════════════════════════════════

interface TabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  requiredFields: string[];
  totalFields: string[];
}

const TABS: TabConfig[] = [
  {
    id: "basic",
    label: "Basic Information",
    icon: User,
    requiredFields: ["first_name", "last_name", "date_of_birth", "gender"],
    totalFields: ["first_name", "last_name", "date_of_birth", "gender", "aadhaar_number", "apaar_id", "blood_group"],
  },
  {
    id: "family",
    label: "Family Details",
    icon: Users,
    requiredFields: ["father_name", "father_mobile", "mother_name"],
    totalFields: [
      "father_name", "father_occupation", "father_education", "father_mobile",
      "mother_name", "mother_occupation", "mother_education", "mother_mobile",
      "guardian_name", "guardian_relation", "family_income", "family_email",
    ],
  },
  {
    id: "social",
    label: "Social Category",
    icon: Tag,
    requiredFields: ["category"],
    totalFields: [
      "category", "religion", "mother_tongue", "is_bpl", "bpl_number",
      "is_rte", "is_minority", "is_cwsn", "disability_type",
    ],
  },
  {
    id: "address",
    label: "Address & Transport",
    icon: Home,
    requiredFields: ["address", "city", "state", "pincode"],
    totalFields: [
      "address", "area_landmark", "city", "district",
      "state", "pincode", "distance_from_school", "transport_mode",
    ],
  },
  {
    id: "academic",
    label: "Academic Details",
    icon: GraduationCap,
    requiredFields: ["class_id"],
    totalFields: [
      "class_id", "section_id", "roll_number", "medium_of_instruction",
      "board", "previous_school_name", "previous_class", "tc_number",
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA TYPE
// ═══════════════════════════════════════════════════════════════════════════

interface FormData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  aadhaar_number: string;
  apaar_id: string;
  blood_group: string;
  father_name: string;
  father_occupation: string;
  father_education: string;
  father_mobile: string;
  mother_name: string;
  mother_occupation: string;
  mother_education: string;
  mother_mobile: string;
  guardian_name: string;
  guardian_relation: string;
  family_income: string;
  family_email: string;
  category: string;
  religion: string;
  mother_tongue: string;
  is_bpl: boolean;
  bpl_number: string;
  is_rte: boolean;
  is_minority: boolean;
  is_cwsn: boolean;
  disability_type: string;
  address: string;
  area_landmark: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  distance_from_school: string;
  transport_mode: string;
  class_id: string;
  section_id: string;
  roll_number: string;
  medium_of_instruction: string;
  board: string;
  previous_school_name: string;
  previous_class: string;
  tc_number: string;
}

const INITIAL_FORM: FormData = {
  first_name: "", last_name: "", date_of_birth: "", gender: "",
  aadhaar_number: "", apaar_id: "", blood_group: "",
  father_name: "", father_occupation: "", father_education: "", father_mobile: "",
  mother_name: "", mother_occupation: "", mother_education: "", mother_mobile: "",
  guardian_name: "", guardian_relation: "", family_income: "", family_email: "",
  category: "", religion: "", mother_tongue: "",
  is_bpl: false, bpl_number: "", is_rte: false, is_minority: false, is_cwsn: false, disability_type: "",
  address: "", area_landmark: "", city: "", district: "",
  state: "", pincode: "", distance_from_school: "", transport_mode: "",
  class_id: "", section_id: "", roll_number: "", medium_of_instruction: "",
  board: "", previous_school_name: "", previous_class: "", tc_number: "",
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getTabCompletion(tab: TabConfig, data: FormData) {
  const total = tab.totalFields.length;
  let filled = 0;
  for (const field of tab.totalFields) {
    const val = data[field as keyof FormData];
    if (typeof val === "boolean") filled++;
    else if (typeof val === "string" && val.trim() !== "") filled++;
  }
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { filled, total, percent };
}

function getMissingRequired(tab: TabConfig, data: FormData): string[] {
  const missing: string[] = [];
  for (const field of tab.requiredFields) {
    const val = data[field as keyof FormData];
    if (typeof val === "string" && val.trim() === "") {
      const label = field
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace("Id", "")
        .replace("Class ", "Class");
      missing.push(label);
    }
  }
  return missing;
}

function extractArrayFromResponse(data: unknown): Array<Record<string, unknown>> {
  if (!data) return [];
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  
  const r = data as Record<string, unknown>;
  
  for (const key of ["items", "classes", "sections", "results", "data"]) {
    const val = r[key];
    if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
  }
  
  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    for (const key of ["items", "classes", "sections", "results"]) {
      const val = d[key];
      if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
    }
  }
  
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-green-600" : "bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AddStudentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const prefillClassId = searchParams.get("class_id") || "";
  const prefillSectionId = searchParams.get("section_id") || "";

  const [activeTab, setActiveTab] = useState("basic");
  const [tenantId, setTenantId] = useState<string>("");
  const [form, setForm] = useState<FormData>({
    ...INITIAL_FORM,
    class_id: prefillClassId,
    section_id: prefillSectionId,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const tid = findTenantId(slug);
    setTenantId(tid);
    console.log("🏫 Tenant ID for slug", slug, ":", tid);
  }, [slug]);

  const updateField = useCallback((field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // ── FETCH CLASSES ──
  const { data: classesRaw, isLoading: classesLoading, error: classesError } = useQuery({
    queryKey: ["classes-direct", tenantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes/`, {
        headers: getAuthHeaders(tenantId),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API ${res.status}: ${errorText.substring(0, 100)}`);
      }
      return await res.json();
    },
    enabled: !!tenantId,
    retry: 1,
  });

  // ── FETCH SECTIONS ──
  const { data: sectionsRaw, isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections-direct", tenantId, form.class_id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes/${form.class_id}/sections`, {
        headers: getAuthHeaders(tenantId),
      });
      if (!res.ok) return { sections: [] };
      return await res.json();
    },
    enabled: !!tenantId && !!form.class_id,
    retry: 1,
  });

  const classes = useMemo(() => extractArrayFromResponse(classesRaw), [classesRaw]);
  const sections = useMemo(() => extractArrayFromResponse(sectionsRaw), [sectionsRaw]);

  const tabCompletions = useMemo(
    () =>
      TABS.map((tab) => ({
        ...tab,
        completion: getTabCompletion(tab, form),
        missingRequired: getMissingRequired(tab, form),
      })),
    [form]
  );

  const overallCompletion = useMemo(() => {
    const totalFields = TABS.reduce((sum, tab) => sum + tab.totalFields.length, 0);
    const filledFields = tabCompletions.reduce((sum, tc) => sum + tc.completion.filled, 0);
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  }, [tabCompletions]);

  const allRequiredFilled = useMemo(
    () => tabCompletions.every((tc) => tc.missingRequired.length === 0),
    [tabCompletions]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // CREATE STUDENT MUTATION
  // ═══════════════════════════════════════════════════════════════════════
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      console.log("🚀 ═══ CREATING STUDENT ═══");
      console.log("📤 PAYLOAD:", JSON.stringify(payload, null, 2));
      
      const res = await fetch(`${API_BASE}/students/`, {
        method: "POST",
        headers: getAuthHeaders(tenantId),
        body: JSON.stringify(payload),
      });
      
      const responseData = await res.json();
      console.log("📥 Status:", res.status);
      console.log("📥 Response:", responseData);
      
      if (!res.ok) {
        const error = new Error(`HTTP ${res.status}`) as Error & { response?: unknown };
        error.response = { status: res.status, data: responseData };
        throw error;
      }
      
      return responseData;
    },
    onSuccess: (response: unknown) => {
      const r = response as Record<string, unknown>;
      const data = (r?.data as Record<string, unknown>) || r;
      const studentId = data?.id as string | undefined;
      toast.success("Student added successfully! 🎉");
      if (studentId) {
        router.push(`/school/${slug}/students/${studentId}`);
      } else {
        router.push(`/school/${slug}/students`);
      }
    },
    onError: (error: unknown) => {
      console.error("❌ CREATE STUDENT ERROR");
      const err = error as {
        response?: {
          status?: number;
          data?: {
            detail?: string | Array<{ loc?: string[]; msg?: string }>;
            message?: string;
          };
        };
      };
      
      let errorMsg = "Failed to add student. ";
      const detail = err?.response?.data?.detail;
      
      if (typeof detail === "string") {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        const errors = detail.map(e => {
          const field = e.loc ? e.loc.slice(1).join(".") : "unknown";
          return `${field}: ${e.msg}`;
        });
        errorMsg = errors.length > 0 ? errors.join(", ") : errorMsg;
        console.error("🔍 Validation errors:", errors);
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      
      toast.error(errorMsg, { duration: 8000 });
    },
  });

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    for (const tab of TABS) {
      for (const field of tab.requiredFields) {
        const val = form[field as keyof FormData];
        if (typeof val === "string" && val.trim() === "") {
          newErrors[field] = "This field is required";
        }
      }
    }

    if (form.aadhaar_number && !/^\d{12}$/.test(form.aadhaar_number)) {
      newErrors.aadhaar_number = "Aadhaar must be 12 digits";
    }
    if (form.father_mobile && !/^\d{10}$/.test(form.father_mobile)) {
      newErrors.father_mobile = "Must be 10 digits";
    }
    if (form.mother_mobile && !/^\d{10}$/.test(form.mother_mobile)) {
      newErrors.mother_mobile = "Must be 10 digits";
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      newErrors.pincode = "Must be 6 digits";
    }
    if (form.family_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.family_email)) {
      newErrors.family_email = "Invalid email format";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      for (const tab of TABS) {
        const hasError = tab.requiredFields.some((f) => newErrors[f]) ||
          tab.totalFields.some((f) => newErrors[f]);
        if (hasError) {
          setActiveTab(tab.id);
          break;
        }
      }
      toast.error("Please fill all required fields");
      return;
    }

    // Build extras JSON (all extra fields stored here)
    const extras: Record<string, string | boolean> = {};
    if (form.father_name) extras.father_name = form.father_name;
    if (form.father_occupation) extras.father_occupation = form.father_occupation;
    if (form.father_education) extras.father_education = form.father_education;
    if (form.father_mobile) extras.father_mobile = form.father_mobile;
    if (form.mother_name) extras.mother_name = form.mother_name;
    if (form.mother_occupation) extras.mother_occupation = form.mother_occupation;
    if (form.mother_education) extras.mother_education = form.mother_education;
    if (form.mother_mobile) extras.mother_mobile = form.mother_mobile;
    if (form.guardian_name) extras.guardian_name = form.guardian_name;
    if (form.guardian_relation) extras.guardian_relation = form.guardian_relation;
    if (form.family_income) extras.family_income = form.family_income;
    if (form.family_email) extras.family_email = form.family_email;
    extras.is_bpl = form.is_bpl;
    if (form.bpl_number) extras.bpl_number = form.bpl_number;
    extras.is_rte = form.is_rte;
    extras.is_minority = form.is_minority;
    extras.is_cwsn = form.is_cwsn;
    if (form.disability_type) extras.disability_type = form.disability_type;
    if (form.mother_tongue) extras.mother_tongue = form.mother_tongue;
    if (form.area_landmark) extras.area_landmark = form.area_landmark;
    if (form.district) extras.district = form.district;
    if (form.distance_from_school) extras.distance_from_school = form.distance_from_school;
    if (form.transport_mode) extras.transport_mode = form.transport_mode;
    if (form.medium_of_instruction) extras.medium_of_instruction = form.medium_of_instruction;
    if (form.board) extras.board = form.board;
    if (form.previous_class) extras.previous_class = form.previous_class;
    if (form.apaar_id) extras.apaar_id = form.apaar_id;

    // 🔥 BACKEND-COMPATIBLE PAYLOAD
    // Required fields always sent, optional enum fields OMITTED when empty
    const payload: Record<string, unknown> = {
      first_name: form.first_name.trim(),
      date_of_birth: form.date_of_birth,
      gender: form.gender.toLowerCase(),
      admission_class_id: form.class_id,
      extras,
    };

    // Optional text fields — only send if filled
    if (form.last_name?.trim()) payload.last_name = form.last_name.trim();
    if (form.aadhaar_number) payload.aadhaar_number = form.aadhaar_number;
    if (form.address) payload.address = form.address;
    if (form.city) payload.city = form.city;
    if (form.state) payload.state = form.state;
    if (form.pincode) payload.pincode = form.pincode;
    if (form.father_mobile) payload.phone = form.father_mobile;
    if (form.family_email) payload.email = form.family_email;
    if (form.roll_number) payload.roll_number = form.roll_number;
    if (form.previous_school_name) payload.previous_school_name = form.previous_school_name;
    if (form.tc_number) payload.tc_number = form.tc_number;
    if (form.section_id) payload.current_section_id = form.section_id;

    // 🔥 ENUM FIELDS — send as-is in correct format, OMIT if empty
    if (form.blood_group) {
      // Backend expects: "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
      payload.blood_group = form.blood_group;
    }
    if (form.religion) {
      // Backend expects: hindu, muslim, christian, sikh, buddhist, jain, parsi, jewish, other, not_specified
      payload.religion = form.religion.toLowerCase().replace(" ", "_");
    }
    if (form.category) {
      // Backend expects lowercase: general, obc, sc, st, ews
      payload.category = form.category.toLowerCase();
    }

    createMutation.mutate(payload);
  };

  const currentTabData = tabCompletions.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/school/${slug}/students`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-400" />
              New Student Admission
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Fill in student details across all categories for UDISE+ compliance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`text-2xl font-bold ${overallCompletion === 100 ? "text-green-400" : overallCompletion > 50 ? "text-yellow-400" : "text-red-400"}`}>
              {overallCompletion}%
            </div>
            <div className="text-xs text-muted-foreground">Overall Complete</div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!allRequiredFilled || createMutation.isPending}
            className="gap-2 bg-green-600 hover:bg-green-700 px-6 h-11"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Student
              </>
            )}
          </Button>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {tabCompletions.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const pct = tab.completion.percent;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all
                  whitespace-nowrap
                  ${isActive
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-600"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span
                  className={`text-xs font-bold ml-1 ${
                    pct === 100 ? "text-green-400" : pct > 0 ? "text-yellow-400" : "text-red-400"
                  }`}
                >
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="bg-card border border-border rounded-xl shadow-sm">
        {/* Tab Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {(() => {
                  const Icon = currentTabData.icon;
                  return <Icon className="w-5 h-5 text-blue-400" />;
                })()}
                {currentTabData.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeTab === "basic" && "Student personal details"}
                {activeTab === "family" && "Parents and guardian information"}
                {activeTab === "social" && "Category, religion, special status"}
                {activeTab === "address" && "Residential address and transport"}
                {activeTab === "academic" && "Enrollment and academic information"}
              </p>
            </div>
            <div className="text-right">
              <div
                className={`text-2xl font-bold ${
                  currentTabData.completion.percent === 100
                    ? "text-green-400"
                    : currentTabData.completion.percent > 0
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {currentTabData.completion.percent}%
              </div>
              <div className="text-xs text-muted-foreground">
                {currentTabData.completion.filled}/{currentTabData.completion.total} filled
              </div>
            </div>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                currentTabData.completion.percent === 100
                  ? "bg-green-500"
                  : currentTabData.completion.percent > 0
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${currentTabData.completion.percent}%` }}
            />
          </div>

          {currentTabData.missingRequired.length > 0 && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Missing: {currentTabData.missingRequired.join(", ")}</span>
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="px-6 pb-6">
          {/* ═══ BASIC INFORMATION ═══ */}
          {activeTab === "basic" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="First Name" required>
                <Input
                  placeholder="e.g. Rahul"
                  value={form.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                  className={errors.first_name ? "border-red-500" : ""}
                />
                {errors.first_name && <p className="text-xs text-red-400 mt-1">{errors.first_name}</p>}
              </FormField>

              <FormField label="Last Name" required>
                <Input
                  placeholder="e.g. Kumar Sharma"
                  value={form.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                  className={errors.last_name ? "border-red-500" : ""}
                />
                {errors.last_name && <p className="text-xs text-red-400 mt-1">{errors.last_name}</p>}
              </FormField>

              <FormField label="Date of Birth" required>
                <Input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={form.date_of_birth}
                  onChange={(e) => updateField("date_of_birth", e.target.value)}
                  className={errors.date_of_birth ? "border-red-500" : ""}
                />
                {errors.date_of_birth && <p className="text-xs text-red-400 mt-1">{errors.date_of_birth}</p>}
              </FormField>

              <FormField label="Gender" required>
                <Select
                  value={form.gender}
                  onValueChange={(val) => updateField("gender", val)}
                >
                  <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-red-400 mt-1">{errors.gender}</p>}
              </FormField>

              <FormField label="Aadhaar Number">
                <Input
                  placeholder="12-digit Aadhaar number"
                  maxLength={12}
                  value={form.aadhaar_number}
                  onChange={(e) => updateField("aadhaar_number", e.target.value.replace(/\D/g, ""))}
                  className={errors.aadhaar_number ? "border-red-500" : ""}
                />
                {errors.aadhaar_number && <p className="text-xs text-red-400 mt-1">{errors.aadhaar_number}</p>}
              </FormField>

              <FormField label="APAAR ID">
                <Input
                  placeholder="Auto-generated by UDISE"
                  value={form.apaar_id}
                  onChange={(e) => updateField("apaar_id", e.target.value)}
                />
              </FormField>

              <FormField label="Blood Group">
                <Select
                  value={form.blood_group}
                  onValueChange={(val) => updateField("blood_group", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          )}

          {/* ═══ FAMILY DETAILS ═══ */}
          {activeTab === "family" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="Father's Name" required>
                <Input
                  placeholder="Full name"
                  value={form.father_name}
                  onChange={(e) => updateField("father_name", e.target.value)}
                  className={errors.father_name ? "border-red-500" : ""}
                />
                {errors.father_name && <p className="text-xs text-red-400 mt-1">{errors.father_name}</p>}
              </FormField>

              <FormField label="Father's Occupation">
                <Input
                  placeholder="e.g. Business, Service, Farming"
                  value={form.father_occupation}
                  onChange={(e) => updateField("father_occupation", e.target.value)}
                />
              </FormField>

              <FormField label="Father's Education">
                <Select value={form.father_education} onValueChange={(val) => updateField("father_education", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Father's Mobile" required>
                <Input
                  placeholder="10-digit number"
                  maxLength={10}
                  value={form.father_mobile}
                  onChange={(e) => updateField("father_mobile", e.target.value.replace(/\D/g, ""))}
                  className={errors.father_mobile ? "border-red-500" : ""}
                />
                {errors.father_mobile && <p className="text-xs text-red-400 mt-1">{errors.father_mobile}</p>}
              </FormField>

              <FormField label="Mother's Name" required>
                <Input
                  placeholder="Full name"
                  value={form.mother_name}
                  onChange={(e) => updateField("mother_name", e.target.value)}
                  className={errors.mother_name ? "border-red-500" : ""}
                />
                {errors.mother_name && <p className="text-xs text-red-400 mt-1">{errors.mother_name}</p>}
              </FormField>

              <FormField label="Mother's Occupation">
                <Input
                  placeholder="e.g. Housewife, Service, Business"
                  value={form.mother_occupation}
                  onChange={(e) => updateField("mother_occupation", e.target.value)}
                />
              </FormField>

              <FormField label="Mother's Education">
                <Select value={form.mother_education} onValueChange={(val) => updateField("mother_education", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Mother's Mobile">
                <Input
                  placeholder="10-digit number"
                  maxLength={10}
                  value={form.mother_mobile}
                  onChange={(e) => updateField("mother_mobile", e.target.value.replace(/\D/g, ""))}
                  className={errors.mother_mobile ? "border-red-500" : ""}
                />
                {errors.mother_mobile && <p className="text-xs text-red-400 mt-1">{errors.mother_mobile}</p>}
              </FormField>

              <div className="col-span-2 border-t border-border my-1" />

              <FormField label="Guardian Name (if applicable)">
                <Input
                  placeholder="If different from parents"
                  value={form.guardian_name}
                  onChange={(e) => updateField("guardian_name", e.target.value)}
                />
              </FormField>

              <FormField label="Guardian Relation">
                <Select value={form.guardian_relation} onValueChange={(val) => updateField("guardian_relation", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {GUARDIAN_RELATIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Annual Family Income">
                <Select value={form.family_income} onValueChange={(val) => updateField("family_income", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_RANGES.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Family Email">
                <Input
                  type="email"
                  placeholder="parent@email.com"
                  value={form.family_email}
                  onChange={(e) => updateField("family_email", e.target.value)}
                  className={errors.family_email ? "border-red-500" : ""}
                />
                {errors.family_email && <p className="text-xs text-red-400 mt-1">{errors.family_email}</p>}
              </FormField>
            </div>
          )}

          {/* ═══ SOCIAL CATEGORY ═══ */}
          {activeTab === "social" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="Social Category" required>
                <Select value={form.category} onValueChange={(val) => updateField("category", val)}>
                  <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category}</p>}
              </FormField>

              <FormField label="Religion">
                <Select value={form.religion} onValueChange={(val) => updateField("religion", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELIGIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Mother Tongue">
                <Input
                  placeholder="e.g. Hindi, Tamil, Bengali"
                  value={form.mother_tongue}
                  onChange={(e) => updateField("mother_tongue", e.target.value)}
                />
              </FormField>

              <div />

              <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
                  <p className="text-sm font-medium">BPL (Below Poverty Line)</p>
                  <div className="flex items-center gap-2">
                    <ToggleSwitch checked={form.is_bpl} onChange={(val) => updateField("is_bpl", val)} />
                    <span className="text-sm text-muted-foreground w-8">{form.is_bpl ? "Yes" : "No"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
                  <p className="text-sm font-medium">RTE (Right to Education) Beneficiary</p>
                  <div className="flex items-center gap-2">
                    <ToggleSwitch checked={form.is_rte} onChange={(val) => updateField("is_rte", val)} />
                    <span className="text-sm text-muted-foreground w-8">{form.is_rte ? "Yes" : "No"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
                  <p className="text-sm font-medium">Belongs to Minority Community</p>
                  <div className="flex items-center gap-2">
                    <ToggleSwitch checked={form.is_minority} onChange={(val) => updateField("is_minority", val)} />
                    <span className="text-sm text-muted-foreground w-8">{form.is_minority ? "Yes" : "No"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
                  <p className="text-sm font-medium">CWSN (Child with Special Needs)</p>
                  <div className="flex items-center gap-2">
                    <ToggleSwitch checked={form.is_cwsn} onChange={(val) => updateField("is_cwsn", val)} />
                    <span className="text-sm text-muted-foreground w-8">{form.is_cwsn ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>

              {form.is_bpl && (
                <FormField label="BPL Card Number">
                  <Input
                    placeholder="If BPL, enter card number"
                    value={form.bpl_number}
                    onChange={(e) => updateField("bpl_number", e.target.value)}
                  />
                </FormField>
              )}

              {form.is_cwsn && (
                <FormField label="Type of Disability (if CWSN)">
                  <Select value={form.disability_type} onValueChange={(val) => updateField("disability_type", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="-- Select --" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISABILITY_TYPES.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </div>
          )}

          {/* ═══ ADDRESS & TRANSPORT ═══ */}
          {activeTab === "address" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="House No. / Street / Locality" required>
                <Input
                  placeholder="e.g. 123 MG Road"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && <p className="text-xs text-red-400 mt-1">{errors.address}</p>}
              </FormField>

              <FormField label="Area / Landmark">
                <Input
                  placeholder="e.g. Near Bus Stand"
                  value={form.area_landmark}
                  onChange={(e) => updateField("area_landmark", e.target.value)}
                />
              </FormField>

              <FormField label="Village / Town / City" required>
                <Input
                  placeholder="e.g. Jaipur"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className={errors.city ? "border-red-500" : ""}
                />
                {errors.city && <p className="text-xs text-red-400 mt-1">{errors.city}</p>}
              </FormField>

              <FormField label="District">
                <Input
                  placeholder="e.g. Jaipur"
                  value={form.district}
                  onChange={(e) => updateField("district", e.target.value)}
                />
              </FormField>

              <FormField label="State" required>
                <Select value={form.state} onValueChange={(val) => updateField("state", val)}>
                  <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-xs text-red-400 mt-1">{errors.state}</p>}
              </FormField>

              <FormField label="Pincode" required>
                <Input
                  placeholder="6-digit pincode"
                  maxLength={6}
                  value={form.pincode}
                  onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, ""))}
                  className={errors.pincode ? "border-red-500" : ""}
                />
                {errors.pincode && <p className="text-xs text-red-400 mt-1">{errors.pincode}</p>}
              </FormField>

              <FormField label="Distance from School (km)">
                <Input
                  placeholder="In kilometers"
                  value={form.distance_from_school}
                  onChange={(e) => updateField("distance_from_school", e.target.value)}
                />
              </FormField>

              <FormField label="Mode of Transport to School">
                <Select value={form.transport_mode} onValueChange={(val) => updateField("transport_mode", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_MODES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          )}

          {/* ═══ ACADEMIC DETAILS ═══ */}
          {activeTab === "academic" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="Class" required>
                {!tenantId ? (
                  <div className="text-sm text-red-400 bg-red-500/10 rounded-md px-3 py-2.5 border border-red-500/20">
                    ❌ Tenant ID not found. Please refresh page.
                  </div>
                ) : classesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2.5 border border-border h-11">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading classes...
                  </div>
                ) : classesError ? (
                  <div className="text-sm text-red-400 bg-red-500/10 rounded-md px-3 py-2.5 border border-red-500/20">
                    ❌ Error: {(classesError as Error).message}
                  </div>
                ) : classes.length === 0 ? (
                  <div className="text-sm text-yellow-400 bg-yellow-500/10 rounded-md px-3 py-2.5 border border-yellow-500/20">
                    ⚠️ No classes found. Create classes first.
                  </div>
                ) : (
                  <select
                    value={form.class_id}
                    onChange={(e) => {
                      updateField("class_id", e.target.value);
                      updateField("section_id", "");
                    }}
                    className={`flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm 
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      ${errors.class_id ? "border-red-500" : "border-input"}`}
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((cls) => (
                      <option key={String(cls.id)} value={String(cls.id)}>
                        {String(cls.name || cls.class_name || `Class ${cls.numeric_level || ""}`)}
                      </option>
                    ))}
                  </select>
                )}
                {errors.class_id && <p className="text-xs text-red-400 mt-1">{errors.class_id}</p>}
                {classes.length > 0 && (
                  <p className="text-xs text-green-400 mt-1">✓ {classes.length} classes loaded</p>
                )}
              </FormField>

              <FormField label="Section">
                {!form.class_id ? (
                  <div className="text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2.5 border border-border h-11 flex items-center">
                    Select a class first
                  </div>
                ) : sectionsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2.5 border border-border h-11">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading sections...
                  </div>
                ) : sections.length === 0 ? (
                  <div className="text-sm text-yellow-400 bg-yellow-500/10 rounded-md px-3 py-2.5 border border-yellow-500/20">
                    No sections for this class
                  </div>
                ) : (
                  <select
                    value={form.section_id}
                    onChange={(e) => updateField("section_id", e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm 
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Select Section --</option>
                    {sections.map((sec) => (
                      <option key={String(sec.id)} value={String(sec.id)}>
                        Section {String(sec.name || sec.section_name || "")}
                      </option>
                    ))}
                  </select>
                )}
                {sections.length > 0 && (
                  <p className="text-xs text-green-400 mt-1">✓ {sections.length} sections available</p>
                )}
              </FormField>

              <FormField label="Roll Number">
                <Input
                  placeholder="e.g. 01, 02"
                  value={form.roll_number}
                  onChange={(e) => updateField("roll_number", e.target.value)}
                />
              </FormField>

              <FormField label="Medium of Instruction">
                <Select value={form.medium_of_instruction} onValueChange={(val) => updateField("medium_of_instruction", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIUMS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Board">
                <Select value={form.board} onValueChange={(val) => updateField("board", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARDS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Previous School Name">
                <Input
                  placeholder="If transfer student"
                  value={form.previous_school_name}
                  onChange={(e) => updateField("previous_school_name", e.target.value)}
                />
              </FormField>

              <FormField label="Previous Class">
                <Input
                  placeholder="e.g. Class 5"
                  value={form.previous_class}
                  onChange={(e) => updateField("previous_class", e.target.value)}
                />
              </FormField>

              <FormField label="Transfer Certificate Number">
                <Input
                  placeholder="TC number from previous school"
                  value={form.tc_number}
                  onChange={(e) => updateField("tc_number", e.target.value)}
                />
              </FormField>
            </div>
          )}
        </div>

        {/* BOTTOM BAR */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/20 rounded-b-xl">
          <div className="flex items-center gap-2 text-sm">
            {allRequiredFilled ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium">All required fields filled — ready to create!</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400">
                  Fill required fields in:{" "}
                  {tabCompletions
                    .filter((t) => t.missingRequired.length > 0)
                    .map((t) => t.label)
                    .join(", ")}
                </span>
              </>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!allRequiredFilled || createMutation.isPending}
            className="gap-2 bg-green-600 hover:bg-green-700 px-8"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Student
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}