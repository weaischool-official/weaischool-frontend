"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  GraduationCap,
  Calendar,
  ExternalLink,
  Copy,
  Edit,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Crown,
} from "lucide-react";
import Link from "next/link";

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const schoolId = params.id as string;

  const { data: school, isLoading, isError } = useQuery({
    queryKey: ["school", schoolId],
    queryFn: () => tenantApi.get(schoolId).then((r) => r.data),
    enabled: !!schoolId,
  });

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: () => tenantApi.updateStatus(schoolId, "suspended"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast.success("School suspended! ⛔");
    },
    onError: () => toast.error("Suspend failed!"),
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: () => tenantApi.updateStatus(schoolId, "active"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast.success("School activated! ✅");
    },
    onError: () => toast.error("Activate failed!"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => tenantApi.delete(schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast.success("School deleted! 🗑️");
      router.push("/schools");
    },
    onError: () => toast.error("Delete failed!"),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied! 📋");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="mt-4 text-gray-400">Loading school details...</p>
      </div>
    );
  }

  if (isError || !school) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="p-8 bg-red-500/10 border border-red-500/30 rounded-2xl">
          <p className="text-red-400 text-lg font-semibold mb-4">
            School not found!
          </p>
          <Link
            href="/schools"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Schools
          </Link>
        </div>
      </div>
    );
  }

  const status = (school.status || "active").toUpperCase();
  const plan = (school.plan || "trial").toUpperCase();
  const schoolUrl = `${school.slug}.weaischool.com`;
  // ✅ FIXED: /dashboard added — will open school admin panel directly!
  const adminPanelUrl = `/school/${school.slug}/dashboard`;

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-400 border-green-500/30",
    TRIAL: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    SUSPENDED: "bg-red-500/10 text-red-400 border-red-500/30",
    EXPIRED: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  };

  const planColors: Record<string, string> = {
    TRIAL: "bg-yellow-500/10 text-yellow-400",
    STARTER: "bg-blue-500/10 text-blue-400",
    GROWTH: "bg-purple-500/10 text-purple-400",
    ENTERPRISE: "bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/schools"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Schools
      </Link>

      {/* Header Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left */}
          <div className="flex items-start gap-4">
            <div className="p-4 bg-blue-500/10 rounded-2xl">
              <Building2 className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {school.school_name}
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {school.school_code} • {school.slug}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    statusColors[status] || statusColors.ACTIVE
                  }`}
                >
                  {status}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    planColors[plan] || planColors.TRIAL
                  }`}
                >
                  <Crown className="w-3 h-3 inline mr-1" />
                  {plan}
                </span>
              </div>
            </div>
          </div>

          {/* Right — ACTION BUTTONS */}
          <div className="flex flex-wrap gap-3">
            {/* ⭐ VISIT SCHOOL — Main Action */}
            <Link
              href={adminPanelUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              <ExternalLink className="w-4 h-4" />
              Visit School Panel
            </Link>

            {/* Edit */}
            <Link
              href={`/schools/${schoolId}/edit`}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-all"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>

            {/* Suspend / Activate */}
            {status === "ACTIVE" || status === "TRIAL" ? (
              <button
                onClick={() => {
                  if (confirm("Kya aap sach mein suspend karna chahte ho?")) {
                    suspendMutation.mutate();
                  }
                }}
                disabled={suspendMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
              >
                <ShieldAlert className="w-4 h-4" />
                Suspend
              </button>
            ) : (
              <button
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                Activate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <GraduationCap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-gray-400">Students</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Max: {school.max_students || 500}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-gray-400">Staff</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Max: {school.max_staff || 50}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Crown className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{plan}</p>
              <p className="text-xs text-gray-400">Plan</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {school.created_at
                  ? new Date(school.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "N/A"}
              </p>
              <p className="text-xs text-gray-400">Registered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            📞 Contact Info
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">{school.email || "N/A"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">{school.phone || "N/A"}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">
                {[school.city, school.state].filter(Boolean).join(", ") ||
                  "N/A"}
              </span>
            </div>
            {school.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                <span className="text-gray-300">{school.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* URLs */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🔗 URLs</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">School Panel URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-blue-400 text-sm">
                  {schoolUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(schoolUrl)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Board Type</p>
              <p className="text-gray-300 font-semibold">
                {school.board_type || "CBSE"}
              </p>
            </div>
            {school.pincode && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Pincode</p>
                <p className="text-gray-300 font-semibold">{school.pincode}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visit School — Big CTA */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-2">
          🏫 School Admin Panel
        </h3>
        <p className="text-gray-400 mb-6">
          Yahan se students, staff, fees, attendance — sab manage karo
        </p>
        <Link
          href={adminPanelUrl}
          className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 text-lg"
        >
          <ExternalLink className="w-5 h-5" />
          Open School Admin Panel
        </Link>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-4">
          ⚠️ Danger Zone
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          School delete karne se saara data permanently remove ho jayega.
        </p>
        <button
          onClick={() => {
            if (
              confirm(
                "⚠️ FINAL WARNING: Kya aap sach mein ye school DELETE karna chahte ho? YE UNDO NAHI HO SAKTA!"
              )
            ) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4" />
          {deleteMutation.isPending ? "Deleting..." : "Delete School"}
        </button>
      </div>
    </div>
  );
}