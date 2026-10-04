"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  User,
  Lock,
} from "lucide-react";
import Link from "next/link";

const BOARD_TYPES = ["CBSE", "ICSE", "STATE", "IB", "IGCSE"];
const PLANS = [
  { value: "trial", label: "Trial (30 days FREE)" },
  { value: "starter", label: "Starter (₹4,999/year)" },
  { value: "growth", label: "Growth (₹9,999/year)" },
  { value: "enterprise", label: "Enterprise (₹49,999/year)" },
];
const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Chandigarh", "Puducherry",
];

export default function NewSchoolPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    // School Info
    school_name: "",
    school_code: "",
    slug: "",
    board_type: "CBSE",
    plan: "trial",
    city: "",
    state: "",
    phone: "",
    email: "",
    // Admin Info
    admin_first_name: "",
    admin_last_name: "",
    admin_email: "",
    admin_password: "",
    admin_phone: "",
  });

  // Auto-generate slug from school name
  const handleSchoolNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "");
    setForm((prev) => ({ ...prev, school_name: name, slug }));
  };

  // Auto-generate school code
  const generateSchoolCode = () => {
    const name = form.school_name.trim();
    if (!name) {
      toast.error("Pehle school name daalo!");
      return;
    }
    const code =
      name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 4) +
      Math.floor(1000 + Math.random() * 9000);
    setForm((prev) => ({ ...prev, school_code: code }));
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => tenantApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("School created successfully! 🎉");
      router.push("/schools");
    },
    onError: (err: unknown) => {
      const error = err as {
        response?: { data?: { detail?: string | Array<{ msg: string }> } };
      };
      const detail = error?.response?.data?.detail;
      if (Array.isArray(detail)) {
        toast.error(detail.map((d) => d.msg).join(", "));
      } else {
        toast.error(detail || "School create nahi ho saka!");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (form.admin_password.length < 8) {
      toast.error("Password kam se kam 8 characters ka hona chahiye!");
      return;
    }
    if (!/^\d{10}$/.test(form.phone)) {
      toast.error("Phone number 10 digits ka hona chahiye!");
      return;
    }

    createMutation.mutate(form);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/schools"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Schools
        </Link>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <School className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Add New School</h1>
            <p className="text-gray-400 text-sm mt-1">
              Naya school platform pe register karo
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* School Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <School className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              School Information
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
                onChange={(e) => handleSchoolNameChange(e.target.value)}
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
              <div className="flex gap-2">
                <input
                  name="school_code"
                  value={form.school_code}
                  onChange={handleChange}
                  required
                  placeholder="STM001"
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={generateSchoolCode}
                  className="px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-sm font-medium transition-all"
                >
                  Auto
                </button>
              </div>
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

            {/* Plan */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Plan <span className="text-red-400">*</span>
              </label>
              <select
                name="plan"
                value={form.plan}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {PLANS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                <MapPin className="w-4 h-4 inline mr-1" />
                City <span className="text-red-400">*</span>
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                placeholder="Bangalore"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* State */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                State <span className="text-red-400">*</span>
              </label>
              <select
                name="state"
                value={form.state}
                onChange={handleChange}
                required
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

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                <Phone className="w-4 h-4 inline mr-1" />
                School Phone <span className="text-red-400">*</span>
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="9100000000"
                maxLength={10}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <p className="text-xs text-gray-500">10 digits only, no +91</p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                <Mail className="w-4 h-4 inline mr-1" />
                School Email <span className="text-red-400">*</span>
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
          </div>
        </div>

        {/* Admin Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <User className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                School Admin (Principal)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Ye person school panel manage karega
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* First Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                name="admin_first_name"
                value={form.admin_first_name}
                onChange={handleChange}
                required
                placeholder="Rajesh"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                name="admin_last_name"
                value={form.admin_last_name}
                onChange={handleChange}
                required
                placeholder="Kumar"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Admin Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                <Mail className="w-4 h-4 inline mr-1" />
                Admin Email <span className="text-red-400">*</span>
              </label>
              <input
                name="admin_email"
                type="email"
                value={form.admin_email}
                onChange={handleChange}
                required
                placeholder="principal@school.com"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Admin Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                <Phone className="w-4 h-4 inline mr-1" />
                Admin Phone
              </label>
              <input
                name="admin_phone"
                value={form.admin_phone}
                onChange={handleChange}
                placeholder="9100000000"
                maxLength={10}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Password */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-300">
                <Lock className="w-4 h-4 inline mr-1" />
                Admin Password <span className="text-red-400">*</span>
              </label>
              <input
                name="admin_password"
                type="text"
                value={form.admin_password}
                onChange={handleChange}
                required
                minLength={8}
                placeholder="Strong@Password123"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
              />
              <p className="text-xs text-gray-500">
                Kam se kam 8 characters (letters + numbers + symbol)
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating School...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Create School
              </>
            )}
          </button>

          <Link
            href="/schools"
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold rounded-xl transition-all"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}