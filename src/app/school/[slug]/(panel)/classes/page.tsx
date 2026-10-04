"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classApi, academicYearApi, sectionApi } from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Loader2,
  X,
  Zap,
  Users,
  Trash2,
  Calendar,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface ClassItem {
  id: string;
  name: string;
  numeric_level?: number;
  class_level?: number;
  level?: string;
  academic_year_id: string;
  display_order?: number;
  total_sections?: number;
  total_students?: number;
}

interface AcademicYear {
  id: string;
  name: string;
  is_current?: boolean;
  is_active?: boolean;
}

interface SectionItem {
  id: string;
  name: string;
  max_students: number;
  current_strength: number;
}

function apiMsg(err: unknown, fallback: string) {
  const d = (
    err as {
      response?: { data?: { detail?: unknown; error?: { message?: string } } };
    }
  )?.response?.data;
  if (d?.detail) {
    return typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail);
  }
  return d?.error?.message || fallback;
}

function asItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "items" in data) {
    const items = (data as { items?: T[] }).items;
    if (Array.isArray(items)) return items;
  }
  return [];
}

async function createSection(
  classId: string,
  body: { name: string; max_students: number }
): Promise<SectionItem> {
  try {
    const { data } = await sectionApi.create(classId, body);
    return data;
  } catch (err) {
    throw new Error(apiMsg(err, "Failed to create section"));
  }
}

function AddSectionModal({
  classItem,
  onClose,
}: {
  classItem: ClassItem;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("A");
  const [maxStudents, setMaxStudents] = useState(40);

  const mutation = useMutation({
    mutationFn: () =>
      createSection(classItem.id, {
        name: name.trim().toUpperCase(),
        max_students: maxStudents,
      }),
    onSuccess: () => {
      toast.success(`Section ${name.toUpperCase()} added to ${classItem.name}!`);
      queryClient.invalidateQueries({ queryKey: ["sections", classItem.id] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create section");
    },
  });

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-section-title"
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 id="add-section-title" className="text-lg font-bold text-white">
              Add Section
            </h3>
            <p className="text-sm text-gray-400">{classItem.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="section-name" className="text-sm font-medium text-gray-300">
              Section Name
            </label>
            <div className="flex gap-2" role="group" aria-label="Quick section names">
              {["A", "B", "C", "D", "E"].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setName(n)}
                  className={`flex-1 h-10 rounded-xl font-bold text-sm transition-all ${
                    name === n
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              id="section-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              maxLength={10}
              placeholder="Or type custom name (e.g. Science, Commerce)"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="section-max" className="text-sm font-medium text-gray-300">
              Max Students:{" "}
              <span className="text-blue-400 font-bold">{maxStudents}</span>
            </label>
            <input
              id="section-max"
              type="range"
              min={10}
              max={80}
              step={5}
              value={maxStudents}
              onChange={(e) => setMaxStudents(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>10</span>
              <span>40 (standard)</span>
              <span>80</span>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {name || "?"}
            </div>
            <div>
              <p className="font-bold text-white text-sm">
                {classItem.name} — Section {name || "?"}
              </p>
              <p className="text-xs text-gray-400">Max {maxStudents} students</p>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !name.trim()}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Section
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkSectionsModal({
  classes,
  onClose,
}: {
  classes: ClassItem[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    classes.map((c) => c.id)
  );
  const [count, setCount] = useState(2);
  const [maxStudents, setMaxStudents] = useState(40);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [resultText, setResultText] = useState("");

  const sectionNames = ["A", "B", "C", "D", "E"];

  async function handleCreate() {
    if (selectedIds.length === 0) {
      toast.error("Select at least one class");
      return;
    }
    setLoading(true);
    let created = 0;
    let failed = 0;
    const total = selectedIds.length * count;

    for (const classId of selectedIds) {
      for (let i = 0; i < count; i++) {
        try {
          await createSection(classId, {
            name: sectionNames[i],
            max_students: maxStudents,
          });
          created++;
        } catch {
          failed++;
        }
        setProgress(Math.round(((created + failed) / total) * 100));
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    queryClient.invalidateQueries({ queryKey: ["classes"] });
    queryClient.invalidateQueries({ queryKey: ["sections"] });
    setLoading(false);
    setDone(true);
    setResultText(
      failed === 0
        ? `${created} sections created successfully!`
        : `${created} created, ${failed} skipped (already exist)`
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-sections-title"
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 id="bulk-sections-title" className="text-lg font-bold text-white">
              Bulk Create Sections
            </h3>
            <p className="text-sm text-gray-400">Add sections to all classes at once</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {done ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-white mb-2">Done!</h3>
              <p className="text-gray-400 text-sm">{resultText}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-300">
                  Sections per class:{" "}
                  <span className="text-purple-400 font-bold">
                    {sectionNames.slice(0, count).join(", ")}
                  </span>
                </p>
                <div className="flex gap-2" role="group" aria-label="Sections per class">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setCount(n)}
                      className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
                        count === n
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="bulk-section-max" className="text-sm font-medium text-gray-300">
                  Max students per section:{" "}
                  <span className="text-purple-400 font-bold">{maxStudents}</span>
                </label>
                <input
                  id="bulk-section-max"
                  type="range"
                  min={10}
                  max={80}
                  step={5}
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-300">Select classes:</p>
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedIds(classes.map((c) => c.id))}
                      className="text-purple-400 font-medium hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="text-gray-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                  {classes.map((cls) => (
                    <button
                      type="button"
                      key={cls.id}
                      onClick={() =>
                        setSelectedIds((prev) =>
                          prev.includes(cls.id)
                            ? prev.filter((x) => x !== cls.id)
                            : [...prev, cls.id]
                        )
                      }
                      aria-pressed={selectedIds.includes(cls.id)}
                      className={`px-2 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                        selectedIds.includes(cls.id)
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                          : "bg-gray-800 text-gray-500 border border-transparent hover:border-gray-600"
                      }`}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                <p className="text-sm text-purple-300 font-medium">
                  {selectedIds.length} classes × {count} sections ={" "}
                  <span className="font-bold">
                    {selectedIds.length * count} total sections
                  </span>
                </p>
              </div>

              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Creating sections...</span>
                    <span>{progress}%</span>
                  </div>
                  <div
                    className="w-full bg-gray-800 rounded-full h-2.5"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="bg-purple-500 h-2.5 rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading || selectedIds.length === 0}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Create Sections
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionsPanel({ cls }: { cls: ClassItem }) {
  const queryClient = useQueryClient();

  const { data: sections, isLoading } = useQuery({
    queryKey: ["sections", cls.id],
    queryFn: async () => {
      const { data } = await sectionApi.listByClass(cls.id);
      return asItems<SectionItem>(data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (sectionId: string) => sectionApi.delete(sectionId),
    onSuccess: () => {
      toast.success("Section deleted");
      queryClient.invalidateQueries({ queryKey: ["sections", cls.id] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (err: unknown) => toast.error(apiMsg(err, "Failed to delete section")),
  });

  const sectionList = sections || [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 py-2 px-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading sections...
      </div>
    );
  }

  if (sectionList.length === 0) {
    return (
      <p className="text-xs text-gray-600 text-center py-2">
        No sections yet — click &quot;Add Section&quot;
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {sectionList.map((sec) => (
        <div
          key={sec.id}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-300 font-bold text-xs">
              {sec.name}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Section {sec.name}</p>
              <p className="text-xs text-gray-500">
                {sec.current_strength || 0}/{sec.max_students} students
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={`Delete Section ${sec.name}`}
            onClick={() => {
              if (confirm(`Delete Section ${sec.name}?`)) {
                deleteMutation.mutate(sec.id);
              }
            }}
            disabled={deleteMutation.isPending}
            className="p-1 text-gray-600 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ClassCard({
  cls,
  onAddSection,
  onDelete,
}: {
  cls: ClassItem;
  onAddSection: (c: ClassItem) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [showSections, setShowSections] = useState(false);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-blue-500/40 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{cls.name}</h3>
            <p className="text-xs text-gray-500">
              Level: {cls.numeric_level ?? cls.class_level ?? "N/A"}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={`Delete class ${cls.name}`}
          onClick={() => onDelete(cls.id, cls.name)}
          className="p-2 text-gray-600 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <Users className="w-3.5 h-3.5" />
          <span>
            <span className="text-white font-semibold">{cls.total_sections ?? 0}</span>{" "}
            Sections
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <Users className="w-3.5 h-3.5" />
          <span>
            <span className="text-white font-semibold">{cls.total_students ?? 0}</span>{" "}
            Students
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAddSection(cls)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Section
        </button>

        {(cls.total_sections ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => setShowSections(!showSections)}
            aria-expanded={showSections}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-xs font-semibold transition-colors"
          >
            {showSections ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Hide
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                View ({cls.total_sections})
              </>
            )}
          </button>
        )}
      </div>

      {showSections && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <SectionsPanel cls={cls} />
        </div>
      )}
    </div>
  );
}

export default function ClassesPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkClassForm, setShowBulkClassForm] = useState(false);
  const [showBulkSections, setShowBulkSections] = useState(false);
  const [addSectionFor, setAddSectionFor] = useState<ClassItem | null>(null);
  const [newClass, setNewClass] = useState({ name: "", numeric_level: 1 });
  const [bulkRange, setBulkRange] = useState({ from: 1, to: 12 });
  const [bulkProgress, setBulkProgress] = useState({
    current: 0,
    total: 0,
    running: false,
  });

  const { data: yearsData } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearApi.list().then((r) => r.data),
  });

  const academicYears = asItems<AcademicYear>(yearsData);
  const currentYear =
    academicYears.find((y) => y.is_current || y.is_active) || academicYears[0];

  const {
    data: classesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["classes", currentYear?.id],
    queryFn: () => classApi.list(currentYear?.id).then((r) => r.data),
    enabled: !!currentYear?.id,
  });

  const classes = asItems<ClassItem>(classesData);
  const sortedClasses = [...classes].sort((a, b) => {
    const aL = a.numeric_level ?? a.class_level ?? 0;
    const bL = b.numeric_level ?? b.class_level ?? 0;
    return aL - bL;
  });

  const createYearMutation = useMutation({
    mutationFn: () => {
      const year = new Date().getFullYear();
      return academicYearApi.create({
        name: `${year}-${year + 1}`,
        start_date: `${year}-04-01`,
        end_date: `${year + 1}-03-31`,
        is_current: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Academic year created!");
    },
    onError: () => toast.error("Failed to create academic year"),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newClass) =>
      classApi.create({
        name: data.name,
        numeric_level: data.numeric_level,
        class_level: data.numeric_level,
        academic_year_id: currentYear?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class created!");
      setShowAddForm(false);
      setNewClass({ name: "", numeric_level: 1 });
    },
    onError: (err: unknown) => toast.error(apiMsg(err, "Failed to create class")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => classApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class deleted");
    },
    onError: () => toast.error("Failed to delete class"),
  });

  const handleBulkCreate = async () => {
    const total = bulkRange.to - bulkRange.from + 1;
    setBulkProgress({ current: 0, total, running: true });

    const existingLevels = new Set(
      classes
        .map((c) => c.numeric_level ?? c.class_level)
        .filter((l) => l !== undefined)
    );

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (let i = bulkRange.from; i <= bulkRange.to; i++) {
      setBulkProgress({
        current: i - bulkRange.from + 1,
        total,
        running: true,
      });

      if (existingLevels.has(i)) {
        skipCount++;
        continue;
      }

      try {
        await classApi.create({
          name: `Class ${i}`,
          numeric_level: i,
          class_level: i,
          academic_year_id: currentYear?.id,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBulkProgress({ current: 0, total: 0, running: false });
    queryClient.invalidateQueries({ queryKey: ["classes"] });

    if (successCount > 0) {
      const parts = [`${successCount} created`];
      if (skipCount > 0) parts.push(`${skipCount} already existed`);
      if (failCount > 0) parts.push(`${failCount} failed`);
      toast.success(parts.join(", "));
    } else if (skipCount > 0 && failCount === 0) {
      toast.info(`All ${skipCount} classes already exist`);
    } else {
      toast.error("Failed to create classes");
    }

    setShowBulkClassForm(false);
  };

  if (!isLoading && academicYears.length === 0) {
    const year = new Date().getFullYear();
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-8 text-center">
          <Calendar className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Academic Year Found</h2>
          <p className="text-gray-400 mb-6">
            Please create an academic year first to start managing classes.
          </p>
          <button
            type="button"
            onClick={() => createYearMutation.mutate()}
            disabled={createYearMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
          >
            {createYearMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Academic Year {year}-{year + 1}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-purple-400" />
            Classes & Sections
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {currentYear && (
              <>
                Academic Year:{" "}
                <span className="text-blue-400 font-medium">{currentYear.name}</span> ·{" "}
                {sortedClasses.length} classes
              </>
            )}
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {sortedClasses.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkSections(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl transition-colors text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              Bulk Add Sections
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowBulkClassForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl transition-colors text-sm font-medium"
          >
            <Zap className="w-4 h-4" />
            Auto Create (1-12)
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Class
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {!isLoading && sortedClasses.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Classes Yet</h3>
          <p className="text-gray-400 mb-6">
            Create classes to get started. Use Auto Create to add Class 1-12 instantly.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              type="button"
              onClick={() => setShowBulkClassForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors font-medium"
            >
              <Zap className="w-4 h-4" />
              Auto Create Classes 1-12
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Class Manually
            </button>
          </div>
        </div>
      )}

      {!isLoading && sortedClasses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              onAddSection={setAddSectionFor}
              onDelete={(id, name) => {
                if (confirm(`Delete class "${name}"? This cannot be undone.`)) {
                  deleteMutation.mutate(id);
                }
              }}
            />
          ))}
        </div>
      )}

      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-class-title"
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 id="add-class-title" className="text-lg font-bold text-white">
                Add New Class
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                aria-label="Close"
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="class-name" className="text-sm font-medium text-gray-300">
                  Class Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="class-name"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="e.g. Class 1, Nursery, LKG"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="class-level" className="text-sm font-medium text-gray-300">
                  Numeric Level <span className="text-red-400">*</span>
                </label>
                <input
                  id="class-level"
                  type="number"
                  value={newClass.numeric_level}
                  onChange={(e) =>
                    setNewClass({
                      ...newClass,
                      numeric_level: parseInt(e.target.value) || 1,
                    })
                  }
                  min={0}
                  max={15}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">0 = Nursery · 1 = Class 1 · 12 = Class 12</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => createMutation.mutate(newClass)}
                  disabled={!newClass.name || createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Class"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkClassForm && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-class-title"
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 id="bulk-class-title" className="text-lg font-bold text-white">
                Auto Create Classes
              </h3>
              <button
                type="button"
                onClick={() => !bulkProgress.running && setShowBulkClassForm(false)}
                aria-label="Close"
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {bulkProgress.running ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
                  <p className="text-white font-semibold mb-2">Creating classes...</p>
                  <p className="text-gray-400 text-sm mb-4">
                    {bulkProgress.current} / {bulkProgress.total}
                  </p>
                  <div
                    className="w-full h-2 bg-gray-800 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={bulkProgress.current}
                    aria-valuemin={0}
                    aria-valuemax={bulkProgress.total}
                  >
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{
                        width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                    <p className="text-sm text-blue-400">
                      Already existing classes will be automatically skipped.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="bulk-from" className="text-sm font-medium text-gray-300">
                        From Class
                      </label>
                      <input
                        id="bulk-from"
                        type="number"
                        value={bulkRange.from}
                        onChange={(e) =>
                          setBulkRange({
                            ...bulkRange,
                            from: parseInt(e.target.value) || 1,
                          })
                        }
                        min={1}
                        max={12}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="bulk-to" className="text-sm font-medium text-gray-300">
                        To Class
                      </label>
                      <input
                        id="bulk-to"
                        type="number"
                        value={bulkRange.to}
                        onChange={(e) =>
                          setBulkRange({
                            ...bulkRange,
                            to: parseInt(e.target.value) || 12,
                          })
                        }
                        min={1}
                        max={12}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-400">
                      This will attempt to create {bulkRange.to - bulkRange.from + 1}{" "}
                      classes (Class {bulkRange.from} to Class {bulkRange.to})
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleBulkCreate}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Create All
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkClassForm(false)}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {addSectionFor && (
        <AddSectionModal
          classItem={addSectionFor}
          onClose={() => setAddSectionFor(null)}
        />
      )}

      {showBulkSections && (
        <BulkSectionsModal
          classes={sortedClasses}
          onClose={() => setShowBulkSections(false)}
        />
      )}
    </div>
  );
}
