"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Save,
  Copy,
  Plus,
  Sparkles,
  RefreshCw,
  X,
  BookOpen,
  User,
  Wand2,
  Users,
  AlertCircle,
  Loader2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PERIOD_COUNT = 6;
const PERIOD_TIMES = [
  "08:00 - 08:45",
  "08:45 - 09:30",
  "09:45 - 10:30",
  "10:30 - 11:15",
  "11:45 - 12:30",
  "12:30 - 01:15",
];

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("access_token") ||
    "";

  let tenantId =
    localStorage.getItem("tenant_id") ||
    localStorage.getItem("tenantId") ||
    localStorage.getItem("X-Tenant-ID") ||
    "";

  try {
    const raw =
      localStorage.getItem("auth-storage") ||
      localStorage.getItem("authStore") ||
      localStorage.getItem("school-auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed?.state || parsed;
      if (!tenantId && (state?.tenant_id || state?.tenantId || state?.user?.tenant_id)) {
        tenantId =
          state.tenant_id || state.tenantId || state.user?.tenant_id || tenantId;
      }
    }
  } catch {
    /* ignore */
  }

  if (!tenantId && typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.includes("/school/ppps")) {
      tenantId = "5defdf1d-3bb6-4613-8531-109ac219ba63";
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  return headers;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const url = path.startsWith("http")
    ? path
    : `${API}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.detail ||
      data?.message ||
      `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

function asList(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.classes)) return data.classes;
  if (Array.isArray(data?.staff)) return data.staff;
  if (Array.isArray(data?.subjects)) return data.subjects;
  if (Array.isArray(data?.sections)) return data.sections;
  return [];
}

function mapSections(list: any[]): SectionItem[] {
  return list
    .map((s: any) => ({
      id: String(s.id || s.section_id || ""),
      name: String(s.name || s.section_name || s.display_name || "A"),
    }))
    .filter((s) => s.id.length > 0);
}

interface SectionItem {
  id: string;
  name: string;
}

interface ClassItem {
  id: string;
  name: string;
  section_count: number;
  sections?: SectionItem[];
}

interface SubjectItem {
  id: string;
  name: string;
  code?: string;
  color_code: string;
}

interface TeacherItem {
  id: string;
  name: string;
  employee_id: string;
  subjects: string;
}

interface Slot {
  id?: string;
  day_of_week: string;
  period_number: number;
  subject_id: string | null;
  staff_id: string | null;
  subject_name?: string;
  teacher_name?: string;
  color_code?: string;
}

export default function TimetablePage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [grid, setGrid] = useState<Record<string, Slot>>({});
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalCell, setModalCell] = useState<{ day: string; period: number } | null>(null);
  const [modalSubject, setModalSubject] = useState("");
  const [modalTeacher, setModalTeacher] = useState("");
  const [newSectionModal, setNewSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("A");

  const loadClasses = useCallback(async () => {
    const paths = ["/classes/", "/classes", "/timetable/classes"];
    let lastErr = "";
    for (const p of paths) {
      try {
        const data = await apiFetch(p);
        const list = asList(data);
        return list.map((c: any) => {
          const nested = mapSections(
            Array.isArray(c.sections) ? c.sections : asList(c.sections)
          );
          return {
            id: String(c.id),
            name: c.name || c.class_name || "Class",
            section_count:
              nested.length ||
              c.section_count ||
              c.sections_count ||
              0,
            sections: nested,
          } as ClassItem;
        });
      } catch (e: any) {
        lastErr = e.message;
      }
    }
    if (lastErr) throw new Error(lastErr);
    return [];
  }, []);

  const loadSubjects = useCallback(async () => {
    const paths = ["/subjects/", "/subjects", "/timetable/subjects"];
    for (const p of paths) {
      try {
        const data = await apiFetch(p);
        const list = asList(data);
        return list.map((s: any) => ({
          id: String(s.id),
          name: s.name,
          code: s.code,
          color_code: s.color_code || s.color || "#1E40AF",
        }));
      } catch {
        /* try next */
      }
    }
    return [];
  }, []);

  const loadTeachers = useCallback(async () => {
    const paths = [
      "/staff/?staff_type=teaching",
      "/staff/?type=teaching",
      "/staff/",
      "/staff",
      "/timetable/teachers",
    ];
    for (const p of paths) {
      try {
        const data = await apiFetch(p);
        const list = asList(data);
        const teaching = list.filter((s: any) => {
          const t = String(s.staff_type || s.type || "teaching").toLowerCase();
          return t.includes("teach") || !s.staff_type;
        });
        const mapped = (teaching.length ? teaching : list).map((s: any) => {
          const extras = s.extras || {};
          const name =
            s.name ||
            [s.first_name, s.last_name].filter(Boolean).join(" ") ||
            "Teacher";
          const subjectsStr =
            extras.subjects ||
            s.subjects ||
            (Array.isArray(s.subject_names) ? s.subject_names.join(", ") : "") ||
            "";
          return {
            id: String(s.id),
            name,
            employee_id: s.employee_id || s.employee_code || "",
            subjects: typeof subjectsStr === "string" ? subjectsStr : "",
          };
        });
        if (mapped.length > 0) return mapped;
      } catch {
        /* try next */
      }
    }
    return [];
  }, []);

  const loadInitialData = useCallback(async () => {
    setBootLoading(true);
    setLoadError("");
    try {
      const [c, s, t] = await Promise.all([
        loadClasses(),
        loadSubjects(),
        loadTeachers(),
      ]);
      setClasses(c);
      setSubjects(s);
      setTeachers(t);

      if (c.length === 0 && s.length === 0 && t.length === 0) {
        setLoadError(
          "Could not load data. Check login token / backend. Open F12 → Network."
        );
      }
    } catch (e: any) {
      console.error(e);
      setLoadError(e.message || "Failed to load");
      toast.error(e.message || "Failed to load school data");
    } finally {
      setBootLoading(false);
    }
  }, [loadClasses, loadSubjects, loadTeachers]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  /** Load sections: nested first, then multiple API fallbacks */
  const loadSections = useCallback(
    async (classId: string) => {
      if (!classId) {
        setSections([]);
        setSelectedSection("");
        return;
      }

      setSectionsLoading(true);
      try {
        // 1) Nested sections from already-loaded classes
        const cls = classes.find((c) => c.id === classId);
        if (cls?.sections && cls.sections.length > 0) {
          setSections(cls.sections);
          setSelectedSection(cls.sections[0].id);
          setSectionsLoading(false);
          // still refresh in background from API if possible
        }

        // 2) API paths
        const paths = [
          `/classes/${classId}`,
          `/sections/?class_id=${classId}`,
          `/sections?class_id=${classId}`,
          `/classes/${classId}/sections`,
          `/classes/${classId}/sections/`,
          `/timetable/sections?class_id=${classId}`,
        ];

        for (const p of paths) {
          try {
            const data = await apiFetch(p);

            // single class detail with nested sections
            if (data && !Array.isArray(data) && Array.isArray(data.sections)) {
              const list = mapSections(data.sections);
              if (list.length > 0) {
                setSections(list);
                setSelectedSection((prev) =>
                  list.some((x) => x.id === prev) ? prev : list[0].id
                );
                // update cache on class
                setClasses((prev) =>
                  prev.map((c) =>
                    c.id === classId
                      ? { ...c, sections: list, section_count: list.length }
                      : c
                  )
                );
                return;
              }
            }

            const list = mapSections(asList(data));
            if (list.length > 0) {
              setSections(list);
              setSelectedSection((prev) =>
                list.some((x) => x.id === prev) ? prev : list[0].id
              );
              setClasses((prev) =>
                prev.map((c) =>
                  c.id === classId
                    ? { ...c, sections: list, section_count: list.length }
                    : c
                )
              );
              return;
            }
          } catch (err) {
            console.warn("Section path failed:", p, err);
          }
        }

        // If nothing from API and no nested — empty
        if (!cls?.sections?.length) {
          setSections([]);
          setSelectedSection("");
          setGrid({});
        }
      } finally {
        setSectionsLoading(false);
      }
    },
    [classes]
  );

  useEffect(() => {
    if (selectedClass) {
      loadSections(selectedClass);
    } else {
      setSections([]);
      setSelectedSection("");
      setGrid({});
    }
  }, [selectedClass]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGrid = async () => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    try {
      const data = await apiFetch(
        `/timetable/grid?class_id=${selectedClass}&section_id=${selectedSection}`
      );
      const gridMap: Record<string, Slot> = {};
      (data.slots || []).forEach((slot: Slot) => {
        gridMap[`${slot.day_of_week}-${slot.period_number}`] = slot;
      });
      setGrid(gridMap);
    } catch (e: any) {
      console.error(e);
      setGrid({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedSection) loadGrid();
  }, [selectedClass, selectedSection]); // eslint-disable-line react-hooks/exhaustive-deps

  const quickSetupSubjects = async () => {
    try {
      try {
        const data = await apiFetch("/timetable/subjects/bulk-defaults", {
          method: "POST",
        });
        toast.success(data.message || "Subjects created");
      } catch {
        const defaults = [
          { name: "Mathematics", code: "MATH", color_code: "#1E40AF" },
          { name: "Physics", code: "PHY", color_code: "#D97706" },
          { name: "Chemistry", code: "CHEM", color_code: "#059669" },
          { name: "Biology", code: "BIO", color_code: "#10B981" },
          { name: "English", code: "ENG", color_code: "#7C3AED" },
          { name: "Hindi", code: "HIN", color_code: "#EA580C" },
          { name: "Social Studies", code: "SST", color_code: "#DC2626" },
          { name: "Computer Science", code: "CS", color_code: "#0284C7" },
        ];
        for (const d of defaults) {
          try {
            await apiFetch("/subjects/", {
              method: "POST",
              body: JSON.stringify(d),
            });
          } catch {
            try {
              await apiFetch("/timetable/subjects", {
                method: "POST",
                body: JSON.stringify(d),
              });
            } catch {
              /* skip dup */
            }
          }
        }
        toast.success("Subjects setup done");
      }
      await loadInitialData();
    } catch (e: any) {
      toast.error(e.message || "Failed to setup subjects");
    }
  };

  const createSection = async () => {
    if (!selectedClass) {
      toast.error("Select class first");
      return;
    }
    const name = newSectionName.trim() || "A";
    try {
      let data: any;
      try {
        data = await apiFetch("/timetable/sections", {
          method: "POST",
          body: JSON.stringify({ class_id: selectedClass, name }),
        });
      } catch {
        try {
          data = await apiFetch(`/classes/${selectedClass}/sections`, {
            method: "POST",
            body: JSON.stringify({ name }),
          });
        } catch {
          data = await apiFetch("/sections/", {
            method: "POST",
            body: JSON.stringify({ class_id: selectedClass, name }),
          });
        }
      }
      toast.success(`Section ${data.name || name} created`);
      setNewSectionModal(false);
      setNewSectionName("A");
      // clear nested cache so reload is fresh
      setClasses((prev) =>
        prev.map((c) =>
          c.id === selectedClass ? { ...c, sections: undefined } : c
        )
      );
      await loadSections(selectedClass);
      await loadInitialData();
    } catch (e: any) {
      toast.error(e.message || "Failed to create section");
    }
  };

  const openCellModal = (day: string, period: number) => {
    const existing = grid[`${day}-${period}`];
    setModalCell({ day, period });
    setModalSubject(existing?.subject_id || "");
    setModalTeacher(existing?.staff_id || "");
    setModalOpen(true);
  };

  const saveCell = () => {
    if (!modalCell) return;
    const key = `${modalCell.day}-${modalCell.period}`;
    const subject = subjects.find((s) => s.id === modalSubject);
    const teacher = teachers.find((t) => t.id === modalTeacher);
    if (!modalSubject && !modalTeacher) {
      const g = { ...grid };
      delete g[key];
      setGrid(g);
    } else {
      setGrid({
        ...grid,
        [key]: {
          day_of_week: modalCell.day,
          period_number: modalCell.period,
          subject_id: modalSubject || null,
          staff_id: modalTeacher || null,
          subject_name: subject?.name,
          teacher_name: teacher?.name,
          color_code: subject?.color_code || "#64748B",
        },
      });
    }
    setModalOpen(false);
  };

  const clearCell = () => {
    if (!modalCell) return;
    const g = { ...grid };
    delete g[`${modalCell.day}-${modalCell.period}`];
    setGrid(g);
    setModalOpen(false);
  };

  const saveTimetable = async () => {
    if (!selectedClass || !selectedSection) {
      toast.error("Select class and section");
      return;
    }
    setSaving(true);
    try {
      const slots = Object.values(grid).map((s) => ({
        day_of_week: s.day_of_week,
        period_number: s.period_number,
        subject_id: s.subject_id,
        staff_id: s.staff_id,
        period_name: `Period ${s.period_number}`,
      }));
      const data = await apiFetch("/timetable/save", {
        method: "POST",
        body: JSON.stringify({
          class_id: selectedClass,
          section_id: selectedSection,
          slots,
        }),
      });
      toast.success(`Saved ${data.slots_saved ?? slots.length} slots`);
      await loadGrid();
    } catch (e: any) {
      toast.error(e.message || "Save failed — check Timetable backend APIs");
    } finally {
      setSaving(false);
    }
  };

  const copyFromMondayToAll = () => {
    const mon = Object.values(grid).filter((s) => s.day_of_week === "MONDAY");
    if (!mon.length) {
      toast.error("Fill Monday first");
      return;
    }
    const g = { ...grid };
    DAYS.slice(1).forEach((day) => {
      mon.forEach((slot) => {
        g[`${day}-${slot.period_number}`] = { ...slot, day_of_week: day };
      });
    });
    setGrid(g);
    toast.success("Monday copied to all days");
  };

  const smartAutoFill = () => {
    if (!selectedClass || !selectedSection) {
      toast.error("Select class + section");
      return;
    }
    if (!subjects.length) {
      toast.error("Setup subjects first");
      return;
    }
    if (!teachers.length) {
      toast.error("No teachers found");
      return;
    }

    const map: Record<string, TeacherItem[]> = {};
    subjects.forEach((sub) => {
      map[sub.name.toLowerCase()] = [];
    });
    teachers.forEach((teacher) => {
      const parts = (teacher.subjects || "")
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
      if (!parts.length) {
        Object.keys(map).forEach((k) => map[k].push(teacher));
        return;
      }
      parts.forEach((ps) => {
        Object.keys(map).forEach((db) => {
          if (db.includes(ps) || ps.includes(db) || db === ps) {
            if (!map[db].find((t) => t.id === teacher.id)) map[db].push(teacher);
          }
        });
      });
    });

    let assignable = subjects.filter((s) => map[s.name.toLowerCase()]?.length);
    if (!assignable.length) {
      assignable = subjects;
      subjects.forEach((s) => {
        map[s.name.toLowerCase()] = [...teachers];
      });
    }

    const g: Record<string, Slot> = {};
    const load: Record<string, number> = {};
    let idx = 0;
    for (let p = 1; p <= PERIOD_COUNT; p++) {
      for (const day of DAYS) {
        const sub = assignable[idx % assignable.length];
        idx++;
        const pool = map[sub.name.toLowerCase()] || teachers;
        const sorted = [...pool].sort(
          (a, b) => (load[a.id] || 0) - (load[b.id] || 0)
        );
        const teacher = sorted[0];
        load[teacher.id] = (load[teacher.id] || 0) + 1;
        g[`${day}-${p}`] = {
          day_of_week: day,
          period_number: p,
          subject_id: sub.id,
          staff_id: teacher.id,
          subject_name: sub.name,
          teacher_name: teacher.name,
          color_code: sub.color_code,
        };
      }
    }
    setGrid(g);
    toast.success(`✨ Auto-filled ${Object.keys(g).length} slots — review & Save`);
  };

  const teacherWorkload = useMemo(() => {
    const load: Record<string, { name: string; periods: number }> = {};
    Object.values(grid).forEach((slot) => {
      if (!slot.staff_id) return;
      if (!load[slot.staff_id])
        load[slot.staff_id] = { name: slot.teacher_name || "?", periods: 0 };
      load[slot.staff_id].periods++;
    });
    return Object.values(load).sort((a, b) => b.periods - a.periods);
  }, [grid]);

  const filled = Object.keys(grid).length;
  const total = DAYS.length * PERIOD_COUNT;

  if (bootLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        Loading classes, teachers & subjects...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Calendar className="w-6 h-6 text-blue-400" />
            Timetable Builder
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Auto-loads Classes · Sections · Teachers · Subjects from school data
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => loadInitialData()}
            className="flex items-center gap-1 px-3 py-2 bg-white/10 text-gray-200 rounded-lg text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Reload Data
          </button>
          <button
            onClick={smartAutoFill}
            className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-semibold"
          >
            <Wand2 className="w-4 h-4" /> Smart Auto-Fill
          </button>
          <button
            onClick={copyFromMondayToAll}
            className="flex items-center gap-1 px-4 py-2 bg-purple-600/20 text-purple-300 rounded-lg text-sm"
          >
            <Copy className="w-4 h-4" /> Copy Mon → All
          </button>
          <button
            onClick={saveTimetable}
            disabled={saving || !selectedClass || !selectedSection}
            className="flex items-center gap-1 px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 font-medium"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Timetable"}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm flex gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-medium">Load error</div>
            <div>{loadError}</div>
          </div>
        </div>
      )}

      {subjects.length === 0 && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex justify-between items-center flex-wrap gap-3">
          <div className="text-amber-200 text-sm">
            <strong>No subjects yet.</strong> Click Quick Setup for CBSE defaults.
          </div>
          <button
            onClick={quickSetupSubjects}
            className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium flex items-center gap-1"
          >
            <Sparkles className="w-4 h-4" /> Quick Setup Subjects
          </button>
        </div>
      )}

      {/* SELECTORS */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-gray-300 mb-1 block">
              📚 Class ({classes.length})
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection("");
                setSections([]);
                setGrid({});
              }}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg"
            >
              <option value="" className="bg-gray-900">
                Select Class
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-gray-900">
                  {c.name} ({c.section_count} sec)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-300 mb-1 block">
              📍 Section ({sections.length})
              {sectionsLoading ? " · loading..." : ""}
            </label>
            <div className="flex gap-2">
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedClass || sectionsLoading}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg disabled:opacity-50"
              >
                <option value="" className="bg-gray-900">
                  {sectionsLoading
                    ? "Loading sections..."
                    : sections.length === 0
                    ? "No sections — click +"
                    : "Select Section"}
                </option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id} className="bg-gray-900">
                    Section {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setNewSectionModal(true)}
                disabled={!selectedClass}
                title="Add section"
                className="px-3 py-2 bg-green-600/20 text-green-300 rounded-lg disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {selectedClass && !sectionsLoading && sections.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                No sections found. Click + to create Section A/B/C.
              </p>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-300 mb-1 block">📊 Progress</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 text-[10px] text-white flex items-center justify-center"
                  style={{ width: `${(filled / total) * 100}%` }}
                >
                  {filled > 0 ? `${Math.round((filled / total) * 100)}%` : ""}
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {filled}/{total}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-300 space-y-1 pt-5">
            <div>📚 {subjects.length} Subjects</div>
            <div>👨‍🏫 {teachers.length} Teachers</div>
            <div>🏫 {classes.length} Classes</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          {selectedClass && selectedSection ? (
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-400">Loading grid...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="p-3 text-left text-gray-200 w-28">Period</th>
                        {DAY_LABELS.map((d) => (
                          <th key={d} className="p-3 text-center text-gray-200 min-w-[120px]">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: PERIOD_COUNT }, (_, i) => i + 1).map((period) => (
                        <tr key={period} className="border-b border-white/5">
                          <td className="p-3 bg-white/5">
                            <div className="font-semibold text-gray-200">P{period}</div>
                            <div className="text-[10px] text-gray-500">
                              {PERIOD_TIMES[period - 1]}
                            </div>
                          </td>
                          {DAYS.map((day) => {
                            const slot = grid[`${day}-${period}`];
                            return (
                              <td
                                key={`${day}-${period}`}
                                onClick={() => openCellModal(day, period)}
                                className="p-2 cursor-pointer hover:bg-white/5"
                              >
                                {slot ? (
                                  <div
                                    className="rounded-lg p-2 text-white text-sm"
                                    style={{ backgroundColor: slot.color_code || "#64748B" }}
                                  >
                                    <div className="font-semibold truncate">
                                      {slot.subject_name}
                                    </div>
                                    <div className="text-xs opacity-90 truncate">
                                      {slot.teacher_name}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="border-2 border-dashed border-white/20 rounded-lg p-3 text-center text-gray-500">
                                    <Plus className="w-4 h-4 mx-auto" />
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
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-white/10 rounded-lg p-12 text-center text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              {classes.length === 0
                ? "No classes loaded. Click Reload Data or open Classes page first."
                : "Select Class + Section to start building timetable"}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> Workload
            </h3>
            {teacherWorkload.length === 0 ? (
              <p className="text-sm text-gray-500">Empty</p>
            ) : (
              teacherWorkload.map((t, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-300 py-1">
                  <span className="truncate mr-2">{t.name}</span>
                  <span>{t.periods}p</span>
                </div>
              ))
            )}
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-green-400" /> Teachers
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {teachers.map((t) => (
                <div key={t.id} className="text-xs p-2 bg-white/5 rounded">
                  <div className="text-gray-200">{t.name}</div>
                  <div className="text-gray-500 truncate">{t.subjects || "—"}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" /> Subjects
            </h3>
            <div className="grid grid-cols-1 gap-1">
              {subjects.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs text-gray-300">
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: s.color_code }}
                  />
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && modalCell && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between mb-4">
              <h3 className="text-white font-bold">
                {DAY_LABELS[DAYS.indexOf(modalCell.day)]} · P{modalCell.period}
              </h3>
              <button onClick={() => setModalOpen(false)}>
                <X className="text-gray-400" />
              </button>
            </div>
            <label className="text-sm text-gray-300">Subject</label>
            <select
              value={modalSubject}
              onChange={(e) => setModalSubject(e.target.value)}
              className="w-full mb-3 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg"
            >
              <option value="" className="bg-gray-900">
                —
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id} className="bg-gray-900">
                  {s.name}
                </option>
              ))}
            </select>
            <label className="text-sm text-gray-300">Teacher</label>
            <select
              value={modalTeacher}
              onChange={(e) => setModalTeacher(e.target.value)}
              className="w-full mb-4 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg"
            >
              <option value="" className="bg-gray-900">
                —
              </option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id} className="bg-gray-900">
                  {t.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={clearCell} className="flex-1 py-2 bg-red-600/20 text-red-300 rounded-lg">
                Clear
              </button>
              <button onClick={saveCell} className="flex-1 py-2 bg-blue-600 text-white rounded-lg">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {newSectionModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold mb-3">New Section</h3>
            <input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg mb-4"
              maxLength={5}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNewSectionModal(false)}
                className="flex-1 py-2 bg-white/10 text-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button onClick={createSection} className="flex-1 py-2 bg-blue-600 text-white rounded-lg">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}