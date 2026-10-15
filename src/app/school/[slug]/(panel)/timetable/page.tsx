"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen,
  Users,
  CalendarDays,
  Search,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

const QUICK_SUBJECTS = [
  { name: "English", color: "#3B82F6" },
  { name: "Hindi", color: "#10B981" },
  { name: "Mathematics", color: "#F59E0B" },
  { name: "Science", color: "#8B5CF6" },
  { name: "Social Science", color: "#EC4899" },
  { name: "Computer", color: "#78350F" },
  { name: "EVS", color: "#10B981" },
  { name: "General Knowledge", color: "#6B7280" },
  { name: "Physical Education", color: "#DC2626" },
  { name: "Art", color: "#F472B6" },
];

const MAX_PERIODS = 30;

export default function TimetableBuilderPage() {
  const params = useParams();

  const [activeTab, setActiveTab] = useState<"subjects" | "teachers" | "timetable">("subjects");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingId, setIsAddingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [apiSuggestions, setApiSuggestions] = useState<any[]>([]);

  // Tab 2 states
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, any>>({}); // class_subject_id -> assignment
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // ─── Helpers ───
  const getSelectedContextName = () => {
    const clsName = classes.find((c) => c.id === selectedClassId)?.name || "";
    const secName = sections.find((s) => s.id === selectedSectionId)?.name || "";
    if (clsName && secName) return `${clsName} (Section ${secName})`;
    if (clsName) return clsName;
    return "...";
  };

  const teacherName = (t: any) => {
    if (!t) return "Unknown";
    if (t.full_name) return t.full_name;
    if (t.name) return t.name;
    const first = t.first_name || t.firstName || "";
    const last = t.last_name || t.lastName || "";
    const n = `${first} ${last}`.trim();
    return n || t.email || "Teacher";
  };

  // ─── 1. Fetch Classes ───
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/classes");
        const data = res.data || [];
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].id);
      } catch {
        toast.error("Failed to load classes");
      }
    };
    fetchClasses();
  }, []);

  // ─── 2. Fetch Sections ───
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId("");
      return;
    }

    const currentClass = classes.find((c) => c.id === selectedClassId);
    if (currentClass?.sections?.length > 0) {
      setSections(currentClass.sections);
      setSelectedSectionId(currentClass.sections[0].id);
      return;
    }

    const fetchSections = async () => {
      setIsLoadingSections(true);
      try {
        const res = await api.get(`/classes/${selectedClassId}/sections`);
        const secData = res.data || [];
        setSections(secData);
        setSelectedSectionId(secData.length > 0 ? secData[0].id : "");
      } catch {
        setSections([]);
        setSelectedSectionId("");
      } finally {
        setIsLoadingSections(false);
      }
    };
    fetchSections();
  }, [selectedClassId, classes]);

  // ─── 3. Fetch Subjects (section-aware) ───
  useEffect(() => {
    if (!selectedClassId) return;
    const fetchSubjects = async () => {
      setIsLoading(true);
      try {
        let url = `/class-subjects?class_id=${selectedClassId}`;
        if (selectedSectionId) url += `&section_id=${selectedSectionId}`;
        const res = await api.get(url);
        setClassSubjects(res.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, [selectedClassId, selectedSectionId]);

  // ─── 4. Subject suggestions ───
  useEffect(() => {
    if (!subjectQuery.trim()) {
      setApiSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/class-subjects/suggestions?query=${subjectQuery}`);
        setApiSuggestions(res.data?.suggestions || []);
      } catch {
        setApiSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [subjectQuery]);

  // ─── 5. Load Teachers + Assignments + Workload when Tab 2 opens ───
  useEffect(() => {
    if (activeTab !== "teachers" || !selectedClassId) return;

    const loadTab2 = async () => {
      setIsLoadingTeachers(true);
      try {
        // Teachers list — try multiple common endpoints
        let teacherList: any[] = [];
        try {
          const r = await api.get("/staff?role=teacher");
          teacherList = Array.isArray(r.data) ? r.data : r.data?.items || r.data?.data || [];
        } catch {
          try {
            const r2 = await api.get("/staff");
            const all = Array.isArray(r2.data) ? r2.data : r2.data?.items || [];
            teacherList = all.filter(
              (s: any) =>
                (s.role || "").toLowerCase().includes("teacher") ||
                (s.staff_type || "").toLowerCase().includes("teach") ||
                s.is_teacher === true
            );
            if (teacherList.length === 0) teacherList = all; // fallback all staff
          } catch {
            try {
              const r3 = await api.get("/users?role=TEACHER");
              teacherList = Array.isArray(r3.data) ? r3.data : r3.data?.items || [];
            } catch {
              teacherList = [];
            }
          }
        }
        setTeachers(teacherList);

        // Existing assignments for this class+section
        try {
          let aUrl = `/teacher-assignments?class_id=${selectedClassId}`;
          if (selectedSectionId) aUrl += `&section_id=${selectedSectionId}`;
          const aRes = await api.get(aUrl);
          const list = aRes.data || [];
          const map: Record<string, any> = {};
          list.forEach((a: any) => {
            map[a.class_subject_id] = a;
          });
          setAssignments(map);
        } catch {
          setAssignments({});
        }

        // Workloads
        try {
          const wRes = await api.get("/teacher-assignments/workload/all");
          setWorkloads(wRes.data || []);
        } catch {
          setWorkloads([]);
        }
      } finally {
        setIsLoadingTeachers(false);
      }
    };

    loadTab2();
  }, [activeTab, selectedClassId, selectedSectionId]);

  // ─── Chip helpers ───
  const getDisplayedChips = () => {
    let chips: any[] = [];
    if (subjectQuery.trim()) {
      chips =
        apiSuggestions.length > 0
          ? apiSuggestions.map((s) => ({ name: s.name, color: s.suggested_color || "#3B82F6" }))
          : QUICK_SUBJECTS.filter((s) => s.name.toLowerCase().includes(subjectQuery.toLowerCase()));
    } else {
      chips = QUICK_SUBJECTS;
    }
    const added = classSubjects.map((cs) => cs.subject_name.toLowerCase());
    return chips.filter((c) => !added.includes(c.name.toLowerCase())).slice(0, 12);
  };
  const displayedChips = getDisplayedChips();
  const exactMatchExists =
    displayedChips.some((c) => c.name.toLowerCase() === subjectQuery.toLowerCase().trim()) ||
    classSubjects.some((cs) => cs.subject_name.toLowerCase() === subjectQuery.toLowerCase().trim());

  // ─── Subject actions ───
  const handleAddSubject = async (name: string, color = "#3B82F6", isCustom = false) => {
    if (!selectedClassId) return toast.error("Select a class first");
    setIsAddingId(name);
    try {
      const res = await api.post("/class-subjects", {
        class_id: selectedClassId,
        section_id: selectedSectionId || null,
        subject_name: name,
        periods_per_week: 5,
        color_code: color,
        is_custom: isCustom,
      });
      setClassSubjects((prev) => [...prev, res.data]);
      setSubjectQuery("");
      toast.success(`${name} added!`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || e.message || "Failed to add");
    } finally {
      setIsAddingId(null);
    }
  };

  const handleUpdatePeriods = async (id: string, current: number, delta: number) => {
    const next = current + delta;
    if (next < 1 || next > 20) return;
    setUpdatingId(id);
    try {
      await api.patch(`/class-subjects/${id}`, { periods_per_week: next });
      setClassSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, periods_per_week: next } : s)));
      toast.success(`${next} periods/week`);
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await api.delete(`/class-subjects/${id}`);
      setClassSubjects((prev) => prev.filter((s) => s.id !== id));
      toast.success("Removed");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  // ─── Teacher assign action ───
  const handleAssignTeacher = async (classSubjectId: string, teacherId: string) => {
    if (!teacherId) return;
    setAssigningId(classSubjectId);
    try {
      const res = await api.post("/teacher-assignments", {
        class_subject_id: classSubjectId,
        section_id: selectedSectionId || null,
        teacher_id: teacherId,
      });

      setAssignments((prev) => ({
        ...prev,
        [classSubjectId]: res.data,
      }));

      // Refresh workloads
      try {
        const wRes = await api.get("/teacher-assignments/workload/all");
        setWorkloads(wRes.data || []);
      } catch {}

      if (res.data?.is_overloaded) {
        toast.warning(
          `${res.data.teacher_name} is now at ${res.data.current_workload}/30 periods — overloaded, but saved.`
        );
      } else {
        toast.success(`Assigned to ${res.data.teacher_name}`);
      }
    } catch (e: any) {
      const msg =
        e.response?.data?.detail ||
        e.response?.data?.error?.message ||
        e.message ||
        "Failed to assign teacher";
      toast.error(typeof msg === "string" ? msg : "Failed to assign");
    } finally {
      setAssigningId(null);
    }
  };

  const assignedCount = useMemo(() => {
    return classSubjects.filter((s) => assignments[s.id]?.teacher_id).length;
  }, [classSubjects, assignments]);

  // ─── UI ───
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Smart Timetable Builder</h1>
        <p className="text-slate-400 text-sm mt-1">
          Setup section-wise subjects, assign teachers, and build schedules.
        </p>
      </div>

      {/* TABS */}
      <div className="flex bg-[#111827] border border-slate-800 p-1.5 rounded-xl w-fit shadow-sm overflow-x-auto">
        {(
          [
            ["subjects", "1. Subjects Setup", BookOpen],
            ["teachers", "2. Assign Teachers", Users],
            ["timetable", "3. Build Grid", CalendarDays],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === key
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* CLASS + SECTION SELECTORS */}
      <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-6 shadow-sm">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Select Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500"
          >
            <option value="" disabled>
              -- Choose Class --
            </option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            Select Section
            {isLoadingSections && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={sections.length === 0}
            className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 disabled:opacity-50"
          >
            {sections.length === 0 ? (
              <option value="">No sections</option>
            ) : (
              sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))
            )}
          </select>
        </div>

        {selectedClassId && (
          <div className="flex items-center gap-2 text-sm text-slate-300 mt-6 bg-[#0f172a] px-4 py-2 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Working on: <strong className="text-white">{getSelectedContextName()}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════ TAB 1: SUBJECTS ═══════════════ */}
      {activeTab === "subjects" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 shadow-sm">
              <h3 className="font-bold text-white mb-4">Quick Add Subjects</h3>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type to search or add custom..."
                  value={subjectQuery}
                  onChange={(e) => setSubjectQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder:text-slate-500 rounded-xl outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {displayedChips.map((chip, idx) => (
                  <button
                    key={idx}
                    disabled={isAddingId === chip.name}
                    onClick={() => handleAddSubject(chip.name, chip.color)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 disabled:opacity-50"
                  >
                    {isAddingId === chip.name ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" style={{ color: chip.color }} />
                    )}
                    {chip.name}
                  </button>
                ))}
                {subjectQuery.trim() && !exactMatchExists && (
                  <button
                    disabled={!!isAddingId}
                    onClick={() => handleAddSubject(subjectQuery.trim(), "#6B7280", true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 rounded-lg text-sm text-blue-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add &quot;{subjectQuery.trim()}&quot;
                  </button>
                )}
              </div>
              <div className="mt-5 p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg flex gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">
                  Subjects save for <strong>{getSelectedContextName()}</strong> only. Switch section to configure another.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 min-h-[400px]">
              <h3 className="font-bold text-white flex justify-between mb-5">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  Subjects for {getSelectedContextName()}
                </span>
                <span className="text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                  Total: {classSubjects.length}
                </span>
              </h3>

              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : classSubjects.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  <p className="text-sm text-slate-300">No subjects for this section</p>
                  <p className="text-xs mt-1">Add from the left panel</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classSubjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: `${sub.color_code}20`,
                            border: `1px solid ${sub.color_code}40`,
                          }}
                        >
                          <BookOpen className="w-4 h-4" style={{ color: sub.color_code }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{sub.subject_name}</p>
                          <div className="flex items-center gap-1.5 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg px-2 py-0.5 w-fit">
                            <button
                              onClick={() => handleUpdatePeriods(sub.id, sub.periods_per_week, -1)}
                              disabled={updatingId === sub.id || sub.periods_per_week <= 1}
                              className="text-slate-400 hover:text-white disabled:opacity-30 p-0.5"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-blue-400 min-w-[50px] text-center">
                              {updatingId === sub.id ? "..." : `${sub.periods_per_week} / wk`}
                            </span>
                            <button
                              onClick={() => handleUpdatePeriods(sub.id, sub.periods_per_week, 1)}
                              disabled={updatingId === sub.id || sub.periods_per_week >= 20}
                              className="text-slate-400 hover:text-white disabled:opacity-30 p-0.5"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSubject(sub.id, sub.subject_name)}
                        className="p-2 text-slate-500 hover:text-red-400 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 2: ASSIGN TEACHERS ═══════════════ */}
      {activeTab === "teachers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Subject → Teacher mapping */}
          <div className="lg:col-span-2">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 min-h-[420px]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  Assign Teachers — {getSelectedContextName()}
                </h3>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                    classSubjects.length > 0 && assignedCount === classSubjects.length
                      ? "bg-emerald-900/30 text-emerald-300 border-emerald-800"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {assignedCount} / {classSubjects.length} assigned
                </span>
              </div>

              {isLoading || isLoadingTeachers ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : classSubjects.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  <BookOpen className="w-10 h-10 mb-3 text-slate-600" />
                  <p className="text-sm text-slate-300 font-medium">No subjects in this section</p>
                  <p className="text-xs mt-1 mb-4">Add subjects first in Tab 1</p>
                  <button
                    onClick={() => setActiveTab("subjects")}
                    className="text-blue-400 text-sm hover:underline"
                  >
                    ← Go to Subjects Setup
                  </button>
                </div>
              ) : teachers.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  <Users className="w-10 h-10 mb-3 text-slate-600" />
                  <p className="text-sm text-slate-300 font-medium">No teachers found</p>
                  <p className="text-xs mt-1">Add teachers from Staff page first</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classSubjects.map((sub) => {
                    const assigned = assignments[sub.id];
                    const isAssigning = assigningId === sub.id;
                    return (
                      <div
                        key={sub.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all ${
                          assigned
                            ? "border-emerald-800/50 bg-emerald-950/20"
                            : "border-amber-800/40 bg-amber-950/10"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${sub.color_code}25`,
                              border: `1px solid ${sub.color_code}50`,
                            }}
                          >
                            <BookOpen className="w-4 h-4" style={{ color: sub.color_code }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{sub.subject_name}</p>
                            <p className="text-xs text-slate-400">{sub.periods_per_week} periods/week</p>
                          </div>
                          {!assigned && (
                            <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-400 bg-amber-900/30 border border-amber-800/50 px-2 py-0.5 rounded">
                              Needed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 sm:w-[240px]">
                          {isAssigning ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm w-full justify-center py-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                            </div>
                          ) : (
                            <select
                              value={assigned?.teacher_id || ""}
                              onChange={(e) => handleAssignTeacher(sub.id, e.target.value)}
                              className="w-full bg-[#0f172a] border border-slate-600 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-blue-500"
                            >
                              <option value="">-- Select Teacher --</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {teacherName(t)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Workload panel */}
          <div className="lg:col-span-1">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 sticky top-4">
              <h3 className="font-bold text-white flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" /> Teacher Workload
              </h3>
              <p className="text-xs text-slate-500 mb-4">Max {MAX_PERIODS} periods/week · warning above limit</p>

              {isLoadingTeachers ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : workloads.length === 0 && teachers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No teacher data</p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {(workloads.length > 0
                    ? workloads
                    : teachers.map((t) => ({
                        teacher_id: t.id,
                        teacher_name: teacherName(t),
                        total_periods: 0,
                        max_periods: MAX_PERIODS,
                        is_overloaded: false,
                      }))
                  ).map((w) => {
                    const pct = Math.min(100, Math.round((w.total_periods / (w.max_periods || MAX_PERIODS)) * 100));
                    const barColor =
                      w.total_periods > MAX_PERIODS
                        ? "bg-red-500"
                        : pct >= 80
                        ? "bg-amber-500"
                        : pct >= 50
                        ? "bg-blue-500"
                        : "bg-emerald-500";
                    return (
                      <div
                        key={w.teacher_id}
                        className={`p-3 rounded-xl border ${
                          w.is_overloaded || w.total_periods > MAX_PERIODS
                            ? "border-red-800/50 bg-red-950/20"
                            : "border-slate-700/50 bg-slate-800/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-medium text-slate-200 truncate pr-2">
                            {w.teacher_name}
                          </p>
                          <span
                            className={`text-xs font-bold shrink-0 ${
                              w.total_periods > MAX_PERIODS ? "text-red-400" : "text-slate-400"
                            }`}
                          >
                            {w.total_periods}/{w.max_periods || MAX_PERIODS}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        {(w.is_overloaded || w.total_periods > MAX_PERIODS) && (
                          <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Over {MAX_PERIODS} — warning only
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Assigning above {MAX_PERIODS} periods shows a warning but still saves. Same teacher can teach multiple
                  subjects/sections.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 3: PLACEHOLDER ═══════════════ */}
      {activeTab === "timetable" && (
        <div className="bg-[#111827] p-12 rounded-2xl border border-slate-800 text-center">
          <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Step 3: Drag & Drop Grid Builder</p>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            After subjects + teachers are set, you will build the weekly grid with clash detection here.
          </p>
          <button
            onClick={() => setActiveTab("teachers")}
            className="mt-5 text-blue-400 font-medium text-sm hover:underline"
          >
            ← Back to Assign Teachers
          </button>
        </div>
      )}
    </div>
  );
}