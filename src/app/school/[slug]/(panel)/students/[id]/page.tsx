"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Printer,
  Clock,
} from "lucide-react";
import {
  getUdiseCompliance,
  formatDate,
  formatStatus,
  getInitials,
  getAvatarColor,
} from "@/lib/studentHelpers";
import { getComplianceColors } from "@/lib/udiseConfig";
import StudentFormTabs from "@/components/school/students/StudentFormTabs";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const slug = params?.slug as string;
  const studentId = params?.id as string;

  // ── Fetch student ──
  const {
    data: student,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => studentApi.get(studentId).then((r) => r.data),
    enabled: !!studentId,
  });

  // ── Update mutation ──
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      studentApi.update(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update");
      throw err;
    },
  });

  // ── Delete student mutation ──
  const deleteMutation = useMutation({
    mutationFn: () => studentApi.delete(studentId),
    onSuccess: () => {
      toast.success("Student deleted");
      router.push(`/school/${slug}/students`);
    },
    onError: () => toast.error("Failed to delete"),
  });

  // ── Photo upload mutation ──
  const photoMutation = useMutation({
    mutationFn: (file: File) => studentApi.uploadPhoto(studentId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Photo uploaded!");
    },
    onError: () => toast.error("Photo upload failed"),
  });

  // ── Delete photo mutation ──
  const deletePhotoMutation = useMutation({
    mutationFn: () => studentApi.deletePhoto(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Photo removed successfully!");
    },
    onError: () => toast.error("Failed to remove photo"),
  });

  // ── Handlers ──
  async function handleSave(updates: Record<string, unknown>) {
    await updateMutation.mutateAsync(updates);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo too large. Max 2MB limit allowed by school policy.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    photoMutation.mutate(file);
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-400">Loading student details...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !student) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">
            Student Not Found
          </h3>
          <p className="text-gray-400 mb-4">
            The student you&apos;re looking for doesn&apos;t exist or was deleted.
          </p>
          <Link
            href={`/school/${slug}/students`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </Link>
        </div>
      </div>
    );
  }

  const compliance = getUdiseCompliance(student);
  const complianceColors = getComplianceColors(compliance.status);
  const status = formatStatus(student.status);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ─── BACK LINK ─── */}
      <Link
        href={`/school/${slug}/students`}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Students
      </Link>

      {/* ─── HEADER CARD ─── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Photo with upload */}
            <div className="relative group">
              {student.photo_url ? (
                <img
                  src={student.photo_url.startsWith("http") ? student.photo_url : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://127.0.0.1:8000"}${student.photo_url}`}
                  alt={student.full_name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-gray-800"
                />
              ) : (
                <div
                  className={`w-24 h-24 rounded-2xl flex items-center justify-center text-white font-bold text-3xl border-4 border-gray-800 ${getAvatarColor(
                    student.full_name
                  )}`}
                >
                  {getInitials(student.full_name)}
                </div>
              )}
              <label className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {photoMutation.isPending ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white">
                {student.full_name}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-gray-400 font-mono">
                  {student.admission_number}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}
                >
                  {status.label}
                </span>
                {student.age !== null && student.age !== undefined && (
                  <span className="text-sm text-gray-500">
                    {student.age} years old
                  </span>
                )}
                {student.roll_number && (
                  <span className="text-sm text-gray-500">
                    Roll #{student.roll_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            
            {/* Remove Photo Action */}
            {student.photo_url && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this student's photo?")) {
                    deletePhotoMutation.mutate();
                  }
                }}
                disabled={deletePhotoMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-sm transition-colors disabled:opacity-40"
              >
                {deletePhotoMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remove Photo
              </button>
            )}

            <button
              onClick={() => {
                if (
                  confirm(
                    `Delete ${student.full_name}? This will remove all data.`
                  )
                ) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* ─── UDISE COMPLIANCE BAR ─── */}
        <div
          className={`mt-6 p-4 rounded-xl border ${complianceColors.bg} ${complianceColors.border}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {compliance.status === "complete" ? (
                <CheckCircle2 className={`w-6 h-6 ${complianceColors.text}`} />
              ) : (
                <AlertCircle className={`w-6 h-6 ${complianceColors.text}`} />
              )}
              <div>
                <h3 className={`text-lg font-bold ${complianceColors.text}`}>
                  UDISE Compliance: {complianceColors.label}
                </h3>
                <p className="text-xs text-gray-400">
                  {compliance.filledFields} of {compliance.totalFields}{" "}
                  important fields filled
                </p>
              </div>
            </div>
            <span className={`text-3xl font-bold ${complianceColors.text}`}>
              {compliance.percentage}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${complianceColors.bar}`}
              style={{ width: `${compliance.percentage}%` }}
            />
          </div>

          {/* Validation errors */}
          {compliance.validationErrors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-red-500/30">
              <p className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Validation Issues ({compliance.validationErrors.length}):
              </p>
              <ul className="text-xs text-red-300 space-y-0.5 list-disc list-inside">
                {compliance.validationErrors.map((err, i) => (
                  <li key={i}>
                    <strong>{err.label}:</strong> {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Category-wise quick preview */}
          <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 md:grid-cols-5 gap-2">
            {compliance.categoryResults.map((cat) => (
              <div
                key={cat.categoryId}
                className="bg-gray-900/50 rounded-lg p-2 text-center"
              >
                <p className="text-xs text-gray-400 mb-1">
                  {cat.icon} {cat.categoryName.split(" ")[0]}
                </p>
                <p
                  className={`text-lg font-bold ${
                    cat.percentage >= 90
                      ? "text-green-400"
                      : cat.percentage >= 70
                      ? "text-blue-400"
                      : cat.percentage >= 40
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {cat.percentage}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TABBED FORM (Main UDISE Sections) ─── */}
      <StudentFormTabs
        student={student}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />

      {/* ─── ADMISSION & TIMELINE INFO ─── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-400" />
          Admission & Timeline
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase mb-1">Admission #</p>
            <p className="text-white font-mono">{student.admission_number}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase mb-1">
              Admission Date
            </p>
            <p className="text-white">{formatDate(student.admission_date)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase mb-1">Created</p>
            <p className="text-white">{formatDate(student.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase mb-1">Last Updated</p>
            <p className="text-white">{formatDate(student.updated_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}