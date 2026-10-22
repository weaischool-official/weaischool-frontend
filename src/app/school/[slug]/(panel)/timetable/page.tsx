"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Save,
  X,
  AlertCircle,
  GripVertical,
  Briefcase,
  Check,
} from "lucide-react";
import {
  classApi,
  academicYearApi,
  sectionApi,
} from "@/lib/api";
import api from "@/lib/api";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ClassItem {
  id: string;
  name: string;
  numeric_level?: number;
  class_level?: number;
  academic_year_id: string;
  total_sections?: number;
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

interface StaffMember {
  id: string;
  first_name?: string;
  last_name?: string;
  designation?: string;
  employee_id?: string;
  email?: string;
  phone?: string;
  extras?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SubjectConfig {
  name: string;
  periodsPerWeek: number;
  color: string;
  colorIndex: number;
  teacherId: string;
  teacherName: string;
}

interface GridCell {
  subject: string;
  teacherId: string;
  teacherName: string;
  color: string;
}

interface TimetableEntry {
  day_of_week: number;
  period_number: number;
  subject_name: string;
  teacher_id?: string;
  teacher_name?: string;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Pre-defined common subjects for suggestions
const COMMON_SUBJECTS = [
  "Mathematics", "English", "Hindi", "Science", "Physics", "Chemistry", 
  "Biology", "Social Science", "History", "Geography", "Civics", "Economics", 
  "Computer Science", "Information Technology", "Physical Education", 
  "Art", "Music", "Sanskrit", "Marathi", "Gujarati", "Accountancy", 
  "Business Studies", "Environmental Studies", "General Knowledge"
];

// CHANGED: Made colors significantly darker and text white for better visibility
const SUBJECT_COLORS = [
  { bg: "bg-blue-600", text: "text-white", light: "bg-blue-900/60", border: "border-blue-500" },
  { bg: "bg-purple-600", text: "text-white", light: "bg-purple-900/60", border: "border-purple-500" },
  { bg: "bg-green-600", text: "text-white", light: "bg-green-900/60", border: "border-green-500" },
  { bg: "bg-yellow-600", text: "text-white", light: "bg-yellow-900/60", border: "border-yellow-500" },
  { bg: "bg-red-600", text: "text-white", light: "bg-red-900/60", border: "border-red-500" },
  { bg: "bg-pink-600", text: "text-white", light: "bg-pink-900/60", border: "border-pink-500" },
  { bg: "bg-indigo-600", text: "text-white", light: "bg-indigo-900/60", border: "border-indigo-500" },
  { bg: "bg-teal-600", text: "text-white", light: "bg-teal-900/60", border: "border-teal-500" },
  { bg: "bg-orange-600", text: "text-white", light: "bg-orange-900/60", border: "border-orange-500" },
  { bg: "bg-cyan-600", text: "text-white", light: "bg-cyan-900/60", border: "border-cyan-500" },
  { bg: "bg-emerald-600", text: "text-white", light: "bg-emerald-900/60", border: "border-emerald-500" },
  { bg: "bg-rose-600", text: "text-white", light: "bg-rose-900/60", border: "border-rose-500" },
];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function asItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "items" in data) {
    const items = (data as { items?: T[] }).items;
    if (Array.isArray(items)) return items;
  }
  return [];
}

function extractArray(data: unknown): Array<Record<string, unknown>> {
  if (!data) return [];
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  const r = data as Record<string, unknown>;
  for (const key of ["items", "staff", "users", "results", "data", "entries", "timetable"]) {
    const val = r[key];
    if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
  }
  return [];
}

function getStaffName(s: StaffMember): string {
  const first = s.first_name || "";
  const last = s.last_name && s.last_name !== "." ? s.last_name : "";
  return `${first} ${last}`.trim() || "Unknown";
}

function getStaffSubjects(s: StaffMember): string {
  const extras = (s.extras as Record<string, unknown>) || {};
  const sub = extras.subjects;
  if (Array.isArray(sub)) return sub.join(", ");
  if (typeof sub === "string") return sub;
  return "";
}

function emptyGrid(periodsCount: number): (GridCell | null)[][] {
  return Array.from({ length: DAYS.length }, () =>
    Array.from({ length: periodsCount }, () => null)
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function TimetablePage() {
  const queryClient = useQueryClient();

  // ── Core State ──
  const [activeTab, setActiveTab] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");

  // ── Dynamic Grid Configuration ──
  const [numPeriods, setNumPeriods] = useState(8); // Default 8 periods/day
  const activePeriods = useMemo(() => Array.from({ length: numPeriods }, (_, i) => i + 1), [numPeriods]);
  const totalSlots = DAYS.length * numPeriods;

  // ── Tab 1: Subjects ──
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [newSubjName, setNewSubjName] = useState("");
  const [newSubjPeriods, setNewSubjPeriods] = useState(6); // Default 6 per week
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Tab 3: Grid ──
  const [grid, setGrid] = useState<(GridCell | null)[][]>(emptyGrid(8));
  const [activeCellPicker, setActiveCellPicker] = useState<string | null>(null);
  const [draggedSubject, setDraggedSubject] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════
  // DATA FETCHING 
  // ═══════════════════════════════════════════════════════

  // 1. Academic Years
  const { data: yearsData } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearApi.list().then((r) => r.data),
  });
  const academicYears = asItems<AcademicYear>(yearsData);
  const currentYear =
    academicYears.find((y) => y.is_current || y.is_active) || academicYears[0];

  // 2. Classes (depends on academic year)
  const {
    data: classesData,
    isLoading: classesLoading,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: ["classes", currentYear?.id],
    queryFn: () => classApi.list(currentYear?.id).then((r) => r.data),
    enabled: !!currentYear?.id,
  });
  const classes = useMemo(() => {
    const c = asItems<ClassItem>(classesData);
    return [...c].sort(
      (a, b) =>
        (a.numeric_level ?? a.class_level ?? 0) -
        (b.numeric_level ?? b.class_level ?? 0)
    );
  }, [classesData]);

  // 3. Sections (depends on selected class)
  const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections", selectedClassId],
    queryFn: () => sectionApi.listByClass(selectedClassId).then((r) => r.data),
    enabled: !!selectedClassId,
  });
  const sections = asItems<SectionItem>(sectionsData);

  // 4. Staff 
  const { data: staffRaw, isLoading: staffLoading } = useQuery({
    queryKey: ["staff-list", "timetable"],
    queryFn: async () => {
      const res = await api.get("/staff", { params: { per_page: 100 } });
      return res.data;
    },
  });
  const allStaff = useMemo(
    () => extractArray(staffRaw) as StaffMember[],
    [staffRaw]
  );

  // 5. Existing Timetable
  const { data: timetableRaw, isLoading: timetableLoading } = useQuery({
    queryKey: ["timetable", selectedClassId, selectedSectionId],
    queryFn: async () => {
      try {
        const res = await api.get("/timetable", {
          params: {
            class_id: selectedClassId,
            section_id: selectedSectionId,
          },
        });
        return res.data;
      } catch {
        return [];
      }
    },
    enabled: !!selectedClassId && !!selectedSectionId,
  });

  // ── Populate grid + subjects from existing timetable ──
  useEffect(() => {
    if (!timetableRaw) return;
    const entries = extractArray(timetableRaw) as unknown as TimetableEntry[];
    if (entries.length === 0) {
      setGrid(emptyGrid(8));
      setNumPeriods(8);
      return;
    }

    // Determine max periods needed based on existing data
    let maxP = 8;
    for (const entry of entries) {
      if (entry.period_number > maxP) {
        maxP = entry.period_number;
      }
    }

    setNumPeriods(maxP);
    const newGrid = emptyGrid(maxP);
    const subjectMap = new Map<string, SubjectConfig>();
    let colorIdx = 0;

    for (const entry of entries) {
      const day = entry.day_of_week;
      const period = entry.period_number - 1;
      if (day >= 0 && day < DAYS.length && period >= 0 && period < maxP) {
        const subjName = entry.subject_name || "";
        const tId = entry.teacher_id || "";
        const tName = entry.teacher_name || "";
        const color = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];

        newGrid[day][period] = {
          subject: subjName,
          teacherId: tId,
          teacherName: tName,
          color: color.bg,
        };

        if (!subjectMap.has(subjName)) {
          subjectMap.set(subjName, {
            name: subjName,
            periodsPerWeek: 0,
            color: color.bg,
            colorIndex: colorIdx % SUBJECT_COLORS.length,
            teacherId: tId,
            teacherName: tName,
          });
          colorIdx++;
        }
        subjectMap.get(subjName)!.periodsPerWeek++;
      }
    }

    setGrid(newGrid);
    if (subjects.length === 0) {
      setSubjects(Array.from(subjectMap.values()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timetableRaw]);

  // ── Reset section when class changes ──
  useEffect(() => {
    setSelectedSectionId("");
    setGrid(emptyGrid(numPeriods));
    setActiveCellPicker(null);
  }, [selectedClassId]); 

  // ═══════════════════════════════════════════════════════
  // SAVE MUTATION
  // ═══════════════════════════════════════════════════════

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries: TimetableEntry[] = [];
      for (let d = 0; d < DAYS.length; d++) {
        for (let p = 0; p < activePeriods.length; p++) {
          const cell = grid[d][p];
          if (cell) {
            entries.push({
              day_of_week: d,
              period_number: p + 1,
              subject_name: cell.subject,
              teacher_id: cell.teacherId || undefined,
              teacher_name: cell.teacherName || undefined,
            });
          }
        }
      }

      const payload = {
        class_id: selectedClassId,
        section_id: selectedSectionId,
        entries,
      };

      try {
        await api.post("/timetable", payload);
      } catch {
        try {
          await api.put("/timetable", payload);
        } catch {
          await api.patch("/timetable", payload);
        }
      }
    },
    onSuccess: () => {
      toast.success("Timetable saved successfully!");
      queryClient.invalidateQueries({
        queryKey: ["timetable", selectedClassId, selectedSectionId],
      });
    },
    onError: (err: any) => {
      // CHANGED: Cross-class validation error handling from backend
      const errMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (errMsg) {
        toast.error(`Teacher Conflict: ${errMsg}`);
      } else {
        toast.error(
          "Could not save to server. Please check if the teacher is already assigned in another class for these periods."
        );
      }
    },
  });

  // ═══════════════════════════════════════════════════════
  // SUBJECT HELPERS
  // ═══════════════════════════════════════════════════════

  const totalPeriodsUsed = useMemo(
    () => subjects.reduce((sum, s) => sum + s.periodsPerWeek, 0),
    [subjects]
  );

  const addSubject = useCallback((explicitName?: string) => {
    const name = (typeof explicitName === "string" ? explicitName : newSubjName).trim();
    if (!name) return;
    if (subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Subject already exists");
      return;
    }

    const weeklyTarget = newSubjPeriods; 
    let currentTotalSlots = DAYS.length * numPeriods;

    if (totalPeriodsUsed + weeklyTarget > currentTotalSlots) {
      const newNum = Math.ceil((totalPeriodsUsed + weeklyTarget) / DAYS.length);
      setNumPeriods(newNum);
      
      setGrid((prev) => {
        const next = prev.map((r) => [...r]);
        for (let d = 0; d < DAYS.length; d++) {
          while (next[d].length < newNum) {
            next[d].push(null);
          }
        }
        return next;
      });
    }

    const cIdx = subjects.length % SUBJECT_COLORS.length;
    const color = SUBJECT_COLORS[cIdx];
    setSubjects((prev) => [
      ...prev,
      {
        name,
        periodsPerWeek: weeklyTarget,
        color: color.bg,
        colorIndex: cIdx,
        teacherId: "",
        teacherName: "",
      },
    ]);
    setNewSubjName("");
    setNewSubjPeriods(6);
    setShowSuggestions(false);
    toast.success(`Subject "${name}" added (${weeklyTarget} periods/week)`);
  }, [newSubjName, newSubjPeriods, subjects, totalPeriodsUsed, numPeriods]);

  const removeSubject = useCallback(
    (name: string) => {
      setSubjects((prev) => prev.filter((s) => s.name !== name));
      setGrid((prev) =>
        prev.map((row) =>
          row.map((cell) => (cell?.subject === name ? null : cell))
        )
      );
      toast.success(`Subject "${name}" removed`);
    },
    []
  );

  const assignTeacher = useCallback(
    (subjectName: string, staffId: string) => {
      const staff = allStaff.find((s) => s.id === staffId);
      const tName = staff ? getStaffName(staff) : "";
      setSubjects((prev) =>
        prev.map((s) =>
          s.name === subjectName
            ? { ...s, teacherId: staffId, teacherName: tName }
            : s
        )
      );
      setGrid((prev) =>
        prev.map((row) =>
          row.map((cell) =>
            cell?.subject === subjectName
              ? { ...cell, teacherId: staffId, teacherName: tName }
              : cell
          )
        )
      );
    },
    [allStaff]
  );

  // CHANGED: Added Validation logic for "One subject per day"
  const setGridCell = useCallback(
    (day: number, period: number, subjectName: string | null) => {
      if (subjectName) {
        // Validation: Check if the subject is already assigned on this specific day
        const existingPeriodIndex = grid[day].findIndex(
          (cell) => cell?.subject.toLowerCase() === subjectName.toLowerCase()
        );

        if (existingPeriodIndex !== -1 && existingPeriodIndex !== period) {
          toast.error(
            `${subjectName} is already assigned on ${DAYS[day]} (Period ${existingPeriodIndex + 1}). A subject can only be assigned once per day.`
          );
          setActiveCellPicker(null);
          return;
        }
      }

      setGrid((prev) => {
        const next = prev.map((r) => [...r]);
        if (!subjectName) {
          next[day][period] = null;
        } else {
          const subj = subjects.find(
            (s) => s.name.toLowerCase() === subjectName.toLowerCase()
          );
          next[day][period] = {
            subject: subjectName,
            teacherId: subj?.teacherId || "",
            teacherName: subj?.teacherName || "",
            color: subj?.color || SUBJECT_COLORS[0].bg,
          };
        }
        return next;
      });
      setActiveCellPicker(null);
    },
    [grid, subjects]
  );

  // ═══════════════════════════════════════════════════════
  // DERIVED DATA
  // ═══════════════════════════════════════════════════════

  const selectedClassName =
    classes.find((c) => c.id === selectedClassId)?.name || "";
  const selectedSectionName =
    sections.find((s) => s.id === selectedSectionId)?.name || "";
  const hasSelection = !!selectedClassId && !!selectedSectionId;

  const assignedSubjects = subjects.filter((s) => s.teacherId);
  const unassignedSubjects = subjects.filter((s) => !s.teacherId);

  const gridSubjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of grid) {
      for (const cell of row) {
        if (cell) {
          counts[cell.subject] = (counts[cell.subject] || 0) + 1;
        }
      }
    }
    return counts;
  }, [grid]);

  const filteredSuggestions = useMemo(() => {
    if (!newSubjName.trim()) return [];
    return COMMON_SUBJECTS.filter(
      (s) =>
        s.toLowerCase().includes(newSubjName.toLowerCase()) &&
        !subjects.some((existing) => existing.name.toLowerCase() === s.toLowerCase())
    );
  }, [newSubjName, subjects]);

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Calendar className="w-7 h-7 text-blue-400" />
            Smart Timetable Builder
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {currentYear && (
              <>
                Academic Year:{" "}
                <span className="text-blue-400 font-medium">
                  {currentYear.name}
                </span>
              </>
            )}
            {hasSelection && (
              <>
                {" "}
                · {selectedClassName} · Section {selectedSectionName}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetchClasses()}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors text-sm self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ── CLASS + SECTION SELECTORS ── */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Select Class
            </label>
            {classesLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading classes from database...
              </div>
            ) : classes.length === 0 ? (
              <div className="px-4 py-3 bg-gray-950 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No classes found. Add classes first.
              </div>
            ) : (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="">-- Choose a class --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                    {cls.total_sections
                      ? ` (${cls.total_sections} sections)`
                      : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Select Section
            </label>
            {!selectedClassId ? (
              <div className="px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-gray-600 text-sm">
                Select a class first
              </div>
            ) : sectionsLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading sections...
              </div>
            ) : sections.length === 0 ? (
              <div className="px-4 py-3 bg-gray-950 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No sections created. Add in Classes page.
              </div>
            ) : (
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="">-- Choose a section --</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name} ({sec.current_strength || 0}/
                    {sec.max_students} students)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {!hasSelection && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Select Class & Section
          </h3>
          <p className="text-gray-400">
            Choose a class and section above to start building the timetable.
          </p>
        </div>
      )}

      {hasSelection && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { n: 1, label: "1. Subjects Setup", icon: BookOpen },
              { n: 2, label: "2. Assign Teachers", icon: Users },
              { n: 3, label: "3. Build Grid", icon: Calendar },
            ].map((tab) => (
              <button
                key={tab.n}
                type="button"
                onClick={() => setActiveTab(tab.n)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.n
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 1 && (
            <div className="space-y-5">
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-400" />
                  Add Subject
                </h3>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newSubjName}
                      onChange={(e) => {
                        setNewSubjName(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      onKeyDown={(e) => e.key === "Enter" && addSubject()}
                      placeholder="e.g. Mathematics, English, Physics..."
                      className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {showSuggestions && newSubjName.trim() && filteredSuggestions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 max-h-48 overflow-y-auto">
                        {filteredSuggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => addSubject(s)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center justify-between group"
                          >
                            <span>{s}</span>
                            <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to Add
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 whitespace-nowrap">
                      Periods/Week:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newSubjPeriods}
                      onChange={(e) => setNewSubjPeriods(parseInt(e.target.value) || 1)}
                      className="w-24 px-3 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => addSubject()}
                    disabled={!newSubjName.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    Total periods:{" "}
                    <span
                      className={
                        totalPeriodsUsed > totalSlots
                          ? "text-red-400 font-bold"
                          : "text-blue-400 font-bold"
                      }
                    >
                      {totalPeriodsUsed}
                    </span>
                    /{totalSlots}
                  </span>
                  <span>
                    Remaining:{" "}
                    <span className="text-green-400 font-bold">
                      {Math.max(0, totalSlots - totalPeriodsUsed)}
                    </span>
                  </span>
                </div>
              </div>

              {subjects.length === 0 ? (
                <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-10 text-center">
                  <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400">
                    No subjects added yet. Add subjects above to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subjects.map((subj) => {
                    const c = SUBJECT_COLORS[subj.colorIndex];
                    const placed = gridSubjectCounts[subj.name] || 0;
                    return (
                      <div
                        key={subj.name}
                        className={`${c.light} border ${c.border} rounded-xl p-4 flex items-center justify-between`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-8 rounded-full ${c.bg}`} // Adjusted to use direct bg class
                          />
                          <div>
                            <p className="text-white font-semibold text-sm">
                              {subj.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              Target: {subj.periodsPerWeek} / week · Placed:{" "}
                              <span
                                className={
                                  placed >= subj.periodsPerWeek
                                    ? "text-green-400"
                                    : "text-yellow-400"
                                }
                              >
                                {placed}
                              </span>
                            </p>
                            {subj.teacherName && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                👤 {subj.teacherName}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSubject(subj.name)}
                          className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {subjects.length > 0 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab(2)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    Next: Assign Teachers →
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 2 && (
            <div className="space-y-5">
              {subjects.length === 0 ? (
                <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-10 text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-2">
                    No Subjects Yet
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Go to Tab 1 and add subjects first.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab(1)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    ← Go to Subjects Setup
                  </button>
                </div>
              ) : staffLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-400">
                    Loading teachers from database...
                  </span>
                </div>
              ) : allStaff.length === 0 ? (
                <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-10 text-center">
                  <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-2">
                    No Teachers Found
                  </h3>
                  <p className="text-gray-400">
                    Add teachers in the Staff page first, then come back to
                    assign them.
                  </p>
                </div>
              ) : (
                <>
                  {unassignedSubjects.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
                      <p className="text-sm text-yellow-300">
                        {unassignedSubjects.length} subject(s) still need a
                        teacher assigned.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {subjects.map((subj) => {
                      const c = SUBJECT_COLORS[subj.colorIndex];
                      return (
                        <div
                          key={subj.name}
                          className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                        >
                          <div className="flex items-center gap-3 sm:w-48 shrink-0">
                            <div
                              className={`w-3 h-8 rounded-full ${c.bg}`}
                            />
                            <span className="text-white font-semibold text-sm">
                              {subj.name}
                            </span>
                          </div>
                          <div className="flex-1">
                            <select
                              value={subj.teacherId}
                              onChange={(e) =>
                                assignTeacher(subj.name, e.target.value)
                              }
                              className={`w-full px-4 py-2.5 bg-gray-950 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer ${
                                subj.teacherId
                                  ? "border-green-500/30 text-green-300"
                                  : "border-gray-800 text-gray-400"
                              }`}
                            >
                              <option value="">
                                -- Assign a teacher --
                              </option>
                              {allStaff.map((s) => {
                                const sName = getStaffName(s);
                                const desig =
                                  s.designation ||
                                  String(
                                    (s.extras as Record<string, unknown>)
                                      ?.designation || "Teacher"
                                  );
                                const subjs = getStaffSubjects(s);
                                return (
                                  <option key={s.id} value={s.id}>
                                    {sName} ({desig})
                                    {subjs ? ` — ${subjs}` : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          {subj.teacherId && (
                            <div className="flex items-center gap-1.5 text-xs text-green-400 shrink-0">
                              <Check className="w-4 h-4" />
                              Assigned
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveTab(1)}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                    >
                      ← Subjects
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab(3)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      Next: Build Grid →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 3 && (
            <div className="space-y-5">
              {subjects.length === 0 ? (
                <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-10 text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-2">
                    No Subjects Configured
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Add subjects in Tab 1 and assign teachers in Tab 2 first.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab(1)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    ← Go to Subjects Setup
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-semibold">
                      Drag subjects to grid or click cells to assign
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((subj) => {
                        const placed = gridSubjectCounts[subj.name] || 0;
                        const c = SUBJECT_COLORS[subj.colorIndex];
                        return (
                          <div
                            key={subj.name}
                            draggable
                            onDragStart={() => setDraggedSubject(subj.name)}
                            onDragEnd={() => setDraggedSubject(null)}
                            className={`${c.light} border ${c.border} rounded-lg px-3 py-2 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity select-none`}
                          >
                            <GripVertical className="w-3 h-3 text-gray-500" />
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${c.bg}`}
                            />
                            <span className="text-xs font-semibold text-white">
                              {subj.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({placed}/{subj.periodsPerWeek})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {timetableLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="ml-3 text-gray-400">
                        Loading existing timetable...
                      </span>
                    </div>
                  ) : (
                    // CHANGED: Added pb-32 to container so dropdown doesn't clip at the bottom
                    <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-x-auto pb-32">
                      <table className="w-full min-w-[700px] border-collapse">
                        <thead>
                          <tr>
                            <th className="sticky left-0 z-10 bg-gray-900 border-b border-r border-gray-800 px-3 py-3 text-xs text-gray-500 font-semibold w-16">
                              <Clock className="w-4 h-4 mx-auto" />
                            </th>
                            {DAYS.map((day, di) => (
                              <th
                                key={day}
                                className="border-b border-gray-800 px-2 py-3 text-xs font-bold text-gray-300 text-center"
                              >
                                {DAY_SHORT[di]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {activePeriods.map((p, pi) => (
                            <tr key={p}>
                              <td className="sticky left-0 z-10 bg-gray-900 border-r border-gray-800 px-2 py-1 text-center">
                                <span className="text-xs font-bold text-gray-500">
                                  P{p}
                                </span>
                              </td>
                              {DAYS.map((_, di) => {
                                const cell = grid[di][pi];
                                const cellKey = `${di}-${pi}`;
                                const isPickerOpen = activeCellPicker === cellKey;
                                const c = cell
                                  ? SUBJECT_COLORS.find(
                                      (sc) => sc.bg === cell.color
                                    ) || SUBJECT_COLORS[0]
                                  : null;

                                // CHANGED: Dropdown positioning logic
                                const isBottomRows = pi >= activePeriods.length - 2;
                                const dropdownPos = isBottomRows ? "bottom-full mb-1" : "top-full mt-1";

                                return (
                                  <td
                                    key={cellKey}
                                    // CHANGED: Added dynamic z-index to bring active cell to front
                                    className={`border border-gray-800/50 p-1 relative ${isPickerOpen ? "z-50" : "z-10"}`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const subj =
                                        draggedSubject ||
                                        e.dataTransfer.getData(
                                          "text/plain"
                                        );
                                      if (subj) {
                                        setGridCell(di, pi, subj);
                                        setDraggedSubject(null);
                                      }
                                    }}
                                  >
                                    {cell ? (
                                      <div
                                        className={`${c?.light || ""} border ${c?.border || ""} rounded-lg px-2 py-2 text-center group relative min-h-[56px] flex flex-col items-center justify-center`}
                                      >
                                        <span
                                          className={`text-xs font-bold ${c?.text || "text-white"} truncate w-full`}
                                        >
                                          {cell.subject}
                                        </span>
                                        {cell.teacherName && (
                                          <span className="text-[10px] text-gray-300 truncate w-full mt-0.5">
                                            {cell.teacherName.split(" ")[0]}
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setGridCell(di, pi, null);
                                          }}
                                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveCellPicker(
                                            isPickerOpen ? null : cellKey
                                          )
                                        }
                                        className="w-full min-h-[56px] rounded-lg border border-dashed border-gray-800 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all flex items-center justify-center"
                                      >
                                        <Plus className="w-3.5 h-3.5 text-gray-700" />
                                      </button>
                                    )}

                                    {isPickerOpen && !cell && (
                                      // CHANGED: Applied dropdownPos class dynamically
                                      <div className={`absolute ${dropdownPos} left-0 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 max-h-48 overflow-y-auto`}>
                                        {subjects.map((subj) => {
                                          const subjColor = SUBJECT_COLORS[subj.colorIndex];
                                          return (
                                            <button
                                              key={subj.name}
                                              type="button"
                                              onClick={() =>
                                                setGridCell(
                                                  di,
                                                  pi,
                                                  subj.name
                                                )
                                              }
                                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-800 flex items-center gap-2 transition-colors"
                                            >
                                              <div
                                                className={`w-2 h-2 rounded-full ${subjColor.bg}`}
                                              />
                                              <span className="text-white font-medium truncate">
                                                {subj.name}
                                              </span>
                                              {subj.teacherName && (
                                                <span className="text-gray-500 truncate ml-auto text-[10px]">
                                                  {subj.teacherName.split(
                                                    " "
                                                  )[0]}
                                                </span>
                                              )}
                                            </button>
                                          );
                                        })}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setActiveCellPicker(null)
                                          }
                                          className="w-full px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-800 border-t border-gray-800 mt-1"
                                        >
                                          Cancel
                                        </button>
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

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      <span>
                        Filled:{" "}
                        <span className="text-white font-bold">
                          {Object.values(gridSubjectCounts).reduce(
                            (a, b) => a + b,
                            0
                          )}
                        </span>
                        /{totalSlots}
                      </span>
                      {subjects.map((subj) => {
                        const placed = gridSubjectCounts[subj.name] || 0;
                        const done = placed >= subj.periodsPerWeek;
                        return (
                          <span
                            key={subj.name}
                            className={
                              done ? "text-green-400" : "text-yellow-400"
                            }
                          >
                            {subj.name}: {placed}/{subj.periodsPerWeek}
                            {done ? " ✓" : ""}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab(2)}
                        className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                      >
                        ← Teachers
                      </button>
                      <button
                        type="button"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                      >
                        {saveMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Timetable
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}