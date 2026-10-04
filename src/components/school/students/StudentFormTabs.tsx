"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  UDISE_CATEGORIES,
  UdiseField,
  calculateUdiseCompliance,
  getComplianceColors,
} from "@/lib/udiseConfig";
import { Save, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface StudentFormTabsProps {
  student: Record<string, unknown>;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  isSaving?: boolean;
}

export default function StudentFormTabs({
  student,
  onSave,
  isSaving = false,
}: StudentFormTabsProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const categories = UDISE_CATEGORIES.filter((c) => c.id !== "documents");

  // Get current value (form data > student data > extras)
  function getValue(field: UdiseField): unknown {
    // Check form data first (unsaved changes)
    const formKey = field.source === "extras" ? `extras.${field.key}` : field.key;
    if (formKey in formData) return formData[formKey];

    if (field.source === "direct") {
      return student[field.key] ?? "";
    }
    const extras = (student.extras || {}) as Record<string, unknown>;
    return extras[field.key] ?? "";
  }

  // Update field value
  function updateField(field: UdiseField, value: unknown) {
    const key = field.source === "extras" ? `extras.${field.key}` : field.key;
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  // Get category compliance
  function getCategoryCompliance(catId: string) {
    // Merge current form data with student for accurate calculation
    const merged = { ...student };
    const mergedExtras = { ...((student.extras as Record<string, unknown>) || {}) };

    Object.entries(formData).forEach(([key, value]) => {
      if (key.startsWith("extras.")) {
        mergedExtras[key.replace("extras.", "")] = value;
      } else {
        merged[key] = value;
      }
    });
    merged.extras = mergedExtras;

    const result = calculateUdiseCompliance(merged);
    return result.categoryResults.find((c) => c.categoryId === catId);
  }

  // Save current section
  async function handleSaveSection() {
    const currentCat = categories.find((c) => c.id === activeTab);
    if (!currentCat) return;

    // Build updates object
    const directUpdates: Record<string, unknown> = {};
    const extrasUpdates: Record<string, unknown> = {};

    Object.entries(formData).forEach(([key, value]) => {
      if (key.startsWith("extras.")) {
        extrasUpdates[key.replace("extras.", "")] = value;
      } else {
        directUpdates[key] = value;
      }
    });

    const updates: Record<string, unknown> = { ...directUpdates };
    if (Object.keys(extrasUpdates).length > 0) {
      // Merge with existing extras
      updates.extras = {
        ...((student.extras as Record<string, unknown>) || {}),
        ...extrasUpdates,
      };
    }

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      await onSave(updates);
      setFormData({}); // Clear form data after save
      toast.success(`${currentCat.name} saved!`);
    } catch (err) {
      console.error(err);
    }
  }

  const currentCategory = categories.find((c) => c.id === activeTab);

  return (
    <div className="space-y-6">
      {/* ─── TABS ─── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-800">
          {categories.map((cat) => {
            const compliance = getCategoryCompliance(cat.id);
            const isActive = activeTab === cat.id;
            const colors = compliance
              ? getComplianceColors(
                  compliance.percentage >= 90
                    ? "complete"
                    : compliance.percentage >= 70
                    ? "good"
                    : compliance.percentage >= 40
                    ? "partial"
                    : "pending"
                )
              : null;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? "border-blue-500 text-white bg-gray-800/50"
                    : "border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30"
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                <span>{cat.name}</span>
                {compliance && colors && (
                  <span
                    className={`text-xs font-bold ${colors.text} bg-gray-900 px-1.5 py-0.5 rounded-full`}
                  >
                    {compliance.percentage}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── ACTIVE TAB CONTENT ─── */}
        {currentCategory && (
          <div className="p-6">
            {/* Category header */}
            <div className="mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">{currentCategory.icon}</span>
                    {currentCategory.name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {currentCategory.description}
                  </p>
                </div>

                {(() => {
                  const compliance = getCategoryCompliance(currentCategory.id);
                  if (!compliance) return null;
                  const colors = getComplianceColors(
                    compliance.percentage >= 90
                      ? "complete"
                      : compliance.percentage >= 70
                      ? "good"
                      : compliance.percentage >= 40
                      ? "partial"
                      : "pending"
                  );
                  return (
                    <div
                      className={`px-4 py-2 rounded-xl border ${colors.bg} ${colors.border}`}
                    >
                      <p className={`text-2xl font-bold ${colors.text}`}>
                        {compliance.percentage}%
                      </p>
                      <p className="text-xs text-gray-400">
                        {compliance.filledFields}/{compliance.totalFields} filled
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Progress bar */}
              {(() => {
                const compliance = getCategoryCompliance(currentCategory.id);
                if (!compliance) return null;
                return (
                  <div className="mt-3">
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          compliance.percentage >= 90
                            ? "bg-green-500"
                            : compliance.percentage >= 70
                            ? "bg-blue-500"
                            : compliance.percentage >= 40
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${compliance.percentage}%` }}
                      />
                    </div>
                    {compliance.missingFields.length > 0 && (
                      <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Missing: {compliance.missingFields.slice(0, 3).join(", ")}
                        {compliance.missingFields.length > 3 &&
                          ` +${compliance.missingFields.length - 3} more`}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Form fields grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentCategory.fields.map((field) => (
                <FormField
                  key={field.key}
                  field={field}
                  value={getValue(field)}
                  onChange={(val) => updateField(field, val)}
                />
              ))}
            </div>

            {/* Save button */}
            <div className="mt-6 pt-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={handleSaveSection}
                disabled={isSaving || Object.keys(formData).length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save {currentCategory.name}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FORM FIELD COMPONENT ────────────────────────────────────

function FormField({
  field,
  value,
  onChange,
}: {
  field: UdiseField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const commonClasses =
    "w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors";

  return (
    <div>
      <label className="text-sm font-medium text-gray-300 mb-1.5 block">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {field.type === "select" && field.options ? (
        <select
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
        >
          <option value="">-- Select --</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === "checkbox" ? (
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onChange(!value)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              value ? "bg-blue-600" : "bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                value ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="ml-3 text-sm text-gray-400">
            {value ? "Yes" : "No"}
          </span>
        </div>
      ) : field.type === "textarea" ? (
        <textarea
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`${commonClasses} resize-none`}
        />
      ) : (
        <input
          type={field.type}
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={commonClasses}
        />
      )}
    </div>
  );
}