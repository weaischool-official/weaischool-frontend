"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";
import {
  BookOpen,
  Users,
  CalendarDays,
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Loader2,
  AlertTriangle,
  Settings,
  Save,
  RefreshCw,
  X,
  Clock,
  GripVertical
} from "lucide-react";

const QUICK_SUBJECTS = [
  { name: "Mathematics", color: "#3B82F6" },
  { name: "English", color: "#10B981" },
  { name: "Science", color: "#8B5CF6" },
  { name: "Social Science", color: "#F59E0B" },
  { name: "Hindi", color: "#EF4444" },
  { name: "Computer", color: "#06B6D4" },
  { name: "Physical Education", color: "#84CC16" },
  { name: "General Knowledge", color: "#EC4899" },
  { name: "Art & Craft", color: "#F97316" },
  { name: "EVS", color: "#14B8A6" },
];

const MAX_PERIODS = 30;

// Normalize subject names for precise matching
const normalizeSubject = (str: string): string => {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
};

// Precise subject matching using discrete synonym groups
const matchSubjects = (classSubjectName: string, teacherSubjectName: string): boolean => {
  const normClass = normalizeSubject(classSubjectName);
  const normTeacher = normalizeSubject(teacherSubjectName);

  if (!normClass || !normTeacher) return false;

  if (normClass === normTeacher) return true;

  const synonymGroups: string[][] = [
    ["mathematics", "maths", "math", "quantitative"],
    ["informationtechnology", "it", "computer", "computers", "computerscience", "cs", "ip"],
    ["socialscience", "sst", "socialstudies", "history", "geography", "civics", "politicalscience"],
    ["science", "physics", "chemistry", "biology"],
    ["physicaleducation", "pe", "sports", "pt"],
    ["generalknowledge", "gk"],
    ["evs", "environmentalstudies", "environmentalscience"],
    ["art", "drawing", "craft", "arts"],
    ["english", "eng"],
    ["hindi"],
    ["marathi"],
    ["sanskrit"],
  ];

  for (const group of synonymGroups) {
    if (group.includes(normClass) && group.includes(normTeacher)) {
      return true;
    }
  }

  return false;
};

// Comprehensive Subject Extraction from Staff Profiles
const getTeacherSubjects = (t: any): string[] => {
  if (!t) return [];
  const found: string[] = [];

  const extract = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach((item) => extract(item));
      return;
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => extract(p));
            return;
          }
        } catch (e) {}
      }
      trimmed.split(",").forEach((s) => {
        const clean = s.trim();
        if (clean) found.push(clean);
      });
      return;
    }
    if (typeof val === "object") {
      const name = val.name || val.subject_name || val.subject || "";
      if (typeof name === "string" && name.trim()) {
        found.push(name.trim());
      }
    }
  };

  extract(t.subjects);
  extract(t.subjects_taught);
  extract(t.subject);

  let extras = t.extras;
  if (typeof extras === "string") {
    try {
      extras = JSON.parse(extras);
    } catch (e) {
      extras = null;
    }
  }
  if (extras && typeof extras === "object") {
    extract(extras.subjects);
    extract(extras.subject);
    extract(extras.subjects_taught);
  }

  let extrasData = t.extras_data;
  if (typeof extrasData === "string") {
    try {
      extrasData = JSON.parse(extrasData);
    } catch (e) {
      extrasData = null;
    }
  }
  if (extrasData && typeof extrasData === "object") {
    extract(extrasData.subjects);
    extract(extrasData.subject);
  }

  if (t.user) {
    extract(t.user.subjects);
    let uExtras = t.user.extras;
    if (typeof uExtras === "string") {
      try {
        uExtras = JSON.parse(uExtras);
      } catch (e) {
        uExtras = null;
      }
    }
    if (uExtras && typeof uExtras === "object") {
      extract(uExtras.subjects);
    }
  }

  return Array.from(new Set(found));
};

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
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Tab 3 states
  const [isLoadingGrid, setIsLoadingGrid] = useState(false);
  const [timeConfig, setTimeConfig] = useState<any>(null);
  const [gridData, setGridData] = useState<any[]>([]);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [tempTimeConfig, setTempTimeConfig] = useState<any>(null);
  const [clashWarnings, setClashWarnings] = useState<Record<string, string>>({});
  const [isSavingGrid, setIsSavingGrid] = useState(false);

  const getSelectedContextName = () => {
    const clsName = classes.find((c) => c.id === selectedClassId)?.name || "";
    const secName = sections.find((s) => s.id === selectedSectionId)?.name || "";
    if (clsName && secName) return `Class ${clsName} (Section ${secName})`;
    if (clsName) return `Class ${clsName}`;
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

  // 1. Fetch Classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/classes");
        const data = res.data || [];
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].id);
      } catch (error) {
        toast.error("Failed to load classes");
      }
    };
    fetchClasses();
  }, []);

  // 2. Fetch SECTIONS when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId("");
      return;
    }

    const currentClass = classes.find((c) => c.id === selectedClassId);
    if (
      currentClass?.sections &&
      Array.isArray(currentClass.sections) &&
      currentClass.sections.length > 0
    ) {
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
        if (secData.length > 0) {
          setSelectedSectionId(secData[0].id);
        } else {
          setSelectedSectionId("");
        }
      } catch (error) {
        setSections([]);
        setSelectedSectionId("");
      } finally {
        setIsLoadingSections(false);
      }
    };
    fetchSections();
  }, [selectedClassId, classes]);

  // 3. Fetch SUBJECTS per Class + Section
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchSubjects = async () => {
      setIsLoading(true);
      try {
        let url = `/class-subjects?class_id=${selectedClassId}`;
        if (selectedSectionId) {
          url += `&section_id=${selectedSectionId}`;
        }
        const res = await api.get(url);
        setClassSubjects(res.data || []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, [selectedClassId, selectedSectionId]);

  // 4. Fetch API Suggestions as user types
  useEffect(() => {
    if (subjectQuery.trim() === "") {
      setApiSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const res = await api.get(`/class-subjects/suggestions?query=${subjectQuery}`);
        setApiSuggestions(res.data.suggestions || []);
      } catch (error) {
        setApiSuggestions([]);
      }
    };
    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [subjectQuery]);

  // 5. Load Teachers + Assignments + Workloads when Tab 2 or 3 opens
  useEffect(() => {
    if ((activeTab !== "teachers" && activeTab !== "timetable") || !selectedClassId) return;

    const loadData = async () => {
      setIsLoadingTeachers(true);
      try {
        let teacherList: any[] = [];
        try {
          const r = await api.get("/staff?role=teacher");
          teacherList = Array.isArray(r.data) ? r.data : r.data?.items || r.data?.data || [];
        } catch {
          try {
            const r2 = await api.get("/staff");
            const all = Array.isArray(r2.data) ? r2.data : r2.data?.items || [];
            teacherList = all;
          } catch {
            teacherList = [];
          }
        }

        const enrichedTeachers = await Promise.all(
          teacherList.map(async (t) => {
            const staffId = t.id || t.user_id || t.user?.id;
            if (!staffId) return t;
            try {
              const detailRes = await api.get(`/staff/${staffId}`);
              return { ...t, ...detailRes.data, extras: detailRes.data?.extras || t.extras };
            } catch {
              return t;
            }
          })
        );
        setTeachers(enrichedTeachers);

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

    loadData();
  }, [activeTab, selectedClassId, selectedSectionId]);

  // 6. Load Tab 3 Grid Data
  useEffect(() => {
    if (activeTab !== "timetable" || !selectedClassId) return;
    const loadGrid = async () => {
      setIsLoadingGrid(true);
      try {
        const tcRes = await api.get(
          `/timetable-grid/time-config?class_id=${selectedClassId}&section=${selectedSectionId}`
        );
        setTimeConfig(tcRes.data);

        const gridRes = await api.get(
          `/timetable-grid/grid?class_id=${selectedClassId}&section=${selectedSectionId}`
        );
        setGridData(gridRes.data || []);
      } catch (error) {
        toast.error("Failed to load timetable grid");
      } finally {
        setIsLoadingGrid(false);
      }
    };
    loadGrid();
  }, [activeTab, selectedClassId, selectedSectionId]);

  const getDisplayedChips = () => {
    let chips: any[] = [];
    if (subjectQuery.trim().length > 0) {
      if (apiSuggestions.length > 0) {
        chips = apiSuggestions.map((s) => ({
          name: s.name,
          color: s.suggested_color || "#3B82F6",
        }));
      } else {
        chips = QUICK_SUBJECTS.filter((s) =>
          s.name.toLowerCase().includes(subjectQuery.toLowerCase())
        );
      }
    } else {
      chips = QUICK_SUBJECTS;
    }
    const addedNames = classSubjects.map((cs) => cs.subject_name.toLowerCase());
    return chips.filter((chip) => !addedNames.includes(chip.name.toLowerCase())).slice(0, 12);
  };

  const displayedChips = getDisplayedChips();
  const exactMatchExists =
    displayedChips.some((c) => c.name.toLowerCase() === subjectQuery.toLowerCase().trim()) ||
    classSubjects.some((cs) => cs.subject_name.toLowerCase() === subjectQuery.toLowerCase().trim());

  const handleAddSubject = async (name: string, color: string = "#3B82F6", isCustom: boolean = false) => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }

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
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || "Failed to add subject";
      toast.error(msg);
    } finally {
      setIsAddingId(null);
    }
  };

  const handleUpdatePeriods = async (subjectId: string, currentPeriods: number, delta: number) => {
    const newPeriods = currentPeriods + delta;
    if (newPeriods < 1 || newPeriods > 20) return;

    setUpdatingId(subjectId);
    try {
      await api.patch(`/class-subjects/${subjectId}`, {
        periods_per_week: newPeriods,
      });

      setClassSubjects((prev) =>
        prev.map((s) => (s.id === subjectId ? { ...s, periods_per_week: newPeriods } : s))
      );
      toast.success(`Updated to ${newPeriods} periods/week`);
    } catch (error: any) {
      toast.error("Failed to update periods");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteSubject = async (subjectId: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await api.delete(`/class-subjects/${subjectId}`);
      setClassSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      toast.success("Subject removed");
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to remove");
    }
  };

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

      try {
        const wRes = await api.get("/teacher-assignments/workload/all");
        setWorkloads(wRes.data || []);
      } catch {}

      if (res.data?.is_overloaded) {
        toast.warning(
          `${res.data.teacher_name} is now at ${res.data.current_workload}/30 periods - overloaded, but saved.`
        );
      } else {
        toast.success(`Assigned to ${res.data.teacher_name}`);
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail || e.response?.data?.message || e.message;
      toast.error(typeof detail === "string" ? detail : "Failed to assign teacher");
    } finally {
      setAssigningId(null);
    }
  };

  const getAssignedTeacherValue = (assignedObj: any) => {
    if (!assignedObj) return "";
    const aTeacherId = assignedObj.teacher_id;
    const aStaffId = assignedObj.staff_id;

    const match = teachers.find(
      (t) =>
        t.id === aTeacherId ||
        t.user_id === aTeacherId ||
        t.user?.id === aTeacherId ||
        t.id === aStaffId ||
        t.user_id === aStaffId
    );

    if (match) {
      return match.id || match.user_id || match.user?.id;
    }
    return aTeacherId || aStaffId || "";
  };

  const assignedCount = useMemo(() => {
    return classSubjects.filter((s) => assignments[s.id]?.teacher_id).length;
  }, [classSubjects, assignments]);

  // ================= TAB 3 DRAG & DROP & GRID LOGIC =================

  const handleDragStart = (e: React.DragEvent, subjectId: string) => {
    e.dataTransfer.setData("subject_id", subjectId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, day: string, periodNumber: number) => {
    e.preventDefault();
    const subjectId = e.dataTransfer.getData("subject_id");
    if (!subjectId) return;

    const sub = classSubjects.find((s) => s.id === subjectId);
    if (!sub) return;

    const assigned = assignments[subjectId];
    const teacherId = assigned ? getAssignedTeacherValue(assigned) : null;
    let teacherNameStr = null;
    
    if (teacherId) {
      const t = teachers.find((t) => (t.id || t.user_id || t.user?.id) === teacherId);
      teacherNameStr = t ? teacherName(t) : null;
    }

    const newEntry = {
      day_of_week: day,
      period_number: periodNumber,
      subject_id: sub.id,
      subject_name: sub.subject_name,
      teacher_id: teacherId || null,
      teacher_name: teacherNameStr,
      slot_type: "CLASS",
      color_code: sub.color_code
    };

    setGridData((prev) => {
      const filtered = prev.filter((g) => !(g.day_of_week === day && g.period_number === periodNumber));
      return [...filtered, newEntry];
    });

    if (teacherId) {
      try {
        const res = await api.post("/timetable-grid/check-clash", {
          teacher_id: teacherId,
          day_of_week: day,
          period_number: periodNumber,
        });
        if (res.data.has_clash) {
          toast.error(res.data.message);
          setClashWarnings((prev) => ({ ...prev, [`${day}-${periodNumber}`]: res.data.message }));
        } else {
          setClashWarnings((prev) => {
            const clone = { ...prev };
            delete clone[`${day}-${periodNumber}`];
            return clone;
          });
        }
      } catch (err) {
        console.error("Clash check failed", err);
      }
    }
  };

  const handleRemoveCell = (day: string, periodNumber: number) => {
    setGridData((prev) => prev.filter((g) => !(g.day_of_week === day && g.period_number === periodNumber)));
    setClashWarnings((prev) => {
      const clone = { ...prev };
      delete clone[`${day}-${periodNumber}`];
      return clone;
    });
  };

  const handleBulkSave = async () => {
    setIsSavingGrid(true);
    try {
      const payload = {
        class_id: selectedClassId,
        section: selectedSectionId,
        entries: gridData,
        replace_all: true,
      };
      const res = await api.post("/timetable-grid/grid/bulk-save", payload);
      toast.success(res.data.message || "Timetable saved successfully");
    } catch (e: any) {
      const msg = e.response?.data?.detail || "Failed to save timetable";
      toast.error(typeof msg === "string" ? msg : "Error saving");
    } finally {
      setIsSavingGrid(false);
    }
  };

  const handleClearGrid = async () => {
    if (!confirm("Are you sure you want to clear the entire grid?")) return;
    try {
      await api.delete(`/timetable-grid/grid?class_id=${selectedClassId}&section=${selectedSectionId}`);
      setGridData([]);
      setClashWarnings({});
      toast.success("Grid cleared");
    } catch (e) {
      toast.error("Failed to clear grid");
    }
  };

  const openTimeConfigModal = () => {
    setTempTimeConfig(
      timeConfig || {
        working_days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
        period_slots: [],
      }
    );
    setIsTimeModalOpen(true);
  };

  const saveTimeConfig = async () => {
    try {
      const payload = {
        working_days: tempTimeConfig.working_days,
        period_slots: tempTimeConfig.period_slots,
        class_id: selectedClassId,
        section: selectedSectionId,
        apply_to_all: false,
      };
      const res = await api.post("/timetable-grid/time-config", payload);
      setTimeConfig(res.data);
      setIsTimeModalOpen(false);
      toast.success("Time configuration saved");
    } catch (e) {
      toast.error("Failed to save time config");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Smart Timetable Builder</h1>
          <p className="text-slate-400 text-sm mt-1">
            Setup section-wise subjects, assign teachers, and build schedules.
          </p>
        </div>
      </div>

      {/* 3-TAB NAVIGATION */}
      <div className="flex bg-[#111827] border border-slate-800 p-1.5 rounded-xl w-fit shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab("subjects")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            activeTab === "subjects"
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <BookOpen className="w-4 h-4" /> 1. Subjects Setup
        </button>
        <button
          onClick={() => setActiveTab("teachers")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            activeTab === "teachers"
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" /> 2. Assign Teachers
        </button>
        <button
          onClick={() => setActiveTab("timetable")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            activeTab === "timetable"
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <CalendarDays className="w-4 h-4" /> 3. Build Grid
        </button>
      </div>

      {/* GLOBAL SELECTORS */}
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
            <option value="" disabled className="text-slate-500">
              -- Choose Class --
            </option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px] max-w-xs relative">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            Select Section
            {isLoadingSections && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={sections.length === 0}
            className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sections.length === 0 ? (
              <option value="">No sections found</option>
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

      {/* TAB 1: SUBJECTS SETUP */}
      {activeTab === "subjects" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
                  >
                    {isAddingId === chip.name ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-slate-400" style={{ color: chip.color }} />
                    )}
                    {chip.name}
                  </button>
                ))}

                {subjectQuery.trim() !== "" && !exactMatchExists && (
                  <button
                    disabled={isAddingId === subjectQuery.trim()}
                    onClick={() => handleAddSubject(subjectQuery.trim(), "#6B7280", true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 rounded-lg text-sm text-blue-300 transition-colors"
                  >
                    {isAddingId === subjectQuery.trim() ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Add "{subjectQuery.trim()}"
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 shadow-sm min-h-[400px]">
              <h3 className="font-bold text-white flex items-center justify-between mb-5">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  Configured Subjects
                </span>
                <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                  Total: {classSubjects.length}
                </span>
              </h3>

              {isLoading ? (
                <div className="flex justify-center py-20 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : classSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  <p className="text-sm font-medium text-slate-300">No subjects configured</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classSubjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shadow-inner"
                          style={{
                            backgroundColor: `${sub.color_code}20`,
                            border: `1px solid ${sub.color_code}40`,
                          }}
                        >
                          <BookOpen className="w-4 h-4" style={{ color: sub.color_code }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{sub.subject_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1.5 bg-[#0f172a] border border-slate-700 rounded-lg px-2 py-0.5">
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
                      </div>
                      <button
                        onClick={() => handleDeleteSubject(sub.id, sub.subject_name)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"
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

      {/* TAB 2: ASSIGN TEACHERS */}
      {activeTab === "teachers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 min-h-[420px]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  Assign Teachers
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
                  <p className="text-sm text-slate-300 font-medium">No subjects found</p>
                </div>
              ) : teachers.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  <Users className="w-10 h-10 mb-3 text-slate-600" />
                  <p className="text-sm text-slate-300 font-medium">No teachers found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classSubjects.map((sub) => {
                    const assigned = assignments[sub.id];
                    const isAssigning = assigningId === sub.id;
                    const selectedVal = getAssignedTeacherValue(assigned);

                    const matchingTeachers = teachers.filter((t) => {
                      const tSubjs = getTeacherSubjects(t);
                      return tSubjs.some((ts) => matchSubjects(sub.subject_name, ts));
                    });

                    const dropdownTeachers = matchingTeachers.length > 0 ? matchingTeachers : teachers;

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
                            <p className="text-sm font-bold text-white truncate">
                              {sub.subject_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {sub.periods_per_week} periods/week
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:w-[260px]">
                          {isAssigning ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm w-full justify-center py-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                            </div>
                          ) : (
                            <select
                              value={selectedVal}
                              onChange={(e) => handleAssignTeacher(sub.id, e.target.value)}
                              className="w-full bg-[#0f172a] border border-slate-600 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-blue-500"
                            >
                              <option value="">-- Select Teacher --</option>
                              {dropdownTeachers.map((t) => (
                                <option key={t.id} value={t.id || t.user_id || t.user?.id}>
                                  {teacherName(t)} {getTeacherSubjects(t).length > 0 ? `(${getTeacherSubjects(t).join(",")})` : ""}
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

          <div className="lg:col-span-1">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 sticky top-4">
              <h3 className="font-bold text-white flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" /> Teacher Workload
              </h3>
              <p className="text-xs text-slate-500 mb-4">Max {MAX_PERIODS} periods/week</p>
              
              {isLoadingTeachers ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : workloads.length === 0 && teachers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No data</p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {teachers.map((t) => {
                    const tid = t.user_id || t.user?.id || t.id;
                    const w = workloads.find(
                      (item: any) => item.teacher_id === tid || item.staff_id === t.id
                    ) || { total_periods: 0, max_periods: MAX_PERIODS };

                    const periods = w.total_periods || 0;
                    const maxP = w.max_periods || MAX_PERIODS;
                    const pct = Math.min(100, Math.round((periods / maxP) * 100));
                    const isOver = periods > maxP;
                    
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-xl border ${isOver ? "border-red-800/50 bg-red-950/20" : "border-slate-700/50 bg-slate-800/30"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-white truncate pr-2">{teacherName(t)}</p>
                          <span className={`text-xs font-bold ${isOver ? "text-red-400" : "text-slate-400"}`}>{periods}/{maxP}</span>
                        </div>
                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isOver ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BUILD GRID */}
      {activeTab === "timetable" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-400" /> Grid Builder
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={openTimeConfigModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-all"
              >
                <Settings className="w-4 h-4" /> Time Slots
              </button>
              <button
                onClick={handleClearGrid}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-950/30 hover:bg-red-900/50 border border-red-900 text-red-400 rounded-lg text-sm font-medium transition-all"
              >
                <Trash2 className="w-4 h-4" /> Clear
              </button>
              <button
                onClick={handleBulkSave}
                disabled={isSavingGrid}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              >
                {isSavingGrid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Timetable
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* LEFT PANEL: DRAGGABLE CHIPS */}
            <div className="w-full lg:w-72 shrink-0 bg-[#111827] border border-slate-800 rounded-2xl p-4 self-start">
              <h3 className="font-semibold text-white mb-3 flex items-center justify-between">
                <span>Subjects</span>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{classSubjects.length} items</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">Drag and drop these subjects into the grid cells.</p>
              
              <div className="space-y-3">
                {classSubjects.map(sub => {
                  const assigned = assignments[sub.id];
                  const teacherId = assigned ? getAssignedTeacherValue(assigned) : null;
                  const t = teacherId ? teachers.find(t => (t.id || t.user_id || t.user?.id) === teacherId) : null;
                  const tName = t ? teacherName(t) : "Unassigned";

                  const usedCount = gridData.filter(g => g.subject_id === sub.id).length;
                  const isDone = usedCount >= sub.periods_per_week;

                  return (
                    <div
                      key={sub.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, sub.id)}
                      className={`p-3 rounded-xl border flex flex-col gap-2 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-transform ${
                        isDone ? "bg-emerald-950/20 border-emerald-900/50" : "bg-slate-800 border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-slate-500" />
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: sub.color_code || "#3b82f6" }}
                          />
                          <span className="text-sm font-bold text-white">{sub.subject_name}</span>
                        </div>
                        <span className={`text-xs font-bold ${isDone ? "text-emerald-400" : "text-blue-400"}`}>
                          {usedCount}/{sub.periods_per_week}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 pl-6">
                        <UserCheck className="w-3 h-3" /> {tName}
                      </div>
                      <div className="h-1 bg-slate-900 rounded-full mt-1 overflow-hidden">
                         <div 
                           className={`h-full ${isDone ? "bg-emerald-500" : "bg-blue-500"}`} 
                           style={{ width: `${Math.min(100, (usedCount / sub.periods_per_week) * 100)}%`}} 
                         />
                      </div>
                    </div>
                  );
                })}
                {classSubjects.length === 0 && (
                   <p className="text-sm text-slate-500 text-center py-4">No subjects added.</p>
                )}
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="flex-1 bg-[#111827] border border-slate-800 rounded-2xl p-4 overflow-x-auto">
               {isLoadingGrid ? (
                  <div className="flex flex-col items-center justify-center py-20 h-[400px]">
                     <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                     <p className="text-slate-400">Loading Grid Configuration...</p>
                  </div>
               ) : !timeConfig ? (
                  <div className="flex flex-col items-center justify-center py-20 h-[400px] border-2 border-dashed border-slate-800 rounded-xl">
                     <Clock className="w-10 h-10 text-slate-600 mb-3" />
                     <p className="text-white font-medium">Time Slots Not Configured</p>
                     <button onClick={openTimeConfigModal} className="mt-3 text-blue-400 text-sm hover:underline">
                        Setup Time Slots Now
                     </button>
                  </div>
               ) : (
                  <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr>
                        <th className="p-3 border-b border-r border-slate-700 bg-slate-800/50 text-slate-300 font-semibold w-24 text-center">
                          Day
                        </th>
                        {timeConfig.period_slots.map((p: any, idx: number) => (
                          <th key={idx} className="p-2 border-b border-r border-slate-700 bg-slate-800/30 text-center min-w-[120px]">
                            <div className="font-bold text-slate-200">{p.name}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{p.start} - {p.end}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(timeConfig.working_days || []).map((day: string) => (
                        <tr key={day} className="border-b border-slate-800 hover:bg-slate-800/10">
                          <td className="p-3 border-r border-slate-700 text-slate-300 font-bold text-center bg-slate-800/20 uppercase">
                            {day.substring(0, 3)}
                          </td>
                          {timeConfig.period_slots.map((p: any, idx: number) => {
                            if (p.type === "BREAK" || p.type === "LUNCH") {
                               return (
                                 <td key={idx} className="p-2 border-r border-slate-800 bg-amber-900/10 text-center">
                                    <div className="text-amber-500/50 text-xs font-bold uppercase tracking-widest rotate-180" style={{ writingMode: 'vertical-rl' }}>
                                      {p.type}
                                    </div>
                                 </td>
                               )
                            }

                            const cell = gridData.find(g => g.day_of_week === day && g.period_number === p.period);
                            const hasClash = clashWarnings[`${day}-${p.period}`];

                            return (
                              <td
                                key={idx}
                                className={`p-2 border-r border-slate-800 transition-all ${
                                  cell ? (hasClash ? "bg-red-950/20 border-red-900/50" : "bg-blue-950/10 hover:bg-blue-900/20") : "bg-[#0f172a] hover:bg-slate-800/50"
                                }`}
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                                onDrop={(e) => handleDrop(e, day, p.period)}
                              >
                                {cell ? (
                                   <div className={`relative group flex flex-col items-center justify-center p-2 rounded-lg border ${hasClash ? 'border-red-500/50' : 'border-blue-800/50'}`}>
                                      <div className="text-xs font-bold text-white text-center mb-1 leading-tight">
                                        {cell.subject_name}
                                      </div>
                                      <div className="text-[10px] text-slate-400 text-center max-w-full truncate px-1">
                                        {cell.teacher_name || "No Teacher"}
                                      </div>
                                      {hasClash && (
                                         <div className="absolute -top-2 -right-2 bg-red-600 rounded-full p-0.5 shadow-lg group-hover:scale-110 transition-transform" title={hasClash}>
                                            <AlertTriangle className="w-3 h-3 text-white" />
                                         </div>
                                      )}
                                      <button 
                                        onClick={() => handleRemoveCell(day, p.period)}
                                        className="absolute -top-2 -left-2 bg-slate-700 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                   </div>
                                ) : (
                                   <div className="w-full h-full min-h-[60px] flex items-center justify-center border-2 border-dashed border-slate-700/50 rounded-lg text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                                     Drop
                                   </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
               )}
            </div>
          </div>
        </div>
      )}

      {/* TIME CONFIG MODAL */}
      {isTimeModalOpen && tempTimeConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
             <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                   <Clock className="w-5 h-5 text-blue-400" />
                   Configure Time Slots
                </h2>
                <button onClick={() => setIsTimeModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="p-5 overflow-y-auto flex-1 space-y-6">
                <div>
                   <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">Working Days</label>
                   <div className="flex flex-wrap gap-2">
                     {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d => {
                        const active = tempTimeConfig.working_days.includes(d);
                        return (
                          <button
                            key={d}
                            onClick={() => {
                               setTempTimeConfig((prev: any) => ({
                                  ...prev,
                                  working_days: active ? prev.working_days.filter((x: string) => x !== d) : [...prev.working_days, d]
                               }))
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                              active ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            {d}
                          </button>
                        )
                     })}
                   </div>
                </div>

                <div>
                   <div className="flex items-center justify-between mb-3">
                     <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Periods & Breaks</label>
                     <button 
                       onClick={() => {
                          const newP = {
                             period: tempTimeConfig.period_slots.length + 1,
                             name: `P${tempTimeConfig.period_slots.length + 1}`,
                             start: "00:00",
                             end: "00:00",
                             type: "CLASS"
                          };
                          setTempTimeConfig((p: any) => ({ ...p, period_slots: [...p.period_slots, newP] }));
                       }}
                       className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
                     >
                       <Plus className="w-3 h-3" /> Add Slot
                     </button>
                   </div>
                   
                   <div className="space-y-2">
                     {tempTimeConfig.period_slots.map((slot: any, idx: number) => (
                        <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-[#0f172a] p-2 rounded-lg border border-slate-800">
                           <input 
                             type="text" 
                             value={slot.name}
                             onChange={(e) => {
                                const arr = [...tempTimeConfig.period_slots];
                                arr[idx].name = e.target.value;
                                setTempTimeConfig({...tempTimeConfig, period_slots: arr});
                             }}
                             className="w-20 bg-slate-900 border border-slate-700 text-white text-sm rounded px-2 py-1.5 outline-none"
                             placeholder="Name (P1)"
                           />
                           <input 
                             type="time" 
                             value={slot.start}
                             onChange={(e) => {
                                const arr = [...tempTimeConfig.period_slots];
                                arr[idx].start = e.target.value;
                                setTempTimeConfig({...tempTimeConfig, period_slots: arr});
                             }}
                             className="w-28 bg-slate-900 border border-slate-700 text-white text-sm rounded px-2 py-1.5 outline-none"
                           />
                           <span className="text-slate-500 text-xs">to</span>
                           <input 
                             type="time" 
                             value={slot.end}
                             onChange={(e) => {
                                const arr = [...tempTimeConfig.period_slots];
                                arr[idx].end = e.target.value;
                                setTempTimeConfig({...tempTimeConfig, period_slots: arr});
                             }}
                             className="w-28 bg-slate-900 border border-slate-700 text-white text-sm rounded px-2 py-1.5 outline-none"
                           />
                           <select 
                             value={slot.type}
                             onChange={(e) => {
                                const arr = [...tempTimeConfig.period_slots];
                                arr[idx].type = e.target.value;
                                setTempTimeConfig({...tempTimeConfig, period_slots: arr});
                             }}
                             className="w-28 bg-slate-900 border border-slate-700 text-white text-sm rounded px-2 py-1.5 outline-none"
                           >
                              <option value="CLASS">Class</option>
                              <option value="BREAK">Break</option>
                              <option value="LUNCH">Lunch</option>
                           </select>
                           
                           <button 
                             onClick={() => {
                               const arr = tempTimeConfig.period_slots.filter((_: any, i: number) => i !== idx);
                               // Re-index periods
                               arr.forEach((a: any, i: number) => { a.period = i + 1; });
                               setTempTimeConfig({...tempTimeConfig, period_slots: arr});
                             }}
                             className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg ml-auto"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     ))}
                   </div>
                </div>
             </div>

             <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
                <button 
                  onClick={() => setIsTimeModalOpen(false)}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveTimeConfig}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 shadow-lg shadow-blue-900/20"
                >
                  <Save className="w-4 h-4" /> Save Configuration
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}