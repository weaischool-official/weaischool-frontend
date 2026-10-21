"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
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
  Clock,
  Save,
  Copy,
  X,
  Check,
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
const API_BASE = "https://weaischool-backend.onrender.com/api/v1";

const getSlugFromUrl = (): string => {
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.split("/");
  const schoolIdx = parts.indexOf("school");
  if (schoolIdx !== -1 && parts[schoolIdx + 1]) {
    return parts[schoolIdx + 1];
  }
  return "";
};

const getAuthToken = (): string => {
  if (typeof window === "undefined") return "";

  const keys = [
    "school_auth",
    "token",
    "access_token",
    "auth",
    "user",
    "weai_token",
    "school_user",
    "auth_token",
  ];

  for (const k of keys) {
    try {
      const val = localStorage.getItem(k);
      if (val) {
        if (val.startsWith("{") || val.startsWith("[")) {
          const parsed = JSON.parse(val);
          if (parsed?.access_token) return parsed.access_token;
          if (parsed?.token) return parsed.token;
          if (parsed?.state?.token) return parsed.state.token;
          if (parsed?.user?.token) return parsed.user.token;
        } else if (val.length > 10) {
          return val;
        }
      }
    } catch (e) {}
  }

  if (typeof document !== "undefined" && document.cookie) {
    const match = document.cookie.match(/token=([^;]+)/);
    if (match) return match[1];
  }

  return "";
};

const api = {
  get: async (url: string) => {
    const token = getAuthToken();
    const slug = getSlugFromUrl();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (slug) headers["X-School-Slug"] = slug;

    let finalUrl = `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
    if (slug && !finalUrl.includes("slug=")) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + `slug=${slug}`;
    }

    const res = await fetch(finalUrl, { headers });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw {
        response: { data: errorData, status: res.status },
        message: errorData.detail || "Request failed",
      };
    }
    const data = await res.json();
    return { data };
  },

  post: async (url: string, body?: any) => {
    const token = getAuthToken();
    const slug = getSlugFromUrl();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (slug) headers["X-School-Slug"] = slug;

    let finalUrl = `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
    if (slug && !finalUrl.includes("slug=")) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + `slug=${slug}`;
    }

    const res = await fetch(finalUrl, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw {
        response: { data: errorData, status: res.status },
        message: errorData.detail || "Request failed",
      };
    }
    const data = await res.json();
    return { data };
  },

  patch: async (url: string, body?: any) => {
    const token = getAuthToken();
    const slug = getSlugFromUrl();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (slug) headers["X-School-Slug"] = slug;

    let finalUrl = `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
    if (slug && !finalUrl.includes("slug=")) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + `slug=${slug}`;
    }

    const res = await fetch(finalUrl, {
      method: "PATCH",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw {
        response: { data: errorData, status: res.status },
        message: errorData.detail || "Request failed",
      };
    }
    const data = await res.json();
    return { data };
  },

  delete: async (url: string) => {
    const token = getAuthToken();
    const slug = getSlugFromUrl();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (slug) headers["X-School-Slug"] = slug;

    let finalUrl = `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
    if (slug && !finalUrl.includes("slug=")) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + `slug=${slug}`;
    }

    const res = await fetch(finalUrl, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw {
        response: { data: errorData, status: res.status },
        message: errorData.detail || "Request failed",
      };
    }
    const data = await res.json().catch(() => ({}));
    return { data };
  },
};

interface TimeSlot {
  period_num: number;
  name: string;
  start_time: string;
  end_time: string;
  slot_type: "CLASS" | "BREAK" | "LUNCH";
}

interface TimeSlotConfig {
  working_days: string[];
  period_slots: TimeSlot[];
}

interface GridCell {
  period_num: number;
  day: string;
  teacher_id?: string;
  teacher_name?: string;
  subject_name?: string;
  room_no?: string;
}

interface TeacherClash {
  period_num: number;
  day: string;
  clashing_class_name: string;
}

const DEFAULT_SLOTS: TimeSlot[] = [
  { period_num: 1, name: "Period 1", start_time: "08:00", end_time: "08:45", slot_type: "CLASS" },
  { period_num: 2, name: "Period 2", start_time: "08:45", end_time: "09:30", slot_type: "CLASS" },
  { period_num: 3, name: "Short Break", start_time: "09:30", end_time: "09:45", slot_type: "BREAK" },
  { period_num: 4, name: "Period 3", start_time: "09:45", end_time: "10:30", slot_type: "CLASS" },
  { period_num: 5, name: "Period 4", start_time: "10:30", end_time: "11:15", slot_type: "CLASS" },
  { period_num: 6, name: "Lunch Break", start_time: "11:15", end_time: "12:00", slot_type: "LUNCH" },
  { period_num: 7, name: "Period 5", start_time: "12:00", end_time: "12:45", slot_type: "CLASS" },
  { period_num: 8, name: "Period 6", start_time: "12:45", end_time: "13:30", slot_type: "CLASS" },
];

const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const normalizeSubject = (str: string): string => {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
};

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
    ["art", "drawing", "craft", "arts", "artcraft"],
    ["english", "eng"],
    ["hindi"],
    ["marathi"],
    ["sanskrit"],
    ["dance", "dancing"],
    ["music", "singing"],
  ];

  for (const group of synonymGroups) {
    if (group.includes(normClass) && group.includes(normTeacher)) {
      return true;
    }
  }

  return false;
};

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
  const slugParam = (params?.slug as string) || "";

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

  // NEW: All subjects created on Subject Master page
  const [schoolSubjects, setSchoolSubjects] = useState<any[]>([]);

  // Tab 2 states
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Tab 3 states
  const [slotConfig, setSlotConfig] = useState<TimeSlotConfig>({
    working_days: DEFAULT_DAYS,
    period_slots: DEFAULT_SLOTS,
  });
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [gridData, setGridData] = useState<GridCell[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [savingGrid, setSavingGrid] = useState(false);
  const [teacherClashes, setTeacherClashes] = useState<Record<string, TeacherClash[]>>({});

  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");

  const [toastNotice, setToastNotice] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "warning" = "success") => {
    setToastNotice({ type, text });
    setTimeout(() => setToastNotice(null), 3500);
  };

  const getSelectedContextName = () => {
    const selectedCls = classes.find((c) => c.id === selectedClassId);
    const clsName = selectedCls?.name || selectedCls?.class_name || "";
    const selectedSec = sections.find((s) => s.id === selectedSectionId);
    const secName = selectedSec?.name || selectedSec?.section_name || "";
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

  // 1. Fetch Classes + School Subject Master on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/classes");
        let data = res.data || [];
        if (!Array.isArray(data)) {
          data = data.items || data.classes || data.data || [];
        }
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].id);
      } catch (error: any) {
        console.error("Error loading classes:", error);
        showToast("Failed to load classes. Please refresh page.", "error");
      }
    };

    const fetchSchoolSubjects = async () => {
      try {
        // Primary: school subject master list
        const res = await api.get("/subjects");
        let data = res.data || [];
        if (!Array.isArray(data)) {
          data = data.items || data.subjects || data.data || [];
        }
        setSchoolSubjects(data);
      } catch (err) {
        // Fallback endpoints some backends use
        try {
          const res2 = await api.get("/class-subjects/master");
          let data2 = res2.data || [];
          if (!Array.isArray(data2)) data2 = data2.items || data2.data || [];
          setSchoolSubjects(data2);
        } catch {
          setSchoolSubjects([]);
        }
      }
    };

    fetchClasses();
    fetchSchoolSubjects();
  }, [slugParam]);

  // 2. Fetch Sections when Class changes
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
        let secData = res.data || [];
        if (!Array.isArray(secData)) {
          secData = secData.items || secData.sections || secData.data || [];
        }
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

  // 3. Fetch Class-Section Subjects
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchSubjects = async () => {
      setIsLoading(true);
      try {
        let url = `/class-subjects?class_id=${selectedClassId}`;
        if (selectedSectionId) url += `&section_id=${selectedSectionId}`;
        const res = await api.get(url);
        let data = res.data || [];
        if (!Array.isArray(data)) {
          data = data.items || data.subjects || data.data || [];
        }
        setClassSubjects(data);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, [selectedClassId, selectedSectionId]);

  // 4. Search suggestions (API + local school subjects)
  useEffect(() => {
    if (subjectQuery.trim() === "") {
      setApiSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const res = await api.get(`/class-subjects/suggestions?query=${encodeURIComponent(subjectQuery)}`);
        setApiSuggestions(res.data?.suggestions || res.data || []);
      } catch (error) {
        setApiSuggestions([]);
      }
    };
    const debounce = setTimeout(fetchSuggestions, 250);
    return () => clearTimeout(debounce);
  }, [subjectQuery]);

  // 5. Teachers & Workload
  useEffect(() => {
    if (activeTab !== "teachers" && activeTab !== "timetable") return;
    if (!selectedClassId) return;

    const loadTab2 = async () => {
      setIsLoadingTeachers(true);
      try {
        let teacherList: any[] = [];
        try {
          const r = await api.get("/staff?role=teacher");
          const raw = r.data;
          teacherList = Array.isArray(raw) ? raw : raw?.items || raw?.data || [];
        } catch {
          try {
            const r2 = await api.get("/staff");
            const raw2 = r2.data;
            teacherList = Array.isArray(raw2) ? raw2 : raw2?.items || raw2?.data || [];
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
          const list = Array.isArray(aRes.data) ? aRes.data : aRes.data?.items || [];
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
          const wList = Array.isArray(wRes.data) ? wRes.data : wRes.data?.items || [];
          setWorkloads(wList);
        } catch {
          setWorkloads([]);
        }
      } finally {
        setIsLoadingTeachers(false);
      }
    };

    if (teachers.length === 0) {
      loadTab2();
    }
  }, [activeTab, selectedClassId, selectedSectionId]);

  // 6. Grid Data
  const fetchTeacherClashes = async () => {
    try {
      const res = await api.get(`/timetable-grid/check-clash`);
      setTeacherClashes(res.data || {});
    } catch (err) {
      console.error("Error checking clashes:", err);
    }
  };

  const fetchGridAndConfig = async () => {
    if (!selectedClassId || !selectedSectionId) return;
    setLoadingGrid(true);
    try {
      const resConfig = await api.get(
        `/timetable-grid/config?class_id=${selectedClassId}&section_id=${selectedSectionId}`
      );
      if (resConfig.data && resConfig.data.period_slots && resConfig.data.period_slots.length > 0) {
        setSlotConfig({
          working_days: resConfig.data.working_days || DEFAULT_DAYS,
          period_slots: resConfig.data.period_slots,
        });
      }

      const resEntries = await api.get(
        `/timetable-grid/entries?class_id=${selectedClassId}&section_id=${selectedSectionId}`
      );
      setGridData(resEntries.data || []);

      fetchTeacherClashes();
    } catch (err) {
      console.error("Error loading grid:", err);
    } finally {
      setLoadingGrid(false);
    }
  };

  useEffect(() => {
    if (activeTab === "timetable" && selectedClassId && selectedSectionId) {
      fetchGridAndConfig();
    }
  }, [activeTab, selectedClassId, selectedSectionId]);

  /**
   * IMPORTANT:
   * Merge Subject Master page subjects + default quick list.
   * Search "Dance" / "Drawing" will show if created on Subjects page.
   */
  const getDisplayedChips = () => {
    const addedNames = classSubjects.map((cs) => (cs.subject_name || "").toLowerCase());

    // Build unique master list
    const masterMap = new Map<string, { name: string; color: string }>();

    // 1) Defaults first
    QUICK_SUBJECTS.forEach((s) => {
      masterMap.set(s.name.toLowerCase(), s);
    });

    // 2) Live subjects from Subject Master page (Dance, Drawing, etc.)
    schoolSubjects.forEach((s: any) => {
      const name = (s.subject_name || s.name || s.title || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!masterMap.has(key)) {
        masterMap.set(key, {
          name,
          color: s.color_code || s.color || s.suggested_color || "#6B7280",
        });
      }
    });

    let chips = Array.from(masterMap.values());

    const q = subjectQuery.trim().toLowerCase();
    if (q.length > 0) {
      // Prefer backend suggestions if present
      if (Array.isArray(apiSuggestions) && apiSuggestions.length > 0) {
        const fromApi = apiSuggestions
          .map((s: any) => ({
            name: (s.name || s.subject_name || "").trim(),
            color: s.suggested_color || s.color_code || s.color || "#3B82F6",
          }))
          .filter((s) => s.name);

        // Also keep local matches (so Dance from master always appears)
        const localMatches = chips.filter((c) => c.name.toLowerCase().includes(q));

        const merged = new Map<string, { name: string; color: string }>();
        [...fromApi, ...localMatches].forEach((item) => {
          merged.set(item.name.toLowerCase(), item);
        });
        chips = Array.from(merged.values());
      } else {
        chips = chips.filter((c) => c.name.toLowerCase().includes(q));
      }
    }

    return chips
      .filter((chip) => !addedNames.includes(chip.name.toLowerCase()))
      .slice(0, 20);
  };

  const displayedChips = getDisplayedChips();

  const exactMatchExists =
    displayedChips.some((c) => c.name.toLowerCase() === subjectQuery.toLowerCase().trim()) ||
    classSubjects.some(
      (cs) => (cs.subject_name || "").toLowerCase() === subjectQuery.toLowerCase().trim()
    ) ||
    schoolSubjects.some((s) => {
      const n = (s.subject_name || s.name || "").toLowerCase();
      return n === subjectQuery.toLowerCase().trim();
    });

  const handleAddSubject = async (
    name: string,
    color: string = "#3B82F6",
    isCustom: boolean = false
  ) => {
    if (!selectedClassId) {
      showToast("Please select a class first", "error");
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
      showToast(`${name} added!`, "success");
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || "Failed to add subject";
      showToast(typeof msg === "string" ? msg : "Failed to add subject", "error");
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
      showToast(`Updated to ${newPeriods} periods/week`, "success");
    } catch (error: any) {
      showToast("Failed to update periods", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteSubject = async (subjectId: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await api.delete(`/class-subjects/${subjectId}`);
      setClassSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      showToast("Subject removed", "success");
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      showToast(typeof detail === "string" ? detail : "Failed to remove", "error");
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
        const wList = Array.isArray(wRes.data) ? wRes.data : wRes.data?.items || [];
        setWorkloads(wList);
      } catch {}

      if (res.data?.is_overloaded) {
        showToast(
          `${res.data.teacher_name} is overloaded (${res.data.current_workload}/30), but saved.`,
          "warning"
        );
      } else {
        showToast(`Assigned to ${res.data.teacher_name}`, "success");
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail || e.response?.data?.message || e.message;
      showToast(typeof detail === "string" ? detail : "Failed to assign teacher", "error");
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

  const handleCellUpdate = (periodNum: number, day: string, field: keyof GridCell, value: string) => {
    setGridData((prev) => {
      const existingIdx = prev.findIndex((c) => c.period_num === periodNum && c.day === day);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const updatedCell = { ...updated[existingIdx], [field]: value };
        if (field === "teacher_id") {
          const t = teachers.find((tch) => (tch.id || tch.user_id || tch.user?.id) === value);
          updatedCell.teacher_name = t ? teacherName(t) : "";
        }
        updated[existingIdx] = updatedCell;
        return updated;
      } else {
        const newCell: GridCell = { period_num: periodNum, day, [field]: value };
        if (field === "teacher_id") {
          const t = teachers.find((tch) => (tch.id || tch.user_id || tch.user?.id) === value);
          newCell.teacher_name = t ? teacherName(t) : "";
        }
        return [...prev, newCell];
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, periodNum: number, day: string) => {
    const cell = gridData.find((c) => c.period_num === periodNum && c.day === day);
    if (!cell || (!cell.subject_name && !cell.teacher_id)) return;
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ sourcePeriod: periodNum, sourceDay: day, cell })
    );
  };

  const handleDrop = (e: React.DragEvent, targetPeriod: number, targetDay: string) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("text/plain");
      if (!raw) return;
      const { sourcePeriod, sourceDay, cell } = JSON.parse(raw);
      if (sourcePeriod === targetPeriod && sourceDay === targetDay) return;

      setGridData((prev) => {
        const targetCell = prev.find((c) => c.period_num === targetPeriod && c.day === targetDay);
        const nextGrid = prev.filter(
          (c) =>
            !(c.period_num === sourcePeriod && c.day === sourceDay) &&
            !(c.period_num === targetPeriod && c.day === targetDay)
        );
        nextGrid.push({
          period_num: targetPeriod,
          day: targetDay,
          teacher_id: cell.teacher_id,
          teacher_name: cell.teacher_name,
          subject_name: cell.subject_name,
          room_no: cell.room_no,
        });
        if (targetCell) {
          nextGrid.push({
            period_num: sourcePeriod,
            day: sourceDay,
            teacher_id: targetCell.teacher_id,
            teacher_name: targetCell.teacher_name,
            subject_name: targetCell.subject_name,
            room_no: targetCell.room_no,
          });
        }
        return nextGrid;
      });
    } catch (err) {}
  };

  const handleSaveGrid = async () => {
    if (!selectedClassId || !selectedSectionId) return;
    setSavingGrid(true);
    try {
      await api.post(`/timetable-grid/entries/bulk`, {
        class_id: selectedClassId,
        section_id: selectedSectionId,
        entries: gridData,
      });
      showToast("Timetable grid saved successfully!", "success");
      fetchTeacherClashes();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to save timetable", "error");
    } finally {
      setSavingGrid(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedClassId || !selectedSectionId) return;
    setIsSavingConfig(true);
    try {
      await api.post(`/timetable-grid/config`, {
        class_id: selectedClassId,
        section_id: selectedSectionId,
        working_days: slotConfig.working_days,
        period_slots: slotConfig.period_slots,
      });
      setIsConfigModalOpen(false);
      showToast("Time slots saved!", "success");
      fetchGridAndConfig();
    } catch (err: any) {
      showToast("Failed to save config", "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCloneGrid = async () => {
    if (!selectedClassId || !selectedSectionId || !targetClassId || !targetSectionId) {
      showToast("Please select target class and section", "error");
      return;
    }
    try {
      await api.post(
        `/timetable-grid/clone?source_class_id=${selectedClassId}&source_section_id=${selectedSectionId}&target_class_id=${targetClassId}&target_section_id=${targetSectionId}`
      );
      setIsCloneModalOpen(false);
      showToast("Grid cloned successfully!", "success");
    } catch (err) {
      showToast("Failed to clone grid", "error");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
      {toastNotice && (
        <div
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 text-sm font-semibold transition-all ${
            toastNotice.type === "success"
              ? "bg-emerald-950 text-emerald-200 border-emerald-800"
              : toastNotice.type === "warning"
              ? "bg-amber-950 text-amber-200 border-amber-800"
              : "bg-red-950 text-red-200 border-red-800"
          }`}
        >
          {toastNotice.type === "success" ? (
            <Check className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <span>{toastNotice.text}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Smart Timetable Builder</h1>
          <p className="text-slate-400 text-sm mt-1">
            Setup section-wise subjects, assign teachers, and build schedules.
          </p>
        </div>
      </div>

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
                {cls.name || cls.class_name}
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
                  {sec.name || sec.section_name}
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

      {/* TAB 1 */}
      {activeTab === "subjects" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 shadow-sm">
              <h3 className="font-bold text-white mb-1">Quick Add Subjects</h3>
              <p className="text-[11px] text-slate-500 mb-4">
                Includes subjects from your Subject Master page (Dance, Drawing, etc.)
              </p>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search school subjects or add custom..."
                  value={subjectQuery}
                  onChange={(e) => setSubjectQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder:text-slate-500 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-2 max-h-[280px] overflow-y-auto pr-1">
                {displayedChips.map((chip, idx) => (
                  <button
                    key={`${chip.name}-${idx}`}
                    disabled={isAddingId === chip.name}
                    onClick={() => handleAddSubject(chip.name, chip.color)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
                  >
                    {isAddingId === chip.name ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" style={{ color: chip.color }} />
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
                    Add &quot;{subjectQuery.trim()}&quot;
                  </button>
                )}
              </div>

              {displayedChips.length === 0 && subjectQuery.trim() === "" && (
                <p className="text-xs text-slate-500 mt-3">
                  No master subjects found yet. Create them on Subjects page, or type a custom name.
                </p>
              )}

              <div className="mt-5 p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Subjects are saved specifically for <strong>{getSelectedContextName()}</strong>.
                  Master list is loaded from your school Subjects page.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 shadow-sm min-h-[400px]">
              <h3 className="font-bold text-white flex items-center justify-between mb-5">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  Configured Subjects for {getSelectedContextName()}
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
                  <p className="text-sm font-medium text-slate-300">
                    No subjects configured for this section
                  </p>
                  <p className="text-xs mt-1">Click a chip on the left to add subjects.</p>
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
                            backgroundColor: `${sub.color_code || "#3B82F6"}20`,
                            border: `1px solid ${sub.color_code || "#3B82F6"}40`,
                          }}
                        >
                          <BookOpen className="w-4 h-4" style={{ color: sub.color_code || "#3B82F6" }} />
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

      {/* TAB 2 */}
      {activeTab === "teachers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 min-h-[420px]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  Assign Teachers - {getSelectedContextName()}
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
                    Go to Subjects Setup
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
                    const selectedVal = getAssignedTeacherValue(assigned);

                    const matchingTeachers = teachers.filter((t) => {
                      const tSubjs = getTeacherSubjects(t);
                      return tSubjs.some((ts) => matchSubjects(sub.subject_name, ts));
                    });

                    const dropdownTeachers =
                      matchingTeachers.length > 0 ? matchingTeachers : teachers;

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
                              backgroundColor: `${sub.color_code || "#3B82F6"}25`,
                              border: `1px solid ${sub.color_code || "#3B82F6"}50`,
                            }}
                          >
                            <BookOpen
                              className="w-4 h-4"
                              style={{ color: sub.color_code || "#3B82F6" }}
                            />
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
                              {dropdownTeachers.map((t) => {
                                const realTeacherId = t.id || t.user_id || t.user?.id;
                                const tSubjs = getTeacherSubjects(t);
                                const tag = tSubjs.length > 0 ? ` (${tSubjs.join(", ")})` : "";
                                return (
                                  <option key={t.id} value={realTeacherId}>
                                    {teacherName(t)}
                                    {tag}
                                  </option>
                                );
                              })}
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
                <Users className="w-4 h-4 text-blue-400" /> Teacher Workload & Profiles
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Max {MAX_PERIODS} periods/week · Configured Subjects
              </p>

              {isLoadingTeachers ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : workloads.length === 0 && teachers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No teacher data</p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {teachers.map((t) => {
                    const tid = t.user_id || t.user?.id || t.id;
                    const sid = t.id;
                    const w =
                      workloads.find(
                        (item: any) =>
                          item.teacher_id === tid ||
                          item.staff_id === sid ||
                          item.teacher_id === sid
                      ) || {
                        teacher_id: tid,
                        teacher_name: teacherName(t),
                        total_periods: 0,
                        max_periods: MAX_PERIODS,
                      };

                    const periods = w.total_periods || 0;
                    const maxP = w.max_periods || MAX_PERIODS;
                    const pct = Math.min(100, Math.round((periods / maxP) * 100));
                    const isOver = periods > maxP;
                    const barColor = isOver
                      ? "bg-red-500"
                      : pct >= 80
                      ? "bg-amber-500"
                      : pct >= 50
                      ? "bg-blue-500"
                      : "bg-emerald-500";

                    const tSubjects = getTeacherSubjects(t);

                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-xl border ${
                          isOver
                            ? "border-red-800/50 bg-red-950/20"
                            : "border-slate-700/50 bg-slate-800/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-white truncate pr-2">{teacherName(t)}</p>
                          <span
                            className={`text-xs font-bold shrink-0 ${
                              isOver ? "text-red-400" : "text-slate-400"
                            }`}
                          >
                            {periods}/{maxP}
                          </span>
                        </div>

                        <div className="text-[11px] mb-2 font-medium">
                          {tSubjects.length > 0 ? (
                            <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded inline-block truncate max-w-full">
                              {tSubjects.join(", ")}
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded inline-block">
                              General Staff
                            </span>
                          )}
                        </div>

                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>

                        {isOver && (
                          <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Over {maxP} periods
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3 */}
      {activeTab === "timetable" && (
        <div className="bg-[#111827] rounded-2xl shadow-sm border border-slate-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded-xl transition"
              >
                <Clock className="w-4 h-4" />
                Configure Time Slots
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCloneModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-300 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded-xl transition"
              >
                <Copy className="w-4 h-4" />
                Clone Grid
              </button>
              <button
                onClick={() => setGridData([])}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-900/50 rounded-xl transition"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
              <button
                onClick={handleSaveGrid}
                disabled={savingGrid}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow transition disabled:opacity-50"
              >
                {savingGrid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Grid
              </button>
            </div>
          </div>

          {loadingGrid ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="font-medium text-sm">Loading timetable grid...</p>
            </div>
          ) : (
            <div className="overflow-x-auto p-4">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4 text-left border-r border-slate-700 rounded-tl-xl w-44">
                      Time / Period
                    </th>
                    {slotConfig.working_days.map((day, idx) => (
                      <th
                        key={day}
                        className={`p-4 text-center border-slate-700 ${
                          idx !== slotConfig.working_days.length - 1 ? "border-r" : "rounded-tr-xl"
                        } min-w-[160px]`}
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 border-l border-r border-b border-slate-700 rounded-b-xl">
                  {slotConfig.period_slots.map((slot) => {
                    const isBreakOrLunch = slot.slot_type !== "CLASS";

                    return (
                      <tr
                        key={slot.period_num}
                        className={
                          isBreakOrLunch ? "bg-amber-950/20" : "hover:bg-slate-800/30 transition"
                        }
                      >
                        <td className="p-4 border-r border-slate-700 bg-slate-900/40">
                          <div className="font-bold text-sm text-slate-200">{slot.name}</div>
                          <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {slot.start_time} - {slot.end_time}
                          </div>
                          {isBreakOrLunch && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-amber-900/40 text-amber-400 border border-amber-800/50 rounded">
                              {slot.slot_type}
                            </span>
                          )}
                        </td>

                        {slotConfig.working_days.map((day) => {
                          if (isBreakOrLunch) {
                            return (
                              <td
                                key={`${day}-${slot.period_num}`}
                                className="p-3 text-center border-r border-slate-700 text-xs font-semibold text-amber-500 italic bg-amber-950/10"
                              >
                                {slot.name}
                              </td>
                            );
                          }

                          const cell =
                            gridData.find(
                              (c) => c.period_num === slot.period_num && c.day === day
                            ) || {
                              period_num: slot.period_num,
                              day,
                            };

                          const teacherClashList = cell.teacher_id
                            ? teacherClashes[cell.teacher_id]
                            : null;
                          const hasClash =
                            teacherClashList &&
                            teacherClashList.some(
                              (cl) => cl.period_num === slot.period_num && cl.day === day
                            );

                          return (
                            <td
                              key={`${day}-${slot.period_num}`}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDrop(e, slot.period_num, day)}
                              className={`p-2.5 border-r border-slate-700 relative transition ${
                                hasClash
                                  ? "bg-red-950/30"
                                  : "bg-[#0f172a]/50 hover:bg-slate-800"
                              }`}
                            >
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, slot.period_num, day)}
                                className="space-y-2 cursor-grab active:cursor-grabbing"
                              >
                                <select
                                  value={cell.subject_name || ""}
                                  onChange={(e) =>
                                    handleCellUpdate(
                                      slot.period_num,
                                      day,
                                      "subject_name",
                                      e.target.value
                                    )
                                  }
                                  className="w-full text-xs font-semibold px-2 py-1.5 bg-[#111827] border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-blue-500"
                                >
                                  <option value="">-- Subject --</option>
                                  {classSubjects.map((sub) => (
                                    <option key={sub.id} value={sub.subject_name}>
                                      {sub.subject_name}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  value={cell.teacher_id || ""}
                                  onChange={(e) =>
                                    handleCellUpdate(
                                      slot.period_num,
                                      day,
                                      "teacher_id",
                                      e.target.value
                                    )
                                  }
                                  className={`w-full text-xs px-2 py-1.5 border rounded focus:outline-none ${
                                    hasClash
                                      ? "bg-red-900/20 border-red-500/50 text-red-300 font-bold focus:border-red-500"
                                      : "bg-[#111827] border-slate-700 text-slate-300 focus:border-blue-500"
                                  }`}
                                >
                                  <option value="">-- Teacher --</option>
                                  {teachers.map((t) => (
                                    <option
                                      key={t.id}
                                      value={t.id || t.user_id || t.user?.id}
                                    >
                                      {teacherName(t)}
                                    </option>
                                  ))}
                                </select>

                                {hasClash && (
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/50 p-1 rounded border border-red-900">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span>Teacher Clashed!</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TIME CONFIG MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-800">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Configure Time Slots
              </h3>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Period Slots
                </h4>
                <div className="space-y-3">
                  {slotConfig.period_slots.map((slot, idx) => (
                    <div
                      key={slot.period_num}
                      className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/50"
                    >
                      <span className="w-7 h-7 flex items-center justify-center bg-blue-900/30 text-blue-400 rounded-lg text-xs font-bold border border-blue-800/30">
                        #{slot.period_num}
                      </span>

                      <input
                        type="text"
                        value={slot.name}
                        onChange={(e) => {
                          const updated = [...slotConfig.period_slots];
                          updated[idx].name = e.target.value;
                          setSlotConfig({ ...slotConfig, period_slots: updated });
                        }}
                        className="flex-1 text-xs font-semibold px-2 py-1.5 border border-slate-700 rounded-lg bg-[#0f172a] text-white focus:outline-none focus:border-blue-500"
                        placeholder="Period Name"
                      />

                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => {
                          const updated = [...slotConfig.period_slots];
                          updated[idx].start_time = e.target.value;
                          setSlotConfig({ ...slotConfig, period_slots: updated });
                        }}
                        className="text-xs px-2 py-1.5 border border-slate-700 rounded-lg bg-[#0f172a] text-slate-300 focus:outline-none"
                      />

                      <span className="text-slate-500 text-xs">to</span>

                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => {
                          const updated = [...slotConfig.period_slots];
                          updated[idx].end_time = e.target.value;
                          setSlotConfig({ ...slotConfig, period_slots: updated });
                        }}
                        className="text-xs px-2 py-1.5 border border-slate-700 rounded-lg bg-[#0f172a] text-slate-300 focus:outline-none"
                      />

                      <select
                        value={slot.slot_type}
                        onChange={(e) => {
                          const updated = [...slotConfig.period_slots];
                          updated[idx].slot_type = e.target.value as "CLASS" | "BREAK" | "LUNCH";
                          setSlotConfig({ ...slotConfig, period_slots: updated });
                        }}
                        className="text-xs font-semibold px-2 py-1.5 border border-slate-700 rounded-lg bg-[#0f172a] text-white focus:outline-none"
                      >
                        <option value="CLASS">CLASS</option>
                        <option value="BREAK">BREAK</option>
                        <option value="LUNCH">LUNCH</option>
                      </select>

                      <button
                        onClick={() => {
                          const updated = slotConfig.period_slots.filter((_, i) => i !== idx);
                          setSlotConfig({ ...slotConfig, period_slots: updated });
                        }}
                        className="p-1.5 text-red-400 hover:bg-red-950/50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const nextNum = slotConfig.period_slots.length + 1;
                    setSlotConfig({
                      ...slotConfig,
                      period_slots: [
                        ...slotConfig.period_slots,
                        {
                          period_num: nextNum,
                          name: `Period ${nextNum}`,
                          start_time: "13:30",
                          end_time: "14:15",
                          slot_type: "CLASS",
                        },
                      ],
                    });
                  }}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  <Plus className="w-4 h-4" />
                  Add Period Slot
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex justify-end gap-3">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-2"
              >
                {isSavingConfig ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLONE MODAL */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-800 space-y-4">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-400" />
              Clone Grid
            </h3>
            <p className="text-xs text-slate-400">
              Copy this exact timetable grid structure to another target section.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Class</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full text-sm p-2.5 bg-[#0f172a] border border-slate-700 text-white rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Target Section
                </label>
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="w-full text-sm p-2.5 bg-[#0f172a] border border-slate-700 text-white rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Section --</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.section_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsCloneModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCloneGrid}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Copy Timetable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}