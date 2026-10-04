// ============================================================
// STUDENT HELPERS
// Data completeness, missing fields detection, formatters
// UDISE+ compliant
// ============================================================

import {
  calculateUdiseCompliance,
  getComplianceColors,
  type ComplianceResult,
} from "./udiseConfig";

export interface StudentData {
  id?: string;
  admission_number?: string;
  roll_number?: string | null;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  gender?: string | null;
  blood_group?: string | null;
  religion?: string | null;
  category?: string | null;
  nationality?: string | null;
  mother_tongue?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  aadhaar_number?: string | null;
  apaar_id?: string | null;
  current_section_id?: string | null;
  admission_date?: string | null;
  admission_class_id?: string | null;
  status?: string;
  photo_url?: string | null;
  medical_conditions?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  uses_transport?: boolean;
  transport_route?: string | null;
  pickup_point?: string | null;
  fee_category?: string;
  extras?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ─── UDISE COMPLIANCE (uses udiseConfig) ────────────────────

export function calculateCompleteness(student: StudentData): {
  percentage: number;
  filled: number;
  total: number;
  status: "complete" | "good" | "incomplete" | "critical";
} {
  const result = calculateUdiseCompliance(student as Record<string, unknown>);

  let status: "complete" | "good" | "incomplete" | "critical";
  if (result.percentage >= 90) status = "complete";
  else if (result.percentage >= 70) status = "good";
  else if (result.percentage >= 40) status = "incomplete";
  else status = "critical";

  return {
    percentage: result.percentage,
    filled: result.filledFields,
    total: result.totalFields,
    status,
  };
}

export function getUdiseCompliance(student: StudentData): ComplianceResult {
  return calculateUdiseCompliance(student as Record<string, unknown>);
}

export function getMissingFields(student: StudentData): Array<{
  key: string;
  label: string;
  category: string;
}> {
  const result = calculateUdiseCompliance(student as Record<string, unknown>);
  const missing: Array<{ key: string; label: string; category: string }> = [];

  result.categoryResults.forEach((cat) => {
    cat.missingFields.forEach((label) => {
      missing.push({
        key: label.toLowerCase().replace(/\s+/g, "_"),
        label,
        category: cat.categoryName,
      });
    });
  });

  return missing;
}

export function getMissingByCategory(
  student: StudentData
): Record<string, string[]> {
  const result = calculateUdiseCompliance(student as Record<string, unknown>);
  const grouped: Record<string, string[]> = {};

  result.categoryResults.forEach((cat) => {
    if (cat.missingFields.length > 0) {
      grouped[cat.categoryName] = cat.missingFields;
    }
  });

  return grouped;
}

export function getValidationErrors(student: StudentData): Array<{
  field: string;
  label: string;
  error: string;
}> {
  const result = calculateUdiseCompliance(student as Record<string, unknown>);
  return result.validationErrors;
}

// ─── COMPLETENESS COLOR ─────────────────────────────────────

export function getCompletenessColor(percentage: number): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  let status: "complete" | "good" | "partial" | "pending";
  if (percentage >= 90) status = "complete";
  else if (percentage >= 70) status = "good";
  else if (percentage >= 40) status = "partial";
  else status = "pending";

  return getComplianceColors(status);
}

// ─── FORMAT HELPERS ─────────────────────────────────────────

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatGender(g?: string | null): string {
  if (!g) return "—";
  return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
}

export function formatStatus(s?: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    active: {
      label: "Active",
      color: "bg-green-500/10 text-green-400 border-green-500/30",
    },
    inactive: {
      label: "Inactive",
      color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    },
    transferred: {
      label: "Transferred",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    },
    graduated: {
      label: "Graduated",
      color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    },
    dropped: {
      label: "Dropped",
      color: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    },
    suspended: {
      label: "Suspended",
      color: "bg-red-500/10 text-red-400 border-red-500/30",
    },
  };
  return map[s || "active"] || map.active;
}

export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getAvatarColor(name?: string | null): string {
  if (!name) return "bg-gray-600";
  const colors = [
    "bg-red-600",
    "bg-orange-600",
    "bg-amber-600",
    "bg-yellow-600",
    "bg-lime-600",
    "bg-green-600",
    "bg-emerald-600",
    "bg-teal-600",
    "bg-cyan-600",
    "bg-sky-600",
    "bg-blue-600",
    "bg-indigo-600",
    "bg-violet-600",
    "bg-purple-600",
    "bg-fuchsia-600",
    "bg-pink-600",
    "bg-rose-600",
  ];
  const charCode = name.charCodeAt(0);
  return colors[charCode % colors.length];
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}