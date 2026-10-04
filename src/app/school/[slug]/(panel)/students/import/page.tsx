"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { studentApi, sectionApi, classApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Info,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { downloadBlob } from "@/lib/studentHelpers";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface PreviewErrorRow {
  row: number;
  errors: string[];
  data: Record<string, unknown>;
}

interface PreviewResponse {
  total_rows: number;
  valid_count: number;
  error_count: number;
  file_errors: string[];
  error_rows: PreviewErrorRow[];
  preview_rows: Record<string, unknown>[];
  can_import: boolean;
}

interface ImportResultResponse {
  total_attempted: number;
  successfully_imported: number;
  failed_count: number;
  skipped_count: number;
  errors: PreviewErrorRow[];
  message: string;
}

// ─── MAIN WRAPPER (for Suspense) ─────────────────────────────────────────────

export default function ImportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <BulkImportContent />
    </Suspense>
  );
}

// ─── BULK IMPORT CONTENT ─────────────────────────────────────────────────────

function BulkImportContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;

  // URL params
  const classIdFromUrl = searchParams?.get("class_id") || "";
  const sectionIdFromUrl = searchParams?.get("section_id") || "";

  // State
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"select" | "preview" | "importing" | "done">(
    "select"
  );
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResultResponse | null>(
    null
  );
  const [classInfo, setClassInfo] = useState<{
    name: string;
    id: string;
  } | null>(null);
  const [sectionInfo, setSectionInfo] = useState<{
    name: string;
    id: string;
  } | null>(null);

  // Fetch class info
  useEffect(() => {
    async function loadInfo() {
      if (classIdFromUrl) {
        try {
          const cls = await classApi.get(classIdFromUrl);
          setClassInfo({ name: cls.data.name, id: cls.data.id });
        } catch {
          toast.error("Failed to load class info");
        }
      }
      if (sectionIdFromUrl && classIdFromUrl) {
        try {
          const secs = await sectionApi.listByClass(classIdFromUrl);
          const secList = Array.isArray(secs.data)
            ? secs.data
            : secs.data?.items || [];
          const sec = secList.find(
            (s: { id: string }) => s.id === sectionIdFromUrl
          );
          if (sec) setSectionInfo({ name: sec.name, id: sec.id });
        } catch {
          console.error("Failed to load section info");
        }
      }
    }
    loadInfo();
  }, [classIdFromUrl, sectionIdFromUrl]);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (f: File) => studentApi.bulkPreview(f),
    onSuccess: (response) => {
      setPreview(response.data);
      setStep("preview");
      if (response.data.can_import) {
        toast.success(
          `${response.data.valid_count} valid students found`
        );
      } else {
        toast.error("File has errors — please fix and re-upload");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Preview failed");
    },
  });

  // Confirm import mutation
  const confirmMutation = useMutation({
    mutationFn: (f: File) => studentApi.bulkConfirm(f),
    onSuccess: (response) => {
      setImportResult(response.data);
      setStep("done");
      if (response.data.successfully_imported > 0) {
        toast.success(
          `${response.data.successfully_imported} students imported!`
        );
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Import failed");
      setStep("preview");
    },
  });

  // Handlers
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate file type
    const validTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!validTypes.includes(selected.type) && !selected.name.match(/\.(csv|xlsx?|xls)$/i)) {
      toast.error("Please select a CSV or Excel file");
      return;
    }

    // Validate file size (max 10MB)
    if (selected.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB allowed.");
      return;
    }

    setFile(selected);
  }

  async function handleDownloadTemplate() {
    try {
      toast.loading("Downloading template...", { id: "template" });
      const response = await studentApi.downloadTemplate();
      downloadBlob(response.data, "student_import_template.csv");
      toast.success("Template downloaded!", { id: "template" });
    } catch {
      toast.error("Failed to download template", { id: "template" });
    }
  }

  function handlePreview() {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }
    previewMutation.mutate(file);
  }

  function handleConfirm() {
    if (!file) return;
    setStep("importing");
    confirmMutation.mutate(file);
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setStep("select");
  }

  function handleDone() {
    router.push(`/school/${slug}/students`);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/school/${slug}/students`}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Upload className="w-7 h-7 text-blue-400" />
            Bulk Import Students
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {classInfo && sectionInfo && (
              <>
                Importing to:{" "}
                <span className="text-white font-medium">
                  {classInfo.name}
                </span>{" "}
                — Section{" "}
                <span className="text-white font-medium">
                  {sectionInfo.name}
                </span>
              </>
            )}
            {classInfo && !sectionInfo && (
              <>
                Importing to:{" "}
                <span className="text-white font-medium">
                  {classInfo.name}
                </span>{" "}
                <span className="text-yellow-400">(no section — directly to class)</span>
              </>
            )}
            {!classInfo && "General import — students will be added without class"}
          </p>
        </div>
      </div>

      {/* ─── PROGRESS INDICATOR ─── */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <StepIndicator
          number={1}
          label="Select File"
          active={step === "select"}
          completed={step !== "select"}
        />
        <StepDivider completed={step !== "select"} />
        <StepIndicator
          number={2}
          label="Preview & Validate"
          active={step === "preview"}
          completed={step === "importing" || step === "done"}
        />
        <StepDivider completed={step === "importing" || step === "done"} />
        <StepIndicator
          number={3}
          label="Import"
          active={step === "importing" || step === "done"}
          completed={step === "done"}
        />
      </div>

      {/* ─── STEP 1: FILE SELECT ─── */}
      {step === "select" && (
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-3">
                <h3 className="font-bold text-white">How to Import Students</h3>
                <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                  <li>
                    <strong>Download</strong> the CSV template below (has all required columns)
                  </li>
                  <li>
                    <strong>Fill in</strong> student data in Excel or any spreadsheet tool
                  </li>
                  <li>
                    <strong>Save as CSV</strong> and upload it here
                  </li>
                  <li>
                    <strong>Preview</strong> to check for errors before importing
                  </li>
                  <li>
                    <strong>Confirm</strong> to actually add students to database
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Template Download */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">CSV Template</h3>
                  <p className="text-sm text-gray-400">
                    Download the template with all fields and example data
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="text-center">
              {!file ? (
                <>
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Upload CSV/Excel File
                  </h3>
                  <p className="text-sm text-gray-400 mb-6">
                    Select the filled template file from your computer
                  </p>
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium cursor-pointer">
                    <FileText className="w-4 h-4" />
                    Choose File
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-3">
                    Supports CSV, XLSX, XLS · Max 10MB
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {file.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-6">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setFile(null)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                    <button
                      onClick={handlePreview}
                      disabled={previewMutation.isPending}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white rounded-xl transition-colors font-medium"
                    >
                      {previewMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Preview & Validate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2: PREVIEW ─── */}
      {step === "preview" && preview && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard
              icon={FileText}
              label="Total Rows"
              value={preview.total_rows}
              color="blue"
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Valid"
              value={preview.valid_count}
              color="green"
            />
            <SummaryCard
              icon={XCircle}
              label="Errors"
              value={preview.error_count}
              color="red"
            />
          </div>

          {/* File-level errors */}
          {preview.file_errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-400 mb-2">File Errors</h3>
                  <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                    {preview.file_errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Row errors */}
          {preview.error_rows.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 bg-red-500/5">
                <h3 className="font-bold text-red-400 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Row Errors ({preview.error_rows.length})
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Fix these rows in your file and re-upload
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {preview.error_rows.slice(0, 20).map((errRow) => (
                  <div
                    key={errRow.row}
                    className="px-5 py-3 border-b border-gray-800 hover:bg-gray-800/30"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono bg-red-500/20 text-red-400 px-2 py-1 rounded">
                        Row {errRow.row}
                      </span>
                      <div className="flex-1">
                        <ul className="text-sm text-red-300 space-y-0.5">
                          {errRow.errors.map((e, i) => (
                            <li key={i}>• {e}</li>
                          ))}
                        </ul>
                        <div className="mt-1 text-xs text-gray-500 truncate">
                          Data:{" "}
                          {Object.entries(errRow.data)
                            .filter(([, v]) => v)
                            .slice(0, 3)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(", ")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {preview.error_rows.length > 20 && (
                  <div className="px-5 py-3 text-center text-sm text-gray-500 bg-gray-800/30">
                    +{preview.error_rows.length - 20} more errors...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Valid rows preview */}
          {preview.preview_rows.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 bg-green-500/5">
                <h3 className="font-bold text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Preview of Valid Rows (First 10)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800/50">
                      {preview.preview_rows[0] &&
                        Object.keys(preview.preview_rows[0])
                          .slice(0, 6)
                          .map((key) => (
                            <th
                              key={key}
                              className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase"
                            >
                              {key}
                            </th>
                          ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview_rows.slice(0, 10).map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-800 hover:bg-gray-800/30"
                      >
                        {Object.values(row)
                          .slice(0, 6)
                          .map((val, j) => (
                            <td
                              key={j}
                              className="px-4 py-2 text-gray-300 text-xs"
                            >
                              {String(val || "—")}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Upload Different File
            </button>
            {preview.can_import && (
              <button
                onClick={handleConfirm}
                disabled={confirmMutation.isPending}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white rounded-xl transition-colors font-bold shadow-lg"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Import {preview.valid_count} Students
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── STEP 3: IMPORTING ─── */}
      {step === "importing" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Importing Students...
          </h3>
          <p className="text-gray-400">Please wait. Do not close this page.</p>
        </div>
      )}

      {/* ─── STEP 4: DONE ─── */}
      {step === "done" && importResult && (
        <div className="space-y-6">
          {/* Success Card */}
          <div
            className={`bg-gray-900 border rounded-2xl p-8 text-center ${
              importResult.successfully_imported > 0
                ? "border-green-500/30"
                : "border-red-500/30"
            }`}
          >
            {importResult.successfully_imported > 0 ? (
              <>
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Import Complete! 🎉
                </h2>
                <p className="text-gray-400 mb-6">{importResult.message}</p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Import Failed
                </h2>
                <p className="text-gray-400 mb-6">{importResult.message}</p>
              </>
            )}

            <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
              <StatBox
                label="Attempted"
                value={importResult.total_attempted}
                color="blue"
              />
              <StatBox
                label="Imported"
                value={importResult.successfully_imported}
                color="green"
              />
              <StatBox
                label="Failed"
                value={importResult.failed_count}
                color="red"
              />
              <StatBox
                label="Skipped"
                value={importResult.skipped_count}
                color="yellow"
              />
            </div>
          </div>

          {/* Errors during import */}
          {importResult.errors.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 bg-red-500/5">
                <h3 className="font-bold text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Import Errors ({importResult.errors.length})
                </h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {importResult.errors.map((err) => (
                  <div
                    key={err.row}
                    className="px-5 py-3 border-b border-gray-800"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono bg-red-500/20 text-red-400 px-2 py-1 rounded">
                        Row {err.row}
                      </span>
                      <ul className="text-sm text-red-300 space-y-0.5 flex-1">
                        {err.errors.map((e, i) => (
                          <li key={i}>• {e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors font-medium"
            >
              <Upload className="w-4 h-4" />
              Import More
            </button>
            <button
              onClick={handleDone}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-bold"
            >
              <CheckCircle2 className="w-4 h-4" />
              View Students
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
          completed
            ? "bg-green-500 text-white"
            : active
            ? "bg-blue-500 text-white ring-4 ring-blue-500/20"
            : "bg-gray-800 text-gray-500"
        }`}
      >
        {completed ? <CheckCircle2 className="w-5 h-5" /> : number}
      </div>
      <div>
        <p
          className={`text-sm font-semibold ${
            active || completed ? "text-white" : "text-gray-500"
          }`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function StepDivider({ completed }: { completed: boolean }) {
  return (
    <div
      className={`flex-1 h-1 mx-4 rounded-full transition-colors ${
        completed ? "bg-green-500" : "bg-gray-800"
      }`}
    />
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  color: "blue" | "green" | "red";
}) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    green: "bg-green-500/10 text-green-400 border-green-500/30",
    red: "bg-red-500/10 text-red-400 border-red-500/30",
  };
  return (
    <div
      className={`bg-gray-900 border rounded-2xl p-5 ${colorMap[color]}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-8 h-8" />
        <div>
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-400 uppercase font-semibold">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "green" | "red" | "yellow";
}) {
  const colorMap = {
    blue: "text-blue-400",
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
  };
  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
    </div>
  );
}