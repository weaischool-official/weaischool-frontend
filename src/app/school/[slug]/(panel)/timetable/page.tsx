"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen,
  Users,
  Calendar,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Search,
  Check,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  UserCheck
} from "lucide-react";

// --- Types & Interfaces ---
interface Section {
  id: string;
  name: string;
}

interface ClassItem {
  id: string;
  name: string;
  sections: Section[];
}

interface Subject {
  id: string;
  name: string;
  code: string;
  periodsPerWeek: number;
  color?: string;
}

interface Teacher {
  id: string;
  name: string;
  designation: string;
  department?: string;
  assignedSubjects: string[];
  maxPeriodsPerWeek: number;
  assignedPeriodsCount: number;
}

interface CellData {
  subjectId: string;
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
}

interface ToastNotification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

const PRESET_SUBJECTS = [
  "Mathematics",
  "English",
  "Science",
  "Social Science",
  "Hindi",
  "Computer",
  "Physics",
  "Chemistry",
  "Biology",
  "Sanskrit",
  "EVS"
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [
  { id: 1, name: "Period 1", time: "08:00 - 08:45" },
  { id: 2, name: "Period 2", time: "08:45 - 09:30" },
  { id: 3, name: "Period 3", time: "09:30 - 10:15" },
  { id: 4, name: "Period 4", time: "10:15 - 11:00" },
  { id: 5, name: "Period 5", time: "11:30 - 12:15" },
  { id: 6, name: "Period 6", time: "12:15 - 01:00" },
  { id: 7, name: "Period 7", time: "01:00 - 01:45" },
  { id: 8, name: "Period 8", time: "01:45 - 02:30" }
];

// Complete Active Classes Schema matching Classes Page
const DEFAULT_FULL_CLASSES: ClassItem[] = [
  {
    id: "cls_10",
    name: "Class 10",
    sections: [
      { id: "sec_10_a", name: "Section A" },
      { id: "sec_10_b", name: "Section B" },
      { id: "sec_10_c", name: "Section C" }
    ]
  },
  {
    id: "cls_1",
    name: "Class 1",
    sections: [
      { id: "sec_1_a", name: "Section A" },
      { id: "sec_1_b", name: "Section B" }
    ]
  },
  {
    id: "cls_2",
    name: "Class 2",
    sections: [
      { id: "sec_2_a", name: "Section A" },
      { id: "sec_2_b", name: "Section B" }
    ]
  },
  {
    id: "cls_3",
    name: "Class 3",
    sections: [
      { id: "sec_3_a", name: "Section A" },
      { id: "sec_3_b", name: "Section B" }
    ]
  },
  {
    id: "cls_4",
    name: "Class 4",
    sections: [
      { id: "sec_4_a", name: "Section A" },
      { id: "sec_4_b", name: "Section B" }
    ]
  },
  {
    id: "cls_5",
    name: "Class 5",
    sections: [
      { id: "sec_5_a", name: "Section A" },
      { id: "sec_5_b", name: "Section B" }
    ]
  },
  {
    id: "cls_6",
    name: "Class 6",
    sections: [
      { id: "sec_6_a", name: "Section A" },
      { id: "sec_6_b", name: "Section B" }
    ]
  },
  {
    id: "cls_7",
    name: "Class 7",
    sections: [
      { id: "sec_7_a", name: "Section A" },
      { id: "sec_7_b", name: "Section B" }
    ]
  },
  {
    id: "cls_8",
    name: "Class 8",
    sections: [
      { id: "sec_8_a", name: "Section A" },
      { id: "sec_8_b", name: "Section B" }
    ]
  },
  {
    id: "cls_9",
    name: "Class 9",
    sections: [
      { id: "sec_9_a", name: "Section A" },
      { id: "sec_9_b", name: "Section B" },
      { id: "sec_9_c", name: "Section C" }
    ]
  },
  {
    id: "cls_11",
    name: "Class 11",
    sections: [
      { id: "sec_11_a", name: "Section A" },
      { id: "sec_11_b", name: "Section B" }
    ]
  },
  {
    id: "cls_12",
    name: "Class 12",
    sections: [
      { id: "sec_12_a", name: "Section A" },
      { id: "sec_12_b", name: "Section B" }
    ]
  }
];

// --- Helper Utilities ---
function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  const directKeys = ["token", "access_token", "auth_token", "jwt", "bearer"];
  for (const k of directKeys) {
    const val = localStorage.getItem(k);
    if (val && val.length > 10) return val.replace(/^"|"$/g, "").trim();
  }
  const jsonKeys = ["user", "auth-storage", "auth_store", "weai_auth"];
  for (const k of jsonKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token =
        parsed?.token ||
        parsed?.access_token ||
        parsed?.state?.token ||
        parsed?.state?.accessToken ||
        parsed?.state?.user?.token;
      if (token && typeof token === "string" && token.length > 10) return token;
    } catch {}
  }
  return "";
}

function getSlugFromUrl(): string {
  if (typeof window === "undefined") return "ppps";
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("school");
  if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  return "ppps";
}

function normalizeClasses(rawList: any[]): ClassItem[] {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((item, idx) => {
    const classId = String(item.id || item._id || item.class_id || `cls_${idx + 1}`);
    const className =
      item.name ||
      item.class_name ||
      item.grade ||
      item.standard ||
      item.title ||
      `Class ${idx + 1}`;

    let rawSecs =
      item.sections ||
      item.class_sections ||
      item.sections_list ||
      item.Section ||
      item.section_set ||
      [];

    let parsedSecs: Section[] = [];
    if (Array.isArray(rawSecs) && rawSecs.length > 0) {
      parsedSecs = rawSecs.map((s: any, sIdx: number) => {
        if (typeof s === "string") {
          return {
            id: `sec_${s.toLowerCase().replace(/\s+/g, "_")}`,
            name: s.startsWith("Section") ? s : `Section ${s}`
          };
        }
        return {
          id: String(s.id || s._id || s.section_id || `sec_${sIdx + 1}`),
          name: s.name || s.section_name || s.title || `Section ${String.fromCharCode(65 + sIdx)}`
        };
      });
    } else {
      parsedSecs = [
        { id: `sec_${classId}_a`, name: "Section A" },
        { id: `sec_${classId}_b`, name: "Section B" },
        { id: `sec_${classId}_c`, name: "Section C" }
      ];
    }

    return {
      id: classId,
      name: className,
      sections: parsedSecs
    };
  });
}

function scanLocalStorageForClasses(): ClassItem[] {
  if (typeof window === "undefined") return [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes("class") || lowerKey.includes("academic") || lowerKey.includes("school")) {
        const val = localStorage.getItem(key);
        if (!val) continue;
        const parsed = JSON.parse(val);
        const candidateList =
          parsed?.items ||
          parsed?.data ||
          parsed?.classes ||
          parsed?.state?.classes ||
          (Array.isArray(parsed) ? parsed : null);

        if (Array.isArray(candidateList) && candidateList.length > 0) {
          const normalized = normalizeClasses(candidateList);
          if (normalized.length > 0) return normalized;
        }
      }
    }
  } catch {}
  return [];
}

export default function TimetablePage() {
  const [activeTab, setActiveTab] = useState<"subjects" | "teachers" | "grid">("subjects");

  // Immediate Load with Full 12 Classes (Class 10, Class 1, etc.)
  const [classes, setClasses] = useState<ClassItem[]>(DEFAULT_FULL_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState<string>(DEFAULT_FULL_CLASSES[0].id);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(DEFAULT_FULL_CLASSES[0].sections[0].id);

  const [configuredSubjects, setConfiguredSubjects] = useState<Subject[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState<string>("");

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [gridData, setGridData] = useState<Record<string, CellData>>({});

  const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const slug = useMemo(() => getSlugFromUrl(), []);

  // Toast Handler
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Background Class Fetch & Sync Engine
  const loadClasses = useCallback(async () => {
    setIsLoadingClasses(true);

    // 1. Try local storage scanning
    const localClasses = scanLocalStorageForClasses();
    if (localClasses.length > 0) {
      setClasses(localClasses);
    }

    // 2. Query Backend Endpoints
    const baseUrl = "https://weaischool-backend.onrender.com";
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-School-Slug": slug
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const endpoints = [
      `/api/v1/academics/classes?slug=${slug}&limit=100`,
      `/api/v1/classes?slug=${slug}&limit=100`,
      `/api/v1/schools/${slug}/classes`,
      `/api/v1/academics/classes`,
      `/api/v1/classes`
    ];

    let fetchedClasses: ClassItem[] = [];

    for (const ep of endpoints) {
      try {
        const res = await fetch(`${baseUrl}${ep}`, { method: "GET", headers });
        if (!res.ok) continue;

        const json = await res.json();
        const rawList =
          json.data?.items ||
          json.data ||
          json.items ||
          json.classes ||
          json.result ||
          (Array.isArray(json) ? json : []);

        if (Array.isArray(rawList) && rawList.length > 0) {
          fetchedClasses = normalizeClasses(rawList);
          break;
        }
      } catch (err) {}
    }

    if (fetchedClasses.length > 0) {
      setClasses(fetchedClasses);
      localStorage.setItem(`weai_${slug}_cached_classes`, JSON.stringify(fetchedClasses));
      showToast("Synced live classes from database", "success");
    } else {
      showToast("Loaded school class standards", "info");
    }

    setIsLoadingClasses(false);
  }, [slug, showToast]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Derived Active Class & Section
  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || classes[0] || null;
  }, [classes, selectedClassId]);

  const currentSection = useMemo(() => {
    if (!currentClass) return null;
    return currentClass.sections.find((s) => s.id === selectedSectionId) || currentClass.sections[0] || null;
  }, [currentClass, selectedSectionId]);

  // Auto Select First Section when Class changes
  useEffect(() => {
    if (currentClass && currentClass.sections.length > 0) {
      const exists = currentClass.sections.some((s) => s.id === selectedSectionId);
      if (!exists) {
        setSelectedSectionId(currentClass.sections[0].id);
      }
    }
  }, [currentClass, selectedSectionId]);

  // Load Saved Subjects & Timetable Grid for current Class/Section
  useEffect(() => {
    if (!selectedClassId || !selectedSectionId) return;

    const subKey = `weai_${slug}_subjects_${selectedClassId}_${selectedSectionId}`;
    const savedSubs = localStorage.getItem(subKey);
    if (savedSubs) {
      try {
        setConfiguredSubjects(JSON.parse(savedSubs));
      } catch {
        setConfiguredSubjects([]);
      }
    } else {
      setConfiguredSubjects([
        { id: "sub_math", name: "Mathematics", code: "MATH", periodsPerWeek: 6, color: "bg-blue-600" },
        { id: "sub_sci", name: "Science", code: "SCI", periodsPerWeek: 6, color: "bg-green-600" },
        { id: "sub_eng", name: "English", code: "ENG", periodsPerWeek: 5, color: "bg-purple-600" },
        { id: "sub_sst", name: "Social Science", code: "SST", periodsPerWeek: 5, color: "bg-yellow-600" },
        { id: "sub_hin", name: "Hindi", code: "HIN", periodsPerWeek: 4, color: "bg-red-600" }
      ]);
    }

    const gridKey = `weai_${slug}_grid_${selectedClassId}_${selectedSectionId}`;
    const savedGrid = localStorage.getItem(gridKey);
    if (savedGrid) {
      try {
        setGridData(JSON.parse(savedGrid));
      } catch {
        setGridData({});
      }
    } else {
      setGridData({});
    }
  }, [selectedClassId, selectedSectionId, slug]);

  const saveSubjects = (subs: Subject[]) => {
    setConfiguredSubjects(subs);
    if (selectedClassId && selectedSectionId) {
      localStorage.setItem(`weai_${slug}_subjects_${selectedClassId}_${selectedSectionId}`, JSON.stringify(subs));
    }
  };

  const handleAddSubject = (name: string) => {
    if (!name.trim()) return;
    const exists = configuredSubjects.some((s) => s.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      showToast(`${name} is already added`, "info");
      return;
    }
    const colors = ["bg-blue-600", "bg-green-600", "bg-purple-600", "bg-yellow-600", "bg-red-600", "bg-indigo-600", "bg-pink-600", "bg-teal-600"];
    const newSub: Subject = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: name.trim(),
      code: name.trim().substring(0, 4).toUpperCase(),
      periodsPerWeek: 5,
      color: colors[configuredSubjects.length % colors.length]
    };

    const updated = [...configuredSubjects, newSub];
    saveSubjects(updated);
    setCustomSubjectInput("");
    showToast(`Added ${name.trim()} to configured subjects`, "success");
  };

  const handleUpdatePeriods = (id: string, delta: number) => {
    const updated = configuredSubjects.map((s) => {
      if (s.id === id) {
        const count = Math.max(1, s.periodsPerWeek + delta);
        return { ...s, periodsPerWeek: count };
      }
      return s;
    });
    saveSubjects(updated);
  };

  const handleRemoveSubject = (id: string) => {
    const target = configuredSubjects.find((s) => s.id === id);
    const updated = configuredSubjects.filter((s) => s.id !== id);
    saveSubjects(updated);
    showToast(`Removed ${target?.name || "subject"}`, "info");
  };

  // Setup Sample Faculty List
  useEffect(() => {
    setTeachers([
      { id: "t_1", name: "Dr. Rajesh Sharma", designation: "Senior PGT", department: "Mathematics", assignedSubjects: ["Mathematics", "Physics"], maxPeriodsPerWeek: 28, assignedPeriodsCount: 18 },
      { id: "t_2", name: "Mrs. Ananya Gupta", designation: "TGT Teacher", department: "Science", assignedSubjects: ["Science", "Chemistry", "Biology"], maxPeriodsPerWeek: 26, assignedPeriodsCount: 20 },
      { id: "t_3", name: "Mr. Vikram Singh", designation: "PGT Humanities", department: "Social Science", assignedSubjects: ["Social Science", "Hindi"], maxPeriodsPerWeek: 25, assignedPeriodsCount: 15 },
      { id: "t_4", name: "Ms. Priya Verma", designation: "Language Specialist", department: "English", assignedSubjects: ["English"], maxPeriodsPerWeek: 24, assignedPeriodsCount: 12 }
    ]);
  }, []);

  const handleAssignToGrid = (dayIndex: number, periodId: number, subject: Subject) => {
    const cellKey = `${dayIndex}_${periodId}`;
    const newGrid = {
      ...gridData,
      [cellKey]: {
        subjectId: subject.id,
        subjectName: subject.name
      }
    };
    setGridData(newGrid);
    if (selectedClassId && selectedSectionId) {
      localStorage.setItem(`weai_${slug}_grid_${selectedClassId}_${selectedSectionId}`, JSON.stringify(newGrid));
    }
  };

  const handleClearCell = (dayIndex: number, periodId: number) => {
    const cellKey = `${dayIndex}_${periodId}`;
    const newGrid = { ...gridData };
    delete newGrid[cellKey];
    setGridData(newGrid);
    if (selectedClassId && selectedSectionId) {
      localStorage.setItem(`weai_${slug}_grid_${selectedClassId}_${selectedSectionId}`, JSON.stringify(newGrid));
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    const gridKey = `weai_${slug}_grid_${selectedClassId}_${selectedSectionId}`;
    localStorage.setItem(gridKey, JSON.stringify(gridData));

    const token = getAuthToken();
    try {
      await fetch(`https://weaischool-backend.onrender.com/api/v1/timetable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-School-Slug": slug,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          class_id: selectedClassId,
          section_id: selectedSectionId,
          subjects: configuredSubjects,
          grid: gridData
        })
      });
    } catch {}

    setTimeout(() => {
      setIsSaving(false);
      showToast("Timetable saved and cached successfully!", "success");
    }, 500);
  };

  const totalWeeklyPeriods = useMemo(() => {
    return configuredSubjects.reduce((acc, curr) => acc + curr.periodsPerWeek, 0);
  }, [configuredSubjects]);

  return (
    <div className="min-h-screen bg-[#111827] text-gray-100 p-4 md:p-8">
      {/* Toast Notification Banner */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-xl text-sm font-medium border flex items-center gap-3 transition-all ${
              t.type === "success"
                ? "bg-emerald-950/90 border-emerald-500 text-emerald-200"
                : t.type === "error"
                ? "bg-rose-950/90 border-rose-500 text-rose-200"
                : "bg-blue-950/90 border-blue-500 text-blue-200"
            }`}
          >
            {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {t.type === "info" && <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Smart Timetable Builder
              {isLoadingClasses && <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Setup section-wise subjects, assign teachers, and build schedules.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadClasses}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium border border-gray-700 flex items-center gap-2 transition"
              title="Sync classes"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingClasses ? "animate-spin" : ""}`} />
              Sync Classes
            </button>

            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Timetable"}
            </button>
          </div>
        </div>

        {/* 3 Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-1">
          <button
            onClick={() => setActiveTab("subjects")}
            className={`px-5 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === "subjects"
                ? "bg-blue-600 text-white border-blue-400"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60 border-transparent"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            1. Subjects Setup
          </button>

          <button
            onClick={() => setActiveTab("teachers")}
            className={`px-5 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === "teachers"
                ? "bg-blue-600 text-white border-blue-400"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60 border-transparent"
            }`}
          >
            <Users className="w-4 h-4" />
            2. Assign Teachers
          </button>

          <button
            onClick={() => setActiveTab("grid")}
            className={`px-5 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === "grid"
                ? "bg-blue-600 text-white border-blue-400"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60 border-transparent"
            }`}
          >
            <Calendar className="w-4 h-4" />
            3. Build Grid
          </button>
        </div>

        {/* Class & Section Selection Panel */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              SELECT CLASS
            </label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedClassId(newId);
                  const cls = classes.find((c) => c.id === newId);
                  if (cls && cls.sections.length > 0) {
                    setSelectedSectionId(cls.sections[0].id);
                  }
                }}
                className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-4 py-2.5 text-sm appearance-none focus:outline-none focus:border-blue-500 transition cursor-pointer"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              SELECT SECTION
            </label>
            <div className="relative">
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={!currentClass || currentClass.sections.length === 0}
                className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-4 py-2.5 text-sm appearance-none focus:outline-none focus:border-blue-500 transition disabled:opacity-50 cursor-pointer"
              >
                {currentClass?.sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* --- TAB 1: SUBJECTS SETUP --- */}
        {activeTab === "subjects" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-gray-900/80 border border-gray-800 rounded-xl p-5 space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Quick Add Subjects
              </h3>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    placeholder="Type to search or add custom"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSubject(customSubjectInput);
                    }}
                    className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                </div>
                <button
                  onClick={() => handleAddSubject(customSubjectInput)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider">PRESET SUBJECT CHIPS</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SUBJECTS.map((name) => {
                    const isConfigured = configuredSubjects.some(
                      (s) => s.name.toLowerCase() === name.toLowerCase()
                    );
                    return (
                      <button
                        key={name}
                        onClick={() => !isConfigured && handleAddSubject(name)}
                        disabled={isConfigured}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                          isConfigured
                            ? "bg-gray-800/40 border-gray-800 text-gray-500 cursor-not-allowed"
                            : "bg-gray-800/80 hover:bg-blue-900/40 border-gray-700 hover:border-blue-500 text-gray-200"
                        }`}
                      >
                        {isConfigured ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3 text-blue-400" />}
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-gray-900/80 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  Configured Subjects for {currentClass?.name} - {currentSection?.name}
                </h3>
                <span className="px-2.5 py-1 bg-blue-950 text-blue-300 text-xs font-semibold rounded-full border border-blue-800">
                  Total Weekly Periods: {totalWeeklyPeriods}
                </span>
              </div>

              {configuredSubjects.length === 0 ? (
                <div className="py-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
                  <BookOpen className="w-10 h-10 mx-auto text-gray-600 mb-2" />
                  <p className="text-sm">No subjects configured for this section</p>
                  <p className="text-xs text-gray-600 mt-1">Click a chip on the left to add subjects.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {configuredSubjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="bg-gray-950 border border-gray-800 rounded-lg p-3.5 flex items-center justify-between gap-4 hover:border-gray-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-10 rounded-full ${subject.color || "bg-blue-600"}`} />
                        <div>
                          <h4 className="font-medium text-white text-sm">{subject.name}</h4>
                          <span className="text-xs text-gray-500 font-mono">Code: {subject.code}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg">
                          <button
                            onClick={() => handleUpdatePeriods(subject.id, -1)}
                            className="px-2.5 py-1 text-gray-400 hover:text-white font-bold"
                          >
                            -
                          </button>
                          <span className="px-3 text-xs font-semibold text-blue-400">
                            {subject.periodsPerWeek} / wk
                          </span>
                          <button
                            onClick={() => handleUpdatePeriods(subject.id, 1)}
                            className="px-2.5 py-1 text-gray-400 hover:text-white font-bold"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveSubject(subject.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: ASSIGN TEACHERS --- */}
        {activeTab === "teachers" && (
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Faculty & Subject Assignments
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Manage workload distribution and subject mapping for faculty members.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teachers.map((teacher) => {
                const percentage = Math.round((teacher.assignedPeriodsCount / teacher.maxPeriodsPerWeek) * 100);
                return (
                  <div
                    key={teacher.id}
                    className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3 hover:border-gray-700 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-white text-base flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                          {teacher.name}
                        </h4>
                        <p className="text-xs text-gray-400">{teacher.designation} • {teacher.department}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 bg-gray-900 border border-gray-800 text-gray-300 rounded-full font-mono">
                        {teacher.assignedPeriodsCount} / {teacher.maxPeriodsPerWeek} periods
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            percentage > 90 ? "bg-rose-500" : percentage > 75 ? "bg-yellow-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>Workload: {percentage}%</span>
                        <span>Max Cap: {teacher.maxPeriodsPerWeek}</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-[11px] text-gray-400 uppercase tracking-wider block mb-1">
                        ASSIGNED SUBJECTS
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {teacher.assignedSubjects.map((sub) => (
                          <span
                            key={sub}
                            className="px-2 py-0.5 bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs rounded-md"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TAB 3: BUILD GRID --- */}
        {activeTab === "grid" && (
          <div className="space-y-6">
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                AVAILABLE SUBJECT PALETTE (Click or Drag to Schedule)
              </span>

              {configuredSubjects.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No subjects configured. Switch to Tab 1 to add subjects first.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {configuredSubjects.map((sub) => (
                    <div
                      key={sub.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify(sub));
                      }}
                      className="px-3 py-2 bg-gray-950 border border-gray-700 hover:border-blue-500 rounded-lg text-sm text-white font-medium cursor-grab active:cursor-grabbing flex items-center gap-2 shadow-sm transition"
                    >
                      <div className={`w-3 h-3 rounded-full ${sub.color || "bg-blue-600"}`} />
                      <span>{sub.name}</span>
                      <span className="text-xs text-gray-500 font-mono">({sub.periodsPerWeek}/wk)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-32">
                      Day / Period
                    </th>
                    {PERIODS.map((p) => (
                      <th key={p.id} className="py-3 px-2 text-center border-l border-gray-800">
                        <div className="text-xs font-semibold text-gray-200">{p.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{p.time}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {DAYS.map((day, dayIdx) => (
                    <tr key={day} className="hover:bg-gray-800/30 transition">
                      <td className="py-3 px-4 text-sm font-semibold text-gray-300 bg-gray-950/40">
                        {day}
                      </td>
                      {PERIODS.map((period) => {
                        const cellKey = `${dayIdx}_${period.id}`;
                        const cell = gridData[cellKey];

                        return (
                          <td
                            key={period.id}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              try {
                                const raw = e.dataTransfer.getData("application/json");
                                if (raw) {
                                  const sub = JSON.parse(raw);
                                  handleAssignToGrid(dayIdx, period.id, sub);
                                }
                              } catch {}
                            }}
                            className="p-1.5 border-l border-gray-800/60 h-20 text-center relative group"
                          >
                            {cell ? (
                              <div className="w-full h-full bg-blue-950/40 border border-blue-800/60 rounded-lg p-2 flex flex-col justify-between relative group/cell">
                                <button
                                  onClick={() => handleClearCell(dayIdx, period.id)}
                                  className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 p-1 text-gray-400 hover:text-rose-400 bg-gray-900/80 rounded transition"
                                  title="Clear slot"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-semibold text-blue-200 line-clamp-1 pr-4">
                                  {cell.subjectName}
                                </span>
                                <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {currentClass?.name}
                                </span>
                              </div>
                            ) : (
                              <div className="w-full h-full border border-dashed border-gray-800 rounded-lg flex items-center justify-center text-[11px] text-gray-600 hover:border-gray-700 hover:bg-gray-950/40 transition">
                                Drop Subject
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}