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
} from "lucide-react";

// --- ZERO-DEPENDENCY INTERNAL API & TOAST ENGINE ---
const API_BASE_URL = "https://weaischool-backend.onrender.com/api/v1";

const getSlugFromUrl = (): string => {
  if (typeof window === "undefined") return "ppps";
  const pathParts = window.location.pathname.split("/");
  const schoolIdx = pathParts.indexOf("school");
  if (schoolIdx !== -1 && pathParts[schoolIdx + 1]) {
    return pathParts[schoolIdx + 1];
  }
  return "ppps";
};

const getAuthToken = (): string => {
  if (typeof window === "undefined") return "";

  const directKeys = [
    "token",
    "access_token",
    "jwt",
    "auth_token",
    "bearer_token",
    "weai_token",
    "accessToken",
    "authToken",
    "admin_token",
  ];

  for (const k of directKeys) {
    const val = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (val && val !== "null" && val !== "undefined") {
      const clean = val.replace(/^"|"$/g, "").trim();
      if (clean) return clean;
    }
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const rawVal = localStorage.getItem(key);
      if (!rawVal) continue;

      const trimmed = rawVal.replace(/^"|"$/g, "").trim();
      if (trimmed.startsWith("eyJ") && trimmed.length > 20) {
        return trimmed;
      }

      try {
        const parsed = JSON.parse(rawVal);
        if (parsed && typeof parsed === "object") {
          const t =
            parsed.state?.token ||
            parsed.state?.access_token ||
            parsed.state?.accessToken ||
            parsed.state?.jwt ||
            parsed.token ||
            parsed.access_token ||
            parsed.accessToken ||
            parsed.jwt ||
            parsed.user?.token;
          if (typeof t === "string" && t.trim()) return t.trim();
        }
      } catch (e) {}
    }
  } catch (e) {}

  return "";
};

const extractArray = (resData: any): any[] => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (typeof resData === "object") {
    if (Array.isArray(resData.data)) return resData.data;
    if (Array.isArray(resData.items)) return resData.items;
    if (Array.isArray(resData.classes)) return resData.classes;
    if (Array.isArray(resData.subjects)) return resData.subjects;
    if (Array.isArray(resData.staff)) return resData.staff;
    if (Array.isArray(resData.results)) return resData.results;
  }
  return [];
};

const requestWithRetry = async (
  endpoint: string,
  options: RequestInit = {},
  retries = 5,
  delayMs = 1800
) => {
  const token = getAuthToken();
  const slug = getSlugFromUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  if (slug) headers["X-School-Slug"] = slug;

  const cleanEp = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEp}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });
      if (res.ok) {
        if (res.status === 204) return { data: [] };
        const data = await res.json();
        return { data };
      }
      if (res.status === 404 || res.status === 401) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
      }
      if (attempt === retries) {
        const errData = await res.json().catch(() => ({}));
        const err: any = new Error(`Request failed with status ${res.status}`);
        err.response = { status: res.status, data: errData };
        throw err;
      }
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
  return { data: [] };
};

const api = {
  get: (url: string) => requestWithRetry(url, { method: "GET" }),
  post: (url: string, body?: any) =>
    requestWithRetry(url, { method: "POST", body: JSON.stringify(body) }),
  patch: (url: string, body?: any) =>
    requestWithRetry(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (url: string) => requestWithRetry(url, { method: "DELETE" }),
};

const fetchWithFallbacks = async (endpoints: string[]): Promise<any[]> => {
  for (const ep of endpoints) {
    try {
      const res = await api.get(ep);
      const raw = res?.data !== undefined ? res.data : res;
      const list = extractArray(raw);
      if (list.length > 0) return list;
    } catch (e) {}
  }
  return [];
};

let toastListener: ((msg: string, type: "success" | "error" | "warning" | "info") => void) | null = null;
const toast = {
  success: (msg: string) => toastListener && toastListener(msg, "success"),
  error: (msg: string) => toastListener && toastListener(msg, "error"),
  warning: (msg: string) => toastListener && toastListener(msg, "warning"),
  info: (msg: string) => toastListener && toastListener(msg, "info"),
};

// --- DATA & CONSTANTS ---
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
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
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
  const [gridData, setGridData] = useState<Record<string, any>>({});
  const [isSavingGrid, setIsSavingGrid] = useState(false);

  // Toast Banner State
  const [toastBanner, setToastBanner] = useState<{
    msg: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);

  useEffect(() => {
    toastListener = (msg, type) => {
      setToastBanner({ msg, type });
      setTimeout(() => setToastBanner(null), 4000);
    };
    return () => {
      toastListener = null;
    };
  }, []);

  const daysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const timeSlots = [
    { id: "p1", label: "Period 1", time: "08:00 - 08:45" },
    { id: "p2", label: "Period 2", time: "08:45 - 09:30" },
    { id: "p3", label: "Period 3", time: "09:30 - 10:15" },
    { id: "brk", label: "Short Break", time: "10:15 - 10:30", isBreak: true },
    { id: "p4", label: "Period 4", time: "10:30 - 11:15" },
    { id: "p5", label: "Period 5", time: "11:15 - 12:00" },
    { id: "p6", label: "Period 6", time: "12:00 - 12:45" },
    { id: "p7", label: "Period 7", time: "12:45 - 01:30" },
  ];

  const getSelectedContextName = () => {
    const clsName = classes.find((c) => (c.id || c.class_id) === selectedClassId)?.name || "";
    const secName = sections.find((s) => (s.id || s.section_id) === selectedSectionId)?.name || "";
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

  // 1. Fetch Classes with Cold Start Handling and Endpoint Fallbacks
  useEffect(() => {
    const loadClasses = async () => {
      setIsLoadingClasses(true);
      const slug = getSlugFromUrl();

      const rawList = await fetchWithFallbacks([
        `/classes?limit=100&slug=${slug}`,
        `/academics/classes?limit=100&slug=${slug}`,
        `/classes`,
        `/academics/classes`,
      ]);

      if (rawList.length > 0) {
        const formatted = rawList.map((item: any, idx: number) => {
          const cId = String(item.id || item.class_id || item._id || `cls-${idx}`);
          const cName = String(item.name || item.class_name || item.grade || item.standard || `Class ${idx + 1}`);

          let secs: any[] = [];
          if (Array.isArray(item.sections) && item.sections.length > 0) {
            secs = item.sections.map((sec: any, sIdx: number) => ({
              id: String(sec.id || sec.section_id || `sec-${sIdx}`),
              name: String(sec.name || sec.section_name || String.fromCharCode(65 + sIdx)),
            }));
          }

          return { id: cId, name: cName, sections: secs };
        });

        setClasses(formatted);
        if (formatted.length > 0) {
          setSelectedClassId(formatted[0].id);
        }
      } else {
        setClasses([]);
      }

      setIsLoadingClasses(false);
    };

    loadClasses();
  }, []);

  // 2. Fetch SECTIONS when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId("");
      return;
    }

    const currentClass = classes.find((c) => (c.id || c.class_id) === selectedClassId);
    if (
      currentClass?.sections &&
      Array.isArray(currentClass.sections) &&
      currentClass.sections.length > 0
    ) {
      setSections(currentClass.sections);
      setSelectedSectionId(currentClass.sections[0].id || currentClass.sections[0].section_id);
      return;
    }

    const fetchSections = async () => {
      setIsLoadingSections(true);
      const slug = getSlugFromUrl();

      const rawSecs = await fetchWithFallbacks([
        `/classes/${selectedClassId}/sections?slug=${slug}`,
        `/academics/classes/${selectedClassId}/sections?slug=${slug}`,
        `/classes/${selectedClassId}/sections`,
      ]);

      const formattedSecs = rawSecs.map((s: any, idx: number) => ({
        id: String(s.id || s.section_id || `sec-${idx}`),
        name: String(s.name || s.section_name || String.fromCharCode(65 + idx)),
      }));

      setSections(formattedSecs);
      if (formattedSecs.length > 0) {
        setSelectedSectionId(formattedSecs[0].id);
      } else {
        setSelectedSectionId("");
      }

      setIsLoadingSections(false);
    };

    fetchSections();
  }, [selectedClassId, classes]);

  // 3. Fetch SUBJECTS per Class + Section
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchSubjects = async () => {
      setIsLoading(true);
      const slug = getSlugFromUrl();

      let url = `/class-subjects?class_id=${selectedClassId}&slug=${slug}`;
      if (selectedSectionId) {
        url += `&section_id=${selectedSectionId}`;
      }

      const list = await fetchWithFallbacks([url, `/class-subjects?class_id=${selectedClassId}`]);
      setClassSubjects(list);
      setIsLoading(false);
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
        const data = res?.data !== undefined ? res.data : res;
        setApiSuggestions(data?.suggestions || []);
      } catch (error) {
        setApiSuggestions([]);
      }
    };
    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [subjectQuery]);

  // 5. Load Teachers + Assignments + Workloads
  useEffect(() => {
    if ((activeTab !== "teachers" && activeTab !== "timetable") || !selectedClassId) return;

    const loadTab2 = async () => {
      setIsLoadingTeachers(true);
      const slug = getSlugFromUrl();

      const teacherList = await fetchWithFallbacks([
        `/staff?role=TEACHER&slug=${slug}`,
        `/staff?limit=100&slug=${slug}`,
        `/staff?role=teacher`,
        `/staff`,
      ]);

      const enrichedTeachers = await Promise.all(
        teacherList.map(async (t) => {
          const staffId = t.id || t.user_id || t.user?.id;
          if (!staffId) return t;
          try {
            const detailRes = await api.get(`/staff/${staffId}`);
            const data = detailRes?.data !== undefined ? detailRes.data : detailRes;
            return { ...t, ...data, extras: data?.extras || t.extras };
          } catch {
            return t;
          }
        })
      );

      setTeachers(enrichedTeachers);

      try {
        let aUrl = `/teacher-assignments?class_id=${selectedClassId}&slug=${slug}`;
        if (selectedSectionId) aUrl += `&section_id=${selectedSectionId}`;
        const aRes = await api.get(aUrl);
        const aData = aRes?.data !== undefined ? aRes.data : aRes;
        const list = extractArray(aData);
        const map: Record<string, any> = {};
        list.forEach((a: any) => {
          map[a.class_subject_id] = a;
        });
        setAssignments(map);
      } catch {
        setAssignments({});
      }

      try {
        const wRes = await api.get(`/teacher-assignments/workload/all?slug=${slug}`);
        const wData = wRes?.data !== undefined ? wRes.data : wRes;
        setWorkloads(extractArray(wData));
      } catch {
        setWorkloads([]);
      }

      setIsLoadingTeachers(false);
    };

    loadTab2();
  }, [activeTab, selectedClassId, selectedSectionId]);

  // Load Saved Grid State
  useEffect(() => {
    if (activeTab === "timetable" && selectedClassId && selectedSectionId) {
      const cacheKey = `grid_${selectedClassId}_${selectedSectionId}`;
      try {
        const saved = localStorage.getItem(cacheKey);
        if (saved) {
          setGridData(JSON.parse(saved));
        } else {
          setGridData({});
        }
      } catch (e) {}
    }
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

  const handleAddSubject = async (
    name: string,
    color: string = "#3B82F6",
    isCustom: boolean = false
  ) => {
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
      const data = res?.data !== undefined ? res.data : res;

      setClassSubjects((prev) => [...prev, data]);
      setSubjectQuery("");
      toast.success(`${name} added!`);
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || "Failed to add subject";
      toast.error(msg);
    } finally {
      setIsAddingId(null);
    }
  };

  const handleUpdatePeriods = async (
    subjectId: string,
    currentPeriods: number,
    delta: number
  ) => {
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
      const data = res?.data !== undefined ? res.data : res;

      setAssignments((prev) => ({
        ...prev,
        [classSubjectId]: data,
      }));

      try {
        const slug = getSlugFromUrl();
        const wRes = await api.get(`/teacher-assignments/workload/all?slug=${slug}`);
        const wData = wRes?.data !== undefined ? wRes.data : wRes;
        setWorkloads(extractArray(wData));
      } catch {}

      if (data?.is_overloaded) {
        toast.warning(
          `${data.teacher_name} is now at ${data.current_workload}/30 periods - overloaded.`
        );
      } else {
        toast.success(`Assigned to ${data.teacher_name || "Teacher"}`);
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

  // Tab 3 Handlers
  const handleDragStart = (e: React.DragEvent, subject: any) => {
    e.dataTransfer.setData("application/json", JSON.stringify(subject));
  };

  const handleDrop = (e: React.DragEvent, day: string, slotId: string) => {
    e.preventDefault();
    try {
      const subject = JSON.parse(e.dataTransfer.getData("application/json"));
      const key = `${day}-${slotId}`;

      const assignment = assignments[subject.id];
      const teacherId = getAssignedTeacherValue(assignment);
      const teacherObj = teacherId
        ? teachers.find((t) => t.id === teacherId || t.user_id === teacherId || t.user?.id === teacherId)
        : null;

      setGridData((prev) => ({
        ...prev,
        [key]: {
          subject_id: subject.id,
          subject_name: subject.subject_name,
          color: subject.color_code || "#3B82F6",
          teacher_name: teacherObj ? teacherName(teacherObj) : "Unassigned",
        },
      }));
    } catch (err) {
      console.error("Drop error", err);
    }
  };

  const handleRemoveCell = (day: string, slotId: string) => {
    const key = `${day}-${slotId}`;
    setGridData((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSaveGrid = async () => {
    setIsSavingGrid(true);
    try {
      const cacheKey = `grid_${selectedClassId}_${selectedSectionId}`;
      localStorage.setItem(cacheKey, JSON.stringify(gridData));

      try {
        await api.post("/timetable/grid", {
          class_id: selectedClassId,
          section_id: selectedSectionId,
          grid: gridData,
        });
      } catch (err) {}

      toast.success("Timetable grid saved successfully!");
    } catch (error) {
      toast.error("Error saving grid");
    } finally {
      setIsSavingGrid(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
      {/* Toast Notice Banner */}
      {toastBanner && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium border animate-bounce ${
            toastBanner.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40"
              : toastBanner.type === "error"
              ? "bg-rose-950/90 text-rose-200 border-rose-500/40"
              : "bg-amber-950/90 text-amber-200 border-amber-500/40"
          }`}
        >
          {toastBanner.msg}
        </div>
      )}

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
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            Select Class
            {isLoadingClasses && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={isLoadingClasses}
            className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 disabled:opacity-60"
          >
            {isLoadingClasses ? (
              <option value="">Loading classes from server...</option>
            ) : classes.length === 0 ? (
              <option value="">No classes found in database</option>
            ) : (
              classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))
            )}
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
            disabled={sections.length === 0 || isLoadingSections}
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

              <div className="mt-5 p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Subjects are saved specifically for <strong>{getSelectedContextName()}</strong>.
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
                <Users className="w-4 h-4 text-blue-400" /> Teacher Workload
              </h3>
              <p className="text-xs text-slate-500 mb-4">Max {MAX_PERIODS} periods/week</p>

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
                    const w = workloads.find(
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
                          <p className="text-sm font-bold text-white truncate pr-2">
                            {teacherName(t)}
                          </p>
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
          <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-400" />
                Drag & Drop Grid Builder
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Drag configured subjects from the palette below into the timetable slots.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (confirm("Clear entire grid?")) setGridData({});
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-sm font-medium transition-all"
              >
                Clear Grid
              </button>
              <button
                onClick={handleSaveGrid}
                disabled={isSavingGrid}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/20 text-sm font-medium transition-all flex items-center gap-2"
              >
                {isSavingGrid ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Save Timetable
              </button>
            </div>
          </div>

          <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Available Subjects
            </h4>
            {classSubjects.length === 0 ? (
              <p className="text-sm text-slate-500">
                No subjects configured. Go to Tab 1 to add them.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {classSubjects.map((sub) => {
                  const assignMent = assignments[sub.id];
                  const teachId = getAssignedTeacherValue(assignMent);
                  const tObj = teachId
                    ? teachers.find((t) => t.id === teachId || t.user_id === teachId)
                    : null;

                  return (
                    <div
                      key={sub.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, sub)}
                      className="flex-shrink-0 cursor-grab active:cursor-grabbing px-4 py-2.5 rounded-xl border bg-[#0f172a] hover:bg-slate-800 transition-colors flex flex-col min-w-[130px] shadow-sm relative group"
                      style={{
                        borderBottom: `3px solid ${sub.color_code || "#3B82F6"}`,
                        borderColor: "rgba(51, 65, 85, 0.5)",
                      }}
                    >
                      <span className="text-sm font-bold text-slate-200 truncate">
                        {sub.subject_name}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate mt-0.5">
                        {tObj ? teacherName(tObj) : "Unassigned"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-800/40 border-b border-slate-800">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase w-28 border-r border-slate-800 bg-[#0f172a]/50">
                    Day / Time
                  </th>
                  {timeSlots.map((slot) => (
                    <th key={slot.id} className="p-3 border-r border-slate-800 text-center">
                      <div
                        className={`text-xs font-bold ${
                          slot.isBreak ? "text-amber-400" : "text-slate-300"
                        }`}
                      >
                        {slot.label}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                        {slot.time}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daysList.map((day) => (
                  <tr
                    key={day}
                    className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="p-4 text-sm font-bold text-slate-300 bg-[#0f172a]/30 border-r border-slate-800">
                      {day}
                    </td>
                    {timeSlots.map((slot) => {
                      if (slot.isBreak) {
                        return (
                          <td
                            key={slot.id}
                            className="p-2 border-r border-slate-800 bg-slate-800/30 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest"
                          >
                            Break
                          </td>
                        );
                      }

                      const cellKey = `${day}-${slot.id}`;
                      const cellData = gridData[cellKey];

                      return (
                        <td
                          key={slot.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDrop(e, day, slot.id)}
                          className="p-2 border-r border-slate-800 h-[84px] min-w-[130px] relative group transition-colors hover:bg-blue-900/10"
                        >
                          {cellData ? (
                            <div
                              className="h-full w-full rounded-xl p-2.5 flex flex-col justify-between shadow-sm"
                              style={{
                                backgroundColor: `${cellData.color}15`,
                                border: `1px solid ${cellData.color}40`,
                              }}
                            >
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-xs font-bold text-slate-100 leading-tight truncate">
                                  {cellData.subject_name}
                                </span>
                                <button
                                  onClick={() => handleRemoveCell(day, slot.id)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-opacity p-0.5"
                                  title="Clear slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <span className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-1">
                                👨‍🏫 {cellData.teacher_name}
                              </span>
                            </div>
                          ) : (
                            <div className="w-full h-full border border-dashed border-slate-700/50 rounded-xl flex items-center justify-center text-[11px] text-slate-600 group-hover:border-blue-500/30 group-hover:text-blue-400 transition-all">
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
  );
}