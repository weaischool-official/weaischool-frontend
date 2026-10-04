"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Briefcase,
  GraduationCap,
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  UserPlus,
  Wrench,
  ChevronRight,
  BookOpen,
  Star,
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

// ═══════════════════════════════════════════════════════════════════════════
// ROLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_CATEGORIES = {
  teaching: {
    label: "Teaching Staff",
    icon: GraduationCap,
    color: "green",
    description: "Teachers, Principals, Coordinators who teach or lead academics",
    roles: [
      { value: "Principal", backendRole: "principal" },
      { value: "Vice Principal", backendRole: "principal" },
      { value: "Head Teacher", backendRole: "teacher" },
      { value: "HOD (Head of Department)", backendRole: "teacher" },
      { value: "Senior Teacher", backendRole: "teacher" },
      { value: "PGT (Post Graduate Teacher)", backendRole: "teacher" },
      { value: "TGT (Trained Graduate Teacher)", backendRole: "teacher" },
      { value: "PRT (Primary Teacher)", backendRole: "teacher" },
      { value: "Pre-Primary Teacher", backendRole: "teacher" },
      { value: "Sports Teacher", backendRole: "teacher" },
      { value: "Music Teacher", backendRole: "teacher" },
      { value: "Art Teacher", backendRole: "teacher" },
      { value: "Dance Teacher", backendRole: "teacher" },
      { value: "Substitute Teacher", backendRole: "teacher" },
      { value: "Guest Faculty", backendRole: "teacher" },
    ],
  },
  administrative: {
    label: "Administrative Staff",
    icon: Briefcase,
    color: "purple",
    description: "Office staff, coordinators, and administrators",
    roles: [
      { value: "Administrator", backendRole: "admin" },
      { value: "Academic Coordinator", backendRole: "admin" },
      { value: "Exam Coordinator", backendRole: "admin" },
      { value: "Office Manager", backendRole: "admin" },
      { value: "Clerk", backendRole: "non_teaching" },
      { value: "Accountant", backendRole: "non_teaching" },
      { value: "Receptionist", backendRole: "non_teaching" },
      { value: "Librarian", backendRole: "non_teaching" },
      { value: "Registrar", backendRole: "admin" },
    ],
  },
  support: {
    label: "Support Staff",
    icon: Wrench,
    color: "orange",
    description: "Non-teaching support: peon, security, drivers, etc.",
    roles: [
      { value: "Peon", backendRole: "non_teaching" },
      { value: "Security Guard", backendRole: "non_teaching" },
      { value: "Driver", backendRole: "non_teaching" },
      { value: "Bus Conductor", backendRole: "non_teaching" },
      { value: "Cleaner", backendRole: "non_teaching" },
      { value: "Cook", backendRole: "non_teaching" },
      { value: "Gardener", backendRole: "non_teaching" },
      { value: "Lab Assistant", backendRole: "non_teaching" },
      { value: "Computer Operator", backendRole: "non_teaching" },
      { value: "Nurse", backendRole: "non_teaching" },
      { value: "Helper", backendRole: "non_teaching" },
    ],
  },
};

const STAFF_TYPE_MAP: Record<string, string> = {
  teaching: "teaching",
  administrative: "management",
  support: "support",
};

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  "Permanent": "permanent",
  "Contract": "contractual",
  "Part-Time": "part_time",
  "Substitute": "part_time",
  "Guest Faculty": "guest",
  "Daily Wage": "contractual",
};

const BLOOD_GROUP_MAP: Record<string, string> = {
  "A+": "A+", "A-": "A-",
  "B+": "B+", "B-": "B-",
  "AB+": "AB+", "AB-": "AB-",
  "O+": "O+", "O-": "O-",
};

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Science",
  "English", "Hindi", "Sanskrit", "Regional Language",
  "History", "Geography", "Economics", "Political Science",
  "Computer Science", "Information Technology",
  "Physical Education", "Art", "Music", "Dance",
  "Environmental Studies", "General Knowledge", "Moral Science", "Other",
];

const CLASSES_TAUGHT = [
  "Nursery", "LKG", "UKG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11", "Class 12",
];

const SHIFTS = ["Morning", "Afternoon", "Evening", "Night", "Full Day", "Rotational"];
const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"];
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Parsi", "Jewish", "Other", "Not Specified"];
const QUALIFICATIONS = [
  "Below 10th", "10th Pass", "12th Pass", "ITI", "Diploma",
  "Graduate (BA/BSc/BCom)", "Post Graduate (MA/MSc/MCom)",
  "B.Ed", "M.Ed", "M.Phil", "Ph.D", "Professional Degree", "Other",
];
const EMPLOYMENT_TYPES = ["Permanent", "Contract", "Part-Time", "Substitute", "Guest Faculty", "Daily Wage"];
const DEPARTMENTS = [
  "Mathematics", "Science", "English", "Hindi", "Social Studies",
  "Computer Science", "Physical Education", "Arts", "Music",
  "Administration", "Accounts", "Library", "Lab", "Transport", "Maintenance", "Security", "Other",
];
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

function generateEmployeeId(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, "0");
  return `EMP${timestamp}${random}`;
}

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
  for (const key of ["items", "classes", "results", "data"]) {
    const val = r[key];
    if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
  }
  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    for (const key of ["items", "classes"]) {
      const val = d[key];
      if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
    }
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

interface FormData {
  category: string;
  designation: string;
  role: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  blood_group: string;
  aadhaar_number: string;
  category_social: string;
  religion: string;
  qualification: string;
  specialization: string;
  experience_years: string;
  previous_school: string;
  employee_id: string;
  join_date: string;
  employment_type: string;
  department: string;
  salary: string;
  pan_number: string;
  subjects: string[];
  classes_taught: string[];
  is_class_teacher: boolean;
  assigned_class: string;
  shift: string;
  duty_area: string;
  reports_to: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const INITIAL_FORM: FormData = {
  category: "", designation: "", role: "",
  first_name: "", last_name: "", date_of_birth: "", gender: "",
  phone: "", email: "", blood_group: "", aadhaar_number: "",
  category_social: "", religion: "",
  qualification: "", specialization: "", experience_years: "", previous_school: "",
  employee_id: "", join_date: "", employment_type: "Permanent",
  department: "", salary: "", pan_number: "",
  subjects: [], classes_taught: [], is_class_teacher: false, assigned_class: "",
  shift: "Full Day", duty_area: "", reports_to: "",
  address: "", city: "", state: "", pincode: "",
};

// ═══════════════════════════════════════════════════════════════════════════
// REUSABLE
// ═══════════════════════════════════════════════════════════════════════════

function FormField({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  placeholder: string;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className="inline-flex items-center gap-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs px-2 py-1 rounded-full hover:bg-blue-500/30"
            >
              {s} ✕
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border border-input rounded-md p-2 bg-background">
        {options.filter(o => !selected.includes(o)).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="text-xs px-2 py-1 rounded-full bg-muted/50 hover:bg-blue-500/20 hover:text-blue-300 transition-colors border border-transparent hover:border-blue-500/30"
          >
            + {opt}
          </button>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground">{placeholder}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AddStaffPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [tenantId, setTenantId] = useState<string>("");
  const [step, setStep] = useState<"category" | "form">("category");
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState("basic");

  useEffect(() => {
    setTenantId(findTenantId(slug));
    setForm(prev => ({
      ...prev,
      employee_id: generateEmployeeId(),
      join_date: new Date().toISOString().split("T")[0],
    }));
  }, [slug]);

  const { data: classesRaw } = useQuery({
    queryKey: ["classes-for-staff", tenantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes/`, {
        headers: getAuthHeaders(tenantId),
      });
      if (!res.ok) return { items: [] };
      return await res.json();
    },
    enabled: !!tenantId && step === "form",
  });

  const classes = useMemo(() => extractArray(classesRaw), [classesRaw]);

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }, []);

  const handleRoleSelect = (categoryKey: string, designation: string, backendRole: string) => {
    setForm(prev => ({
      ...prev,
      category: categoryKey,
      designation,
      role: backendRole,
    }));
    setStep("form");
  };

  const isTeaching = form.category === "teaching";
  const isSupport = form.category === "support";

  const sections = useMemo(() => {
    const base = [
      { id: "basic", label: "Basic Info", icon: User },
      { id: "professional", label: "Professional", icon: GraduationCap },
      { id: "employment", label: "Employment", icon: Briefcase },
    ];
    if (isTeaching) {
      base.push({ id: "teaching", label: "Teaching Assignment", icon: BookOpen });
    }
    if (isSupport) {
      base.push({ id: "duty", label: "Duty Details", icon: Wrench });
    }
    base.push({ id: "address", label: "Address", icon: FileText });
    return base;
  }, [isTeaching, isSupport]);

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      console.log("🚀 Creating staff...");
      console.log("📤 Payload:", JSON.stringify(payload, null, 2));
      const res = await fetch(`${API_BASE}/staff/`, {
        method: "POST",
        headers: getAuthHeaders(tenantId),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log("📥 Status:", res.status);
      console.log("📥 Response:", data);
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`) as Error & { response?: unknown };
        err.response = { status: res.status, data };
        throw err;
      }
      return data;
    },
    onSuccess: (response: unknown) => {
      const r = response as Record<string, unknown>;
      const data = (r?.data as Record<string, unknown>) || r;
      const staffId = data?.id as string | undefined;
      toast.success(`${form.designation} added successfully! 🎉`);
      if (staffId) {
        router.push(`/school/${slug}/staff/${staffId}`);
      } else {
        router.push(`/school/${slug}/staff`);
      }
    },
    onError: (error: unknown) => {
      console.log("❌ Staff creation error");
      const err = error as {
        response?: {
          status?: number;
          data?: {
            detail?: string | Array<{ loc?: string[]; msg?: string }>;
            error?: {
              message?: string;
              code?: string;
              details?: {
                errors?: Array<{ field?: string; message?: string; type?: string }>;
              };
            };
            message?: string;
          };
        };
      };

      const status = err?.response?.status;
      const responseData = err?.response?.data;
      console.log("Status:", status);
      console.log("Response:", JSON.stringify(responseData, null, 2));

      if (status === 401) {
        toast.error("Session expired! Redirecting to login...");
        setTimeout(() => {
          localStorage.removeItem("access_token");
          router.push(`/school/${slug}/login`);
        }, 1500);
        return;
      }

      const errorObj = responseData?.error;
      const validationErrors = errorObj?.details?.errors;

      // 🔥 Handle nested validation errors from backend
      if (validationErrors && Array.isArray(validationErrors) && validationErrors.length > 0) {
        const errorMessages = validationErrors.map(e => {
          const field = (e.field || "field").replace(/_/g, " ");
          const message = e.message?.replace("Value error, ", "") || "invalid";
          return `${field}: ${message}`;
        });
        toast.error("❌ Validation Error:\n" + errorMessages.join("\n"), { duration: 10000 });

        // Set field-level errors
        const fieldErrors: Record<string, string> = {};
        validationErrors.forEach(e => {
          if (e.field) fieldErrors[e.field] = e.message?.replace("Value error, ", "") || "Invalid";
        });
        setErrors(prev => ({ ...prev, ...fieldErrors }));

        // Jump to tab with error
        const firstErrorField = validationErrors[0]?.field;
        if (firstErrorField) {
          if (["first_name", "last_name", "date_of_birth", "gender", "phone", "email", "aadhaar_number", "blood_group"].includes(firstErrorField)) {
            setActiveSection("basic");
          } else if (["employee_id", "joining_date", "pan_number", "employment_type"].includes(firstErrorField)) {
            setActiveSection("employment");
          } else if (["address_line1", "city", "state", "pincode"].includes(firstErrorField)) {
            setActiveSection("address");
          }
        }
        return;
      }

      // Fallback error handling
      let msg = "Failed to add staff. ";
      const detail = responseData?.detail;
      if (errorObj?.message) msg = errorObj.message;
      else if (typeof detail === "string") msg = detail;
      else if (Array.isArray(detail)) msg = detail.map(e => `${e.loc?.slice(1).join(".")}: ${e.msg}`).join(", ");
      else if (responseData?.message) msg = responseData.message;

      const lowerMsg = msg.toLowerCase();
      if (status === 409 || lowerMsg.includes("duplicate") || lowerMsg.includes("already exists")) {
        if (lowerMsg.includes("phone")) msg = "❌ Phone number already registered. Use a different one.";
        else if (lowerMsg.includes("employee_id")) {
          msg = "❌ Employee ID exists. Auto-generating new one...";
          setTimeout(() => updateField("employee_id", generateEmployeeId()), 500);
        } else if (lowerMsg.includes("email")) msg = "❌ Email already registered.";
      } else if (status === 500) {
        msg = "❌ Server error. Try changing phone number or Employee ID.";
        setTimeout(() => updateField("employee_id", generateEmployeeId()), 500);
      }

      toast.error(msg, { duration: 10000 });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.first_name.trim()) newErrors.first_name = "Required";
    if (!form.last_name.trim()) newErrors.last_name = "Required";
    if (!form.date_of_birth) newErrors.date_of_birth = "Required";
    if (!form.gender) newErrors.gender = "Required";
    if (!form.phone) newErrors.phone = "Required";
    else if (!/^[6-9]\d{9}$/.test(form.phone)) newErrors.phone = "Must be 10 digits starting with 6, 7, 8, or 9";
    if (!form.employee_id.trim()) newErrors.employee_id = "Required";
    if (!form.join_date) newErrors.join_date = "Required";
    if (!form.address) newErrors.address = "Required";
    if (!form.city) newErrors.city = "Required";
    if (!form.state) newErrors.state = "Required";
    if (!form.pincode) newErrors.pincode = "Required";
    else if (!/^\d{6}$/.test(form.pincode)) newErrors.pincode = "6 digits";

    if (form.aadhaar_number && !/^\d{12}$/.test(form.aadhaar_number)) {
      newErrors.aadhaar_number = "12 digits";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email";
    }
    if (form.pan_number && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan_number.toUpperCase())) {
      newErrors.pan_number = "Format: ABCDE1234F";
    }

    if (isTeaching && form.subjects.length === 0) {
      newErrors.subjects = "Select at least one subject";
    }

    return newErrors;
  };

  const handleSubmit = () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      for (const sec of sections) {
        const hasError = Object.keys(newErrors).some(f => {
          if (sec.id === "basic") return ["first_name", "last_name", "date_of_birth", "gender", "phone", "email", "aadhaar_number"].includes(f);
          if (sec.id === "employment") return ["employee_id", "join_date", "pan_number"].includes(f);
          if (sec.id === "teaching") return ["subjects"].includes(f);
          if (sec.id === "address") return ["address", "city", "state", "pincode"].includes(f);
          return false;
        });
        if (hasError) {
          setActiveSection(sec.id);
          break;
        }
      }
      toast.error("Please fill all required fields correctly");
      return;
    }

    const extras: Record<string, unknown> = {
      category: form.category,
      designation: form.designation,
      role: form.role,
      department_name: form.department || undefined,
      pan_number: form.pan_number ? form.pan_number.toUpperCase() : undefined,
    };

    if (isTeaching) {
      extras.subjects = form.subjects.join(", ");
      extras.classes_taught = form.classes_taught.join(", ");
      extras.is_class_teacher = form.is_class_teacher;
      if (form.is_class_teacher) extras.assigned_class = form.assigned_class;
    }

    if (isSupport) {
      extras.shift = form.shift;
      extras.duty_area = form.duty_area || undefined;
      extras.reports_to = form.reports_to || undefined;
    }

    Object.keys(extras).forEach(k => {
      if (extras[k] === undefined || extras[k] === "") delete extras[k];
    });

    const payload: Record<string, unknown> = {
      first_name: form.first_name.trim(),
      phone: form.phone,
      employee_id: form.employee_id.trim().toUpperCase(),
      staff_type: STAFF_TYPE_MAP[form.category] || "teaching",
      last_name: form.last_name.trim() || null,
      date_of_birth: form.date_of_birth,
      gender: form.gender.toLowerCase(),
      employment_type: EMPLOYMENT_TYPE_MAP[form.employment_type] || "permanent",
      joining_date: form.join_date,
      extras,
    };

    if (form.email) payload.email = form.email;
    if (form.address) payload.address_line1 = form.address;
    if (form.city) payload.city = form.city;
    if (form.state) payload.state = form.state;
    if (form.pincode) payload.pincode = form.pincode;
    if (form.aadhaar_number) payload.aadhaar_number = form.aadhaar_number;
    if (form.pan_number) payload.pan_number = form.pan_number.toUpperCase();

    if (form.qualification) payload.highest_qualification = form.qualification;
    if (form.specialization) payload.specialization = form.specialization;
    if (form.experience_years) payload.experience_years = parseInt(form.experience_years) || 0;

    if (form.salary) payload.basic_salary = parseFloat(form.salary) || 0;

    if (form.blood_group) {
      payload.blood_group = BLOOD_GROUP_MAP[form.blood_group] || form.blood_group;
    }

    createMutation.mutate(payload);
  };

  if (step === "category") {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href={`/school/${slug}/staff`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-400" />
              Add New Staff Member
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              First, select the staff category and specific role
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(ROLE_CATEGORIES).map(([key, cat]) => {
            const Icon = cat.icon;
            const colors: Record<string, string> = {
              green: "from-green-500/10 to-green-600/5 border-green-500/30 hover:border-green-500/60",
              purple: "from-purple-500/10 to-purple-600/5 border-purple-500/30 hover:border-purple-500/60",
              orange: "from-orange-500/10 to-orange-600/5 border-orange-500/30 hover:border-orange-500/60",
            };
            const iconColors: Record<string, string> = {
              green: "text-green-400",
              purple: "text-purple-400",
              orange: "text-orange-400",
            };
            return (
              <div
                key={key}
                className={`bg-gradient-to-br ${colors[cat.color]} border rounded-xl p-5 transition-all`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-card ${iconColors[cat.color]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg">{cat.label}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {cat.description}
                </p>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
                  {cat.roles.map(r => (
                    <button
                      key={r.value}
                      onClick={() => handleRoleSelect(key, r.value, r.backendRole)}
                      className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg hover:bg-blue-500/10 transition-colors group"
                    >
                      <span className="text-sm">{r.value}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
          <p className="text-blue-300">
            💡 <strong>Tip:</strong> Phone number must start with 6, 7, 8, or 9 (Indian mobile format).
          </p>
        </div>
      </div>
    );
  }

  const categoryData = ROLE_CATEGORIES[form.category as keyof typeof ROLE_CATEGORIES];
  const CategoryIcon = categoryData.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setStep("category")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Change Role
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CategoryIcon className="w-6 h-6 text-blue-400" />
              Add {form.designation}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {categoryData.label} • Fill all required fields
            </p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="gap-2 bg-green-600 hover:bg-green-700 px-6 h-11"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save {form.designation}
            </>
          )}
        </Button>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {sections.map(sec => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                  ${isActive ? "border-blue-500 text-blue-400" : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-600"}`}
              >
                <Icon className="w-4 h-4" />
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {activeSection === "basic" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="First Name" required>
                <Input value={form.first_name} onChange={e => updateField("first_name", e.target.value)} placeholder="e.g. Rajesh" className={errors.first_name ? "border-red-500" : ""} />
              </FormField>
              <FormField label="Last Name" required>
                <Input value={form.last_name} onChange={e => updateField("last_name", e.target.value)} placeholder="e.g. Kumar" className={errors.last_name ? "border-red-500" : ""} />
              </FormField>
              <FormField label="Date of Birth" required>
                <Input type="date" max={new Date().toISOString().split("T")[0]} value={form.date_of_birth} onChange={e => updateField("date_of_birth", e.target.value)} className={errors.date_of_birth ? "border-red-500" : ""} />
              </FormField>
              <FormField label="Gender" required>
                <Select value={form.gender} onValueChange={val => updateField("gender", val)}>
                  <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Mobile Number" required hint="Must start with 6, 7, 8, or 9 (Indian mobile format)">
                <Input value={form.phone} maxLength={10} onChange={e => updateField("phone", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 9876543210" className={errors.phone ? "border-red-500" : ""} />
                {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
              </FormField>
              <FormField label="Email">
                <Input type="email" value={form.email} onChange={e => updateField("email", e.target.value)} placeholder="staff@email.com" className={errors.email ? "border-red-500" : ""} />
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
              </FormField>
              <FormField label="Blood Group">
                <Select value={form.blood_group} onValueChange={val => updateField("blood_group", val)}>
                  <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                  <SelectContent>{BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Aadhaar Number">
                <Input value={form.aadhaar_number} maxLength={12} onChange={e => updateField("aadhaar_number", e.target.value.replace(/\D/g, ""))} placeholder="12-digit" className={errors.aadhaar_number ? "border-red-500" : ""} />
                {errors.aadhaar_number && <p className="text-xs text-red-400 mt-1">{errors.aadhaar_number}</p>}
              </FormField>
              <FormField label="Social Category">
                <Select value={form.category_social} onValueChange={val => updateField("category_social", val)}>
                  <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Religion">
                <Select value={form.religion} onValueChange={val => updateField("religion", val)}>
                  <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                  <SelectContent>{RELIGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>
          </div>
        )}

        {activeSection === "professional" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-400" />
              Qualifications & Experience
            </h3>
            <div className="bg-muted/30 border border-border rounded-lg px-4 py-3 mb-4">
              <p className="text-sm">
                <span className="text-muted-foreground">Selected Role:</span>{" "}
                <span className="font-semibold text-blue-400">{form.designation}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="Highest Qualification" hint={isSupport ? "Recommended even for support staff" : ""}>
                <Select value={form.qualification} onValueChange={val => updateField("qualification", val)}>
                  <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                  <SelectContent>{QUALIFICATIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Specialization" hint={isTeaching ? "e.g. Mathematics, Physics" : "Skill/Trade"}>
                <Input value={form.specialization} onChange={e => updateField("specialization", e.target.value)} placeholder={isTeaching ? "e.g. Mathematics" : "e.g. Electrician"} />
              </FormField>
              <FormField label="Experience (Years)">
                <Input value={form.experience_years} onChange={e => updateField("experience_years", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 5" />
              </FormField>
              <FormField label={isTeaching ? "Previous School" : "Previous Employer"}>
                <Input value={form.previous_school} onChange={e => updateField("previous_school", e.target.value)} placeholder="Name of previous organization" />
              </FormField>
            </div>
          </div>
        )}

        {activeSection === "employment" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-400" />
              Employment Details
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="Employee ID" required hint="Auto-generated. Click 🔄 to regenerate">
                <div className="flex gap-2">
                  <Input
                    value={form.employee_id}
                    onChange={e => updateField("employee_id", e.target.value.toUpperCase())}
                    placeholder="e.g. EMP001"
                    className={errors.employee_id ? "border-red-500 flex-1" : "flex-1"}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateField("employee_id", generateEmployeeId())}
                    title="Generate new ID"
                  >
                    🔄
                  </Button>
                </div>
              </FormField>
              <FormField label="Joining Date" required>
                <Input type="date" value={form.join_date} onChange={e => updateField("join_date", e.target.value)} className={errors.join_date ? "border-red-500" : ""} />
              </FormField>
              <FormField label="Employment Type" required>
                <Select value={form.employment_type} onValueChange={val => updateField("employment_type", val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Department">
                <Select value={form.department} onValueChange={val => updateField("department", val)}>
                  <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Monthly Salary (₹)">
                <Input value={form.salary} onChange={e => updateField("salary", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 35000" />
              </FormField>
              <FormField label="PAN Number">
                <Input value={form.pan_number} maxLength={10} onChange={e => updateField("pan_number", e.target.value.toUpperCase())} placeholder="ABCDE1234F" className={errors.pan_number ? "border-red-500" : ""} />
                {errors.pan_number && <p className="text-xs text-red-400 mt-1">{errors.pan_number}</p>}
              </FormField>
            </div>
          </div>
        )}

        {activeSection === "teaching" && isTeaching && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Teaching Assignment
            </h3>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-300">
              📚 <strong>Assign subjects and classes this teacher will teach.</strong> Also mark if they are a class teacher.
            </div>

            <FormField label="Subjects Taught" required>
              <MultiSelect
                options={SUBJECTS}
                selected={form.subjects}
                onChange={(vals) => updateField("subjects", vals)}
                placeholder="Click subjects to add them"
              />
              {errors.subjects && <p className="text-xs text-red-400 mt-1">{errors.subjects}</p>}
            </FormField>

            <FormField label="Classes Taught" hint="Select all classes this teacher teaches">
              <MultiSelect
                options={CLASSES_TAUGHT}
                selected={form.classes_taught}
                onChange={(vals) => updateField("classes_taught", vals)}
                placeholder="Click classes to add them"
              />
            </FormField>

            <div className="border-t border-border pt-5">
              <div className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    Assign as Class Teacher?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Class teacher is responsible for a specific class
                  </p>
                </div>
                <ToggleSwitch checked={form.is_class_teacher} onChange={val => updateField("is_class_teacher", val)} />
              </div>

              {form.is_class_teacher && (
                <div className="mt-4">
                  <FormField label="Assigned Class" required={form.is_class_teacher}>
                    {classes.length > 0 ? (
                      <select
                        value={form.assigned_class}
                        onChange={(e) => updateField("assigned_class", e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select Class --</option>
                        {classes.map((cls) => (
                          <option key={String(cls.id)} value={String(cls.name)}>
                            {String(cls.name)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={form.assigned_class}
                        onChange={e => updateField("assigned_class", e.target.value)}
                        placeholder="e.g. Class 10-A"
                      />
                    )}
                  </FormField>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "duty" && isSupport && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-400" />
              Duty & Shift Details
            </h3>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-sm text-orange-300">
              🛠️ <strong>Set duty area, shift timings, and reporting manager for support staff.</strong>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="Shift">
                <Select value={form.shift} onValueChange={val => updateField("shift", val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Duty Area / Location" hint="Where they will work">
                <Input value={form.duty_area} onChange={e => updateField("duty_area", e.target.value)} placeholder="e.g. Main Gate, Ground Floor, Bus Route 3" />
              </FormField>
              <div className="col-span-2">
                <FormField label="Reports To" hint="Name/designation of supervisor">
                  <Input value={form.reports_to} onChange={e => updateField("reports_to", e.target.value)} placeholder="e.g. Office Manager, Principal" />
                </FormField>
              </div>
            </div>
          </div>
        )}

        {activeSection === "address" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Address Details
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <div className="col-span-2">
                <FormField label="Full Address" required>
                  <Input value={form.address} onChange={e => updateField("address", e.target.value)} placeholder="House no., Street, Locality" className={errors.address ? "border-red-500" : ""} />
                </FormField>
              </div>
              <FormField label="City" required>
                <Input value={form.city} onChange={e => updateField("city", e.target.value)} placeholder="e.g. Jaipur" className={errors.city ? "border-red-500" : ""} />
              </FormField>
              <FormField label="State" required>
                <Select value={form.state} onValueChange={val => updateField("state", val)}>
                  <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Pincode" required>
                <Input value={form.pincode} maxLength={6} onChange={e => updateField("pincode", e.target.value.replace(/\D/g, ""))} placeholder="6-digit" className={errors.pincode ? "border-red-500" : ""} />
                {errors.pincode && <p className="text-xs text-red-400 mt-1">{errors.pincode}</p>}
              </FormField>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-6 py-4">
        <div className="text-sm text-muted-foreground">
          Fill all required fields, then click Save
        </div>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="gap-2 bg-green-600 hover:bg-green-700 px-8"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Save {form.designation}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}