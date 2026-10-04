"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  School,
  MapPin,
  Phone,
  Mail,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";

const BOARD_TYPES = ["CBSE", "ICSE", "STATE", "IB", "IGCSE"];
const PLANS = ["TRIAL", "STARTER", "GROWTH", "ENTERPRISE"];
const STATUSES = ["ACTIVE", "TRIAL", "SUSPENDED", "EXPIRED"];
const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Chandigarh", "Puducherry",
];

export default function EditSchoolPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const schoolId = params.id as string;

  const [form, setForm] = useState({
    school_name: "",
    school_code: "",
    slug: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    board_type: "CBSE",
    plan: "TRIAL",
    status: "ACTIVE",
    max_students: 500,
    max_staff: 50,
    website: "",
    principal_name: "",
  });

  // Fetch school data
  const { data: school, isLoading } = useQuery({
    queryKey: ["school", schoolId],
    queryFn: () => tenantApi.get(schoolId).then((r) => r.data),
  });

  // Fill form when data loads
  useEffect(() => {
    if (school) {
      setForm({
        school_name: school.school_name || "",
        school_code: school.school_code || "",
        slug: school.slug || "",
        email: school.email || "",
        phone: school.phone || "",
        address: school.address || "",
        city: school.city || "",
        state: school.state || "",
        pincode: school.pincode || "",
        board_type: (school.board_type || "CBSE").toUpperCase(),
        plan: (school.plan || "TRIAL").toUpperCase(),
        status: (school.status || "ACTIVE").toUpperCase(),
        max_students: school.max_students || 500,
        max_staff: school.max_staff || 50,
        website: school.website || "",
        principal_name: school.principal_name || "",
      });
    }
  }, [school]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => tenantApi.update(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast.success("School updated successfully! ✅");
      router.push(`/schools/${schoolId}`);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || "Update failed!");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-400">Loading school data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/schools/${schoolId}`}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit School</h1>
          <p className="text-gray-400 text-sm mt-1">
            {school?.school_name} ka details update karo
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <School className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Basic Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* School Name */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-300">
                School Name <span className="text-red-400">*</span>
              </label>
              <input
                name="school_name"
                value={form.school_name}
                onChange={handleChange}
                required
                placeholder="St. Mary's Public School"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* School Code */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                School Code <span className="text-red-400">*</span>
              </label>
              <input
                name="school_code"
                value={form.school_code}
                onChange={handleChange}
                required
                placeholder="STM001"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                URL Slug <span className="text-red-400">*</span>
              </label>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                required
                placeholder="stmarys"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <p className="text-xs text-gray-500">
                URL: {form.slug || "yourschool"}.weaischool.com
              </p>
            </div>

            {/* Principal Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Principal Name
              </label>
              <input
                name="principal_name"
                value={form.principal_name}
                onChange={handleChange}
                placeholder="Dr. Rajesh Kumar"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Website
              </label>
              <input
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://www.stmarys.edu"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Board Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Board Type <span className="text-red-400">*</span>
              </label>
              <select
                name="board_type"
                value={form.board_type}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {BOARD_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Phone className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Contact Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                <Mail className="w-4 h-4 inline mr-1" />
                Email <span className="text-red-400">*</span>
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="info@school.com"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone <span className="text-red-400">*</span>
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="9100000000"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-300">
                <MapPin className="w-4 h-4 inline mr-1" />
                Address
              </label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={2}
                placeholder="123, MG Road, Near City Mall"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">City</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Bangalore"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* State */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">State</label>
              <select
                name="state"
                value={form.state}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Select State</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Pincode */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Pincode
              </label>
              <input
                name="pincode"
                value={form.pincode}
                onChange={handleChange}
                placeholder="560001"
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Plan & Limits */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Settings className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Plan & Settings
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Plan */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Subscription Plan
              </label>
              <select
                name="plan"
                value={form.plan}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Students */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                <Users className="w-4 h-4 inline mr-1" />
                Max Students
              </label>
              <input
                name="max_students"
                type="number"
                value={form.max_students}
                onChange={handleChange}
                min={1}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Max Staff */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                <Users className="w-4 h-4 inline mr-1" />
                Max Staff
              </label>
              <input
                name="max_staff"
                type="number"
                value={form.max_staff}
                onChange={handleChange}
                min={1}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>

          <Link
            href={`/schools/${schoolId}`}
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold rounded-xl transition-all"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}