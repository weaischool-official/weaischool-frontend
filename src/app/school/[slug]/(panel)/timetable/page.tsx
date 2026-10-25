Haan bhai, samajh gaya! Ye ek bohot valid use-case hai. Har class ke liye manually wahi same start/end time aur break set karna bohot tedious ho jata hai. 

Maine aapke code mein ye changes kiye hain:
1. **Per-Class Scoping:** Timings aur breaks ab pure school pe globally apply hone ki jagah **Class-level** par save honge. (Kyunki ek class ke sabhi sections ki timing mostly same hoti hai).
2. **Copy/Apply To Feature:** Usi **Timings & Breaks** wale panel mein maine ek **"Copy to other classes"** ka option add kar diya hai. 
3. Aap apne current class ki timings/breaks set karke, baaki jin bhi classes ko select karenge, unme **sirf timings aur breaks (not subjects)** automatically copy ho jayenge!

Neeche poora updated `page.tsx` code diya gaya hai. Pura copy karke replace kar dijiye.

### Updated `page.tsx`

```tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useParams } from "next/navigation";
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
  Settings,
  Copy,
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
  teacher_id?: string | null;
  teacher_name?: string | null;
}

interface PeriodConfig {
  startTime: string;
  endTime: string;
  isBreak: boolean;
  label: string;
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

// Darker premium colors for subject chips
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
  { bg: "bg-emerald-600", text: "text-white", light: "bg-emerald-900/60", border: "emerald-500" },
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
  for (const key of ["items", "staff", "users", "results", "data", "entries", "slots", "timetable"]) {
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
  const params = useParams();
  const slug = (params?.slug as string) || "school";
  const BASE_STORAGE_KEY = `timetable_periods_${slug}`;

  // ── Core State ──
  const [activeTab, setActiveTab] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");

  // ── Dynamic Grid & Periods Configuration ──
  const [numPeriods, setNumPeriods] = useState(8);
  const activePeriods = useMemo(() => Array.from({ length: numPeriods }, (_, i) => i + 1), [numPeriods]);
  const totalSlots = DAYS.length * numPeriods;

  const [showPeriodConfig, setShowPeriodConfig] = useState(false);
  const [periodConfigs, setPeriodConfigs] = useState<Record<number, PeriodConfig>>({});
  
  // States for Copying Timings to other Classes
  const [isCopyingTimings, setIsCopyingTimings] = useState(false);
  const [targetClasses, setTargetClasses] = useState<string[]>([]);

  // ── Tab 1: Subjects ──
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [newSubjName, setNewSubjName] = useState("");
  const [newSubjPeriods, setNewSubjPeriods] = useState(6);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Tab 3: Grid ──
  const [grid, setGrid] = useState<(GridCell | null)[][]>(emptyGrid(8));
  const [activeCellPicker, setActiveCellPicker] = useState<string | null>(null);
  const [draggedSubject, setDraggedSubject] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════
  // DATA FETCHING 
  // ═══════════════════════════════════════════════════════

  // Load period configs dynamically based on selected class
  useEffect(() => {
    if (!selectedClassId) {
      setPeriodConfigs({});
      return;
    }
    const saved = localStorage.getItem(`${BASE_STORAGE_KEY}_${selectedClassId}`);
    if (saved) {
      try {
        setPeriodConfigs(JSON.parse(saved));
      } catch (e) {
        setPeriodConfigs({});
      }
    } else {
      setPeriodConfigs({}); // default empty if nothing saved for this class
    }
  }, [selectedClassId, BASE_STORAGE_KEY]);

  const updatePeriodConfig = (p: number, field: keyof PeriodConfig, val: any) => {
    setPeriodConfigs(prev => {
      const next = { ...prev, [p]: { ...(prev[p] || {}), [field]: val } };
      if (selectedClassId) {
        localStorage.setItem(`${BASE_STORAGE_KEY}_${selectedClassId}`, JSON.stringify(next));
      }
      return next;
    });

    // If marked as break, clear any dropped subjects in that row automatically
    if (field === "isBreak" && val === true) {
      setGrid(prev => {
        const next = prev.map(r => [...r]);
        for (let d = 0; d < DAYS.length; d++) {
          next[d][p - 1] = null;
        }
        return next;
      });
    }
  };

  const handleCopyTimings = () => {
    if (targetClasses.length === 0) {
      toast.error("Please select at least one class to copy to.");
      return;
    }
    
    targetClasses.forEach(clsId => {
      localStorage.setItem(`${BASE_STORAGE_KEY}_${clsId}`, JSON.stringify(periodConfigs));
    });
    
    toast.success(`Timings and breaks successfully copied to ${targetClasses.length} class(es)!`);
    setIsCopyingTimings(false);
    setTargetClasses([]);
  };

  // 1. Academic Years
  const { data: yearsData } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearApi.list().then((r) => r.data),
  });
  const academicYears = asItems<AcademicYear>(yearsData);
  const currentYear = academicYears.find((y) => y.is_current || y.is_active) || academicYears[0];

  // 2. Classes
  const { data: classesData, isLoading: classesLoading, refetch: refetchClasses } = useQuery({
    queryKey: ["classes", currentYear?.id],
    queryFn: () => classApi.list(currentYear?.id).then((r) => r.data),
    enabled: !!currentYear?.id,
  });
  const classes = useMemo(() => {
    const c = asItems<ClassItem>(classesData);
    return [...c].sort((a, b) => (a.numeric_level ?? a.class_level ?? 0) - (b.numeric_level ?? b.class_level ?? 0));
  }, [classesData]);

  // 3. Sections
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
  const allStaff = useMemo(() => extractArray(staffRaw) as StaffMember[], [staffRaw]);

  // 5. Existing Timetable
  const { data: timetableRaw, isLoading: timetableLoading, isFetching: timetableFetching } = useQuery({
    queryKey: ["timetable", selectedClassId, selectedSectionId],
    queryFn: async () => {
      try {
        const res = await api.get("/timetable/grid", {
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

  // Force clear local state whenever Class OR Section dropdown changes
  useEffect(() => {
    setGrid(emptyGrid(8));
    setNumPeriods(8);
    setSubjects([]); 
    setActiveCellPicker(null);
  }, [selectedClassId, selectedSectionId]);

  useEffect(() => {
    setSelectedSectionId("");
  }, [selectedClassId]); 

  // ── Populate grid + subjects from existing timetable ──
  useEffect(() => {
    if (!timetableRaw) return;
    const entries = extractArray(timetableRaw) as unknown as TimetableEntry[];
    
    if (entries.length === 0) {
      setGrid(emptyGrid(8));
      setNumPeriods(8);
      setSubjects([]); 
      return;
    }

    let maxP = 8;
    for (const entry of entries) {
      if (entry.period_number > maxP) maxP = entry.period_number;
    }

    setNumPeriods(maxP);
    const newGrid = emptyGrid(maxP);
    const subjectMap = new Map<string, SubjectConfig>();
    let colorIdx = 0;

    for (const entry of entries) {
      let day = 0;
      if (typeof entry.day_of_week === "string") {
        const dayStr = (entry.day_of_week as string).toUpperCase();
        day = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].indexOf(dayStr);
        if (day === -1) day = 0;
      } else {
        day = entry.day_of_week;
      }

      const period = entry.period_number - 1;
      if (day >= 0 && day < DAYS.length && period >= 0 && period < maxP) {
        const subjName = entry.subject_name || "";
        const tId = entry.teacher_id || "";
        const tName = entry.teacher_name || "";
        
        let finalColorBg = "";
        let finalColorIndex = 0;
        
        if (subjectMap.has(subjName)) {
          const existing = subjectMap.get(subjName)!;
          finalColorBg = existing.color;
          finalColorIndex = existing.colorIndex;
        } else {
          finalColorIndex = colorIdx % SUBJECT_COLORS.length;
          finalColorBg = SUBJECT_COLORS[finalColorIndex].bg;
          subjectMap.set(subjName, {
            name: subjName,
            periodsPerWeek: 0,
            color: finalColorBg,
            colorIndex: finalColorIndex,
            teacherId: tId,
            teacherName: tName,
          });
          colorIdx++;
        }

        newGrid[day][period] = {
          subject: subjName,
          teacherId: tId,
          teacherName: tName,
          color: finalColorBg,
        };

        subjectMap.get(subjName)!.periodsPerWeek++;
      }
    }

    setGrid(newGrid);
    setSubjects(Array.from(subjectMap.values()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timetableRaw]);


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
              teacher_id: cell.teacherId || null, 
              teacher_name: cell.teacherName || null,
            });
          }
        }
      }

      const payload = {
        academic_year_id: currentYear?.id, 
        class_id: selectedClassId,
        section_id: selectedSectionId,
        entries,
        slots: entries.map(e => ({
          day_of_week: DAYS[e.day_of_week].toUpperCase(),
          period_number: e.period_number,
          subject_name: e.subject_name,
          staff_id: e.teacher_id,
          teacher_name: e.teacher_name
        }))
      };

      try {
        const res = await api.post("/timetable/save", payload);
        return res.data;
      } catch (err: any) {
        if (err?.response?.status === 405) {
          const res = await api.put("/timetable/save", payload);
          return res.data;
        }
        throw err;
      }
    },
    onSuccess: () => {
      toast.success("Timetable saved successfully!");
      queryClient.invalidateQueries({
        queryKey: ["timetable", selectedClassId, selectedSectionId],
      });
    },
    onError: (err: any) => {
      let errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.response?.data?.detail;
      if (typeof errMsg === 'object') {
        if (Array.isArray(errMsg)) {
           errMsg = errMsg.map((e: any) => e.msg || JSON.stringify(e)).join(", ");
        } else {
           errMsg = JSON.stringify(errMsg);
        }
      }
      if (errMsg) toast.error(`Save Failed: ${errMsg}`);
      else toast.error("Could not save to server. Please check your data.");
    },
  });

  // ═══════════════════════════════════════════════════════
  // CLEAR GRID FUNCTION
  // ═══════════════════════════════════════════════════════
  const handleClearGrid = useCallback(() => {
    if (window.confirm("Are you sure you want to clear the grid? (Breaks and Timings will stay)")) {
      setGrid(emptyGrid(numPeriods));
      setActiveCellPicker(null);
      toast.success("Grid cleared successfully!");
    }
  }, [numPeriods]);

  // ═══════════════════════════════════════════════════════
  // SUBJECT HELPERS
  // ═══════════════════════════════════════════════════════

  const totalPeriodsUsed = useMemo(() => subjects.reduce((sum, s) => sum + s.periodsPerWeek, 0), [subjects]);

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
          while (next[d].length < newNum) next[d].push(null);
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

  const setGridCell = useCallback(
    (day: number, period: number, subjectName: string | null) => {
      // Prevent dropping if this row is marked as a break
      if (periodConfigs[period + 1]?.isBreak) {
        toast.error("Cannot assign subject to a Break period!");
        return;
      }

      if (subjectName) {
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
    [grid, subjects, periodConfigs]
  );

  // ═══════════════════════════════════════════════════════
  // DERIVED DATA
  // ═══════════════════════════════════════════════════════

  const selectedClassName = classes.find((c) => c.id === selectedClassId)?.name || "";
  const selectedSectionName = sections.find((s) => s.id === selectedSectionId)?.name || "";
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
                          <div className={`w-3 h-8 rounded-full ${c.bg}`} />
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
                            <div className={`w-3 h-8 rounded-full ${c.bg}`} />
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
                                  String((s.extras as Record<string, unknown>)?.designation || "Teacher");
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
                  {/* TIMINGS CONFIGURATION PANEL */}
                  {showPeriodConfig && (
                    <div className="bg-gray-900/90 border border-blue-500/30 rounded-xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-4 mb-6">
                      <div className="flex justify-between items-center mb-5 border-b border-gray-800 pb-3">
                        <h3 className="text-white font-bold flex items-center gap-2">
                          <Settings className="w-5 h-5 text-blue-400" />
                          Configure Period Timings & Breaks
                        </h3>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setIsCopyingTimings(!isCopyingTimings)} 
                            className={`text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 border ${isCopyingTimings ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'}`}
                          >
                            <Copy className="w-4 h-4" />
                            Copy to other classes
                          </button>
                          <button onClick={() => setShowPeriodConfig(false)} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Copy Timings Options */}
                      {isCopyingTimings && (
                        <div className="mb-6 p-4 bg-gray-950 border border-blue-500/30 rounded-xl animate-in fade-in zoom-in-95">
                          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            Select classes to copy these timings & breaks to:
                            <span className="text-xs text-gray-500 font-normal">(Subjects will NOT be copied)</span>
                          </h4>
                          <div className="flex flex-wrap gap-3 mb-4">
                            {classes.filter(c => c.id !== selectedClassId).map(c => (
                              <label key={c.id} className={`flex items-center gap-2 text-sm cursor-pointer px-3 py-2 rounded-lg border transition-colors ${targetClasses.includes(c.id) ? 'bg-blue-600/10 border-blue-500 text-blue-300' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'}`}>
                                <input 
                                  type="checkbox" 
                                  checked={targetClasses.includes(c.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setTargetClasses(prev => [...prev, c.id]);
                                    else setTargetClasses(prev => prev.filter(id => id !== c.id));
                                  }}
                                  className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-950"
                                />
                                {c.name}
                              </label>
                            ))}
                            {classes.filter(c => c.id !== selectedClassId).length === 0 && (
                              <span className="text-sm text-gray-500 italic">No other classes available to copy to.</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleCopyTimings} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors">
                              Confirm & Copy
                            </button>
                            <button onClick={() => setIsCopyingTimings(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {activePeriods.map(p => (
                          <div key={p} className={`bg-gray-950 border rounded-xl p-4 space-y-3 transition-colors ${periodConfigs[p]?.isBreak ? 'border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'border-gray-800'}`}>
                            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                              <span className={`text-sm font-bold ${periodConfigs[p]?.isBreak ? 'text-amber-400' : 'text-gray-300'}`}>Period {p}</span>
                              <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 cursor-pointer hover:text-white transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={periodConfigs[p]?.isBreak || false} 
                                  onChange={e => updatePeriodConfig(p, 'isBreak', e.target.checked)} 
                                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-950 cursor-pointer" 
                                />
                                Is Break?
                              </label>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">Start Time</label>
                                <input 
                                  type="time" 
                                  value={periodConfigs[p]?.startTime || ""} 
                                  onChange={e => updatePeriodConfig(p, 'startTime', e.target.value)} 
                                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">End Time</label>
                                <input 
                                  type="time" 
                                  value={periodConfigs[p]?.endTime || ""} 
                                  onChange={e => updatePeriodConfig(p, 'endTime', e.target.value)} 
                                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                                />
                              </div>
                            </div>
                            {periodConfigs[p]?.isBreak && (
                              <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                                <label className="block text-[10px] uppercase tracking-wider font-semibold text-amber-500/70 mb-1">Break Label</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. LUNCH BREAK" 
                                  value={periodConfigs[p]?.label || ""} 
                                  onChange={e => updatePeriodConfig(p, 'label', e.target.value)} 
                                  className="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-xs text-amber-100 placeholder-amber-700/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" 
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                            <div className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                            <span className="text-xs font-semibold text-white">
                              {subj.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({placed}/{subj.periodsPerWeek})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {timetableFetching ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="ml-3 text-gray-400">
                        Loading timetable for this section...
                      </span>
                    </div>
                  ) : (
                    <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-x-auto pb-32">
                      <table className="w-full min-w-[700px] border-collapse">
                        <thead>
                          <tr>
                            <th className="sticky left-0 z-20 bg-gray-900 border-b border-r border-gray-800 px-3 py-3 text-xs text-gray-500 font-semibold w-24">
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
                          {activePeriods.map((p, pi) => {
                            const pConfig = periodConfigs[p] || { startTime: "", endTime: "", isBreak: false, label: "" };
                            
                            return (
                              <tr key={p}>
                                {/* Row Header with Timings */}
                                <td className="sticky left-0 z-20 bg-gray-900 border-r border-b border-gray-800 px-2 py-2 text-center h-[72px]">
                                  <div className="flex flex-col items-center justify-center h-full space-y-1">
                                    <span className={`text-xs font-bold ${pConfig.isBreak ? 'text-amber-500' : 'text-gray-400'}`}>P{p}</span>
                                    {pConfig.startTime && pConfig.endTime && (
                                      <span className="text-[9px] font-mono text-gray-500 whitespace-nowrap bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800">
                                        {pConfig.startTime}-{pConfig.endTime}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                
                                {/* Cells */}
                                {pConfig.isBreak ? (
                                  <td colSpan={DAYS.length} className="bg-gray-900/40 border-b border-gray-800/50 p-2 relative overflow-hidden h-[72px]">
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-500 to-transparent"></div>
                                    </div>
                                    <div className="text-center w-full flex items-center justify-center relative z-10">
                                      <span className="text-sm font-black text-gray-500 uppercase tracking-[0.4em] bg-[#0b0f19] px-6 py-1.5 rounded-full border border-gray-800 shadow-inner">
                                        {pConfig.label || "BREAK"}
                                      </span>
                                    </div>
                                  </td>
                                ) : (
                                  DAYS.map((_, di) => {
                                    const cell = grid[di][pi];
                                    const cellKey = `${di}-${pi}`;
                                    const isPickerOpen = activeCellPicker === cellKey;
                                    const c = cell
                                      ? SUBJECT_COLORS.find((sc) => sc.bg === cell.color) || SUBJECT_COLORS[0]
                                      : null;

                                    const isBottomRows = pi >= activePeriods.length - 2;
                                    const dropdownPos = isBottomRows ? "bottom-full mb-1" : "top-full mt-1";

                                    return (
                                      <td
                                        key={cellKey}
                                        className={`border-b border-r border-gray-800/50 p-1.5 relative h-[72px] ${isPickerOpen ? "z-50" : "z-10"}`}
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          e.dataTransfer.dropEffect = "move";
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          const subj = draggedSubject || e.dataTransfer.getData("text/plain");
                                          if (subj) {
                                            setGridCell(di, pi, subj);
                                            setDraggedSubject(null);
                                          }
                                        }}
                                      >
                                        {cell ? (
                                          <div className={`${c?.light || ""} border ${c?.border || ""} rounded-lg px-2 py-2 text-center group relative h-full flex flex-col items-center justify-center shadow-sm`}>
                                            <span className={`text-xs font-bold ${c?.text || "text-white"} truncate w-full`}>
                                              {cell.subject}
                                            </span>
                                            {cell.teacherName && (
                                              <span className="text-[10px] text-gray-300 truncate w-full mt-0.5 font-medium">
                                                {cell.teacherName.split(" ")[0]}
                                              </span>
                                            )}
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setGridCell(di, pi, null);
                                              }}
                                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setActiveCellPicker(isPickerOpen ? null : cellKey)}
                                            className="w-full h-full rounded-lg border border-dashed border-gray-800 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all flex items-center justify-center group"
                                          >
                                            <Plus className="w-4 h-4 text-gray-700 group-hover:text-blue-400 group-hover:scale-110 transition-all" />
                                          </button>
                                        )}

                                        {isPickerOpen && !cell && (
                                          <div className={`absolute ${dropdownPos} left-0 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 max-h-56 overflow-y-auto`}>
                                            {subjects.map((subj) => {
                                              const subjColor = SUBJECT_COLORS[subj.colorIndex];
                                              return (
                                                <button
                                                  key={subj.name}
                                                  type="button"
                                                  onClick={() => setGridCell(di, pi, subj.name)}
                                                  className="w-full px-3 py-2.5 text-left text-xs hover:bg-gray-800 flex items-center gap-2 transition-colors border-b border-gray-800/50 last:border-0"
                                                >
                                                  <div className={`w-2 h-2 rounded-full shrink-0 ${subjColor.bg}`} />
                                                  <span className="text-white font-medium truncate flex-1">
                                                    {subj.name}
                                                  </span>
                                                  {subj.teacherName && (
                                                    <span className="text-gray-500 truncate text-[10px] shrink-0">
                                                      {subj.teacherName.split(" ")[0]}
                                                    </span>
                                                  )}
                                                </button>
                                              );
                                            })}
                                            <button
                                              type="button"
                                              onClick={() => setActiveCellPicker(null)}
                                              className="w-full px-3 py-2.5 text-center text-xs text-gray-400 hover:bg-gray-800 hover:text-white mt-1 border-t border-gray-700 font-semibold"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-6">
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      <span>
                        Filled:{" "}
                        <span className="text-white font-bold">
                          {Object.values(gridSubjectCounts).reduce((a, b) => a + b, 0)}
                        </span>
                        /{totalSlots}
                      </span>
                      {subjects.map((subj) => {
                        const placed = gridSubjectCounts[subj.name] || 0;
                        const done = placed >= subj.periodsPerWeek;
                        return (
                          <span key={subj.name} className={done ? "text-green-400 font-medium" : "text-yellow-400"}>
                            {subj.name}: {placed}/{subj.periodsPerWeek} {done ? "✓" : ""}
                          </span>
                        );
                      })}
                    </div>
                    
                    {/* BUTTONS AREA (Timings, Clear, Save) */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPeriodConfig(!showPeriodConfig)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${showPeriodConfig ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'}`}
                      >
                        <Settings className="w-4 h-4" />
                        Timings & Breaks
                      </button>

                      <button
                        type="button"
                        onClick={handleClearGrid}
                        className="px-5 py-2.5 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear Grid
                      </button>

                      <button
                        type="button"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
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
```