"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Loader2,
  Briefcase,
  Phone,
  Mail,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & HELPERS
// ═══════════════════════════════════════════════════════════════════════════

interface Staff {
  id: string;
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  designation?: string;
  email?: string;
  phone?: string;
  profile_photo_url?: string;
  extras?: Record<string, unknown>;
  [key: string]: unknown;
}

function extractArray(data: unknown): Array<Record<string, unknown>> {
  if (!data) return [];
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  const r = data as Record<string, unknown>;
  for (const key of ["items", "staff", "users", "results", "data"]) {
    const val = r[key];
    if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function StaffListPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [search, setSearch] = useState("");

  const { data: staffRaw, isLoading } = useQuery({
    queryKey: ["staff-list", slug],
    queryFn: async () => {
      // Backend automatically attaches X-Tenant-ID via interceptors
      const res = await api.get("/staff", { params: { per_page: 100 } });
      return res.data;
    },
  });

  const allStaff = useMemo(() => extractArray(staffRaw) as Staff[], [staffRaw]);

  // Filtering Logic
  const filteredStaff = useMemo(() => {
    return allStaff.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
        const empId = String(s.employee_id || "").toLowerCase();
        const email = String(s.email || "").toLowerCase();
        const phone = String(s.phone || "").toLowerCase();
        
        // extras me designation ya subject ho sakta hai
        const extras = (s.extras as Record<string, unknown>) || {};
        const desig = String(s.designation || extras.designation || "").toLowerCase();
        
        if (!name.includes(q) && !empId.includes(q) && !email.includes(q) && !phone.includes(q) && !desig.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allStaff, search]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Users className="w-6 h-6 text-blue-500" />
            Staff Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Total Staff Members: {allStaff.length}
          </p>
        </div>
        <Link href={`/school/${slug}/staff/new`}>
          <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Teacher / Staff
          </Button>
        </Link>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-gray-900 border-gray-800"
          />
        </div>
      </div>

      {/* LIST */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="mt-3 text-muted-foreground text-sm">Loading staff list...</span>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center bg-card">
          <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {allStaff.length === 0 ? "No Staff Yet" : "No Results Found"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {allStaff.length === 0
              ? "Start by adding your first teacher or staff member."
              : "Try adjusting your search query."}
          </p>
          {allStaff.length === 0 && (
            <Link href={`/school/${slug}/staff/new`}>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Add First Teacher
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function StaffCard({
  staff,
  onClick,
}: {
  staff: Staff;
  onClick: () => void;
}) {
  // Extracting data safely
  const extras = (staff.extras as Record<string, unknown>) || {};
  const firstName = staff.first_name || "";
  const lastName = staff.last_name && staff.last_name !== "." ? staff.last_name : "";
  const fullName = `${firstName} ${lastName}`.trim() || "Unknown";
  
  const initials = fullName.substring(0, 2).toUpperCase();
  const designation = String(staff.designation || extras.designation || "Teacher");
  const subject = String(extras.subjects || "");

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-blue-500/50 hover:shadow-lg transition-all group"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {staff.profile_photo_url ? (
          <img
            src={staff.profile_photo_url}
            alt={fullName}
            className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/30"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-base truncate group-hover:text-blue-400 transition-colors">
            {fullName}
          </h4>
          {staff.employee_id && (
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: {String(staff.employee_id)}
            </p>
          )}
          <div className="mt-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Briefcase className="w-3 h-3" />
              {designation}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 pt-3 border-t border-border">
        {subject && (
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs">
              <span className="text-muted-foreground">Subject:</span>{" "}
              <span className="text-white font-medium">{subject}</span>
            </span>
          </div>
        )}

        {staff.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-gray-300 text-xs">{String(staff.phone)}</span>
          </div>
        )}
        
        {staff.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-gray-300 text-xs truncate">{String(staff.email)}</span>
          </div>
        )}
      </div>

      {/* View arrow */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground group-hover:text-blue-400 transition-colors">View Profile</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
      </div>
    </div>
  );
}