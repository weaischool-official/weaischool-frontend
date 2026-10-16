"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
  BookOpen, Users, CalendarDays, Search, Plus, Minus,
  Trash2, Loader2, CheckCircle2, AlertCircle, UserCheck, AlertTriangle
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
  { name: "Information Technology", color: "#06B6D4" },
];

const MAX_PERIODS = 30;

// 1. Canonical Core Subject Mapping Engine (Fixes PGT/TGT prefixes & prevents Science vs Social Science overlap)
const getCoreSubject = (rawName: string): string => {
  const n = " " + String(rawName).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ') + " ";
  const noSpace = String(rawName).toLowerCase().replace(/[^a-z0-9]/g, '');

  const isSST = n.includes(' social science ') || n.includes(' social studies ') || n.includes(' history ') || n.includes(' geography ') || n.includes(' civics ') || noSpace.includes('sst');
  if (isSST) return 'sst';

  const isComputer = n.includes(' computer ') || n.includes(' information technology ') || noSpace.includes('it') || noSpace.includes('cs') || noSpace.includes('ip');
  if (isComputer) return 'computer';

  const isScience = n.includes(' science ') || n.includes(' physics ') || n.includes(' chemistry ') || n.includes(' biology ');
  if (isScience) return 'science'; // Since Social/Computer Science checked first, this is purely Science!

  const isMath = n.includes(' math ') || n.includes(' mathematics ') || n.includes(' maths ') || n.includes(' quantitative ');
  if (isMath) return 'math';

  const isPE = n.includes(' physical education ') || noSpace.includes('pe') || n.includes(' sports ') || noSpace.includes('pt');
  if (isPE) return 'pe';

  const isGK = n.includes(' general knowledge ') || noSpace.includes('gk');
  if (isGK) return 'gk';

  const isEVS = n.includes(' evs ') || n.includes(' environmental ');
  if (isEVS) return 'evs';

  const isArt = n.includes(' art ') || n.includes(' arts ') || n.includes(' drawing ') || n.includes(' craft ');
  if (isArt) return 'art';

  if (n.includes(' english ') || n.includes(' eng ')) return 'english';
  if (n.includes(' hindi ')) return 'hindi';
  if (n.includes(' marathi ')) return 'marathi';
  if (n.includes(' sanskrit ')) return 'sanskrit';

  return noSpace; // Absolute Fallback
};

const matchSubjects = (classSubject: string, teacherSubject: string): boolean => {
  if (!classSubject || !teacherSubject) return false;
  const coreClass = getCoreSubject(classSubject);
  const coreTeacher = getCoreSubject(teacherSubject);
  return coreClass === coreTeacher;
};

// 2. Safe Subject Extraction from Staff Profiles (Added broad extractors for designation/department)
const getTeacherSubjects = (t: any): string[] => {
  if (!t) return [];
  const found: string[] = [];

  const extract = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(item => extract(item));
      return;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach(p => extract(p));
            return;
          }
        } catch (e) {}
      }
      trimmed.split(',').forEach(s => {
        const clean = s.trim();
        if (clean) found.push(clean);
      });
      return;
    }
    if (typeof val === 'object') {
      const name = val.name || val.subject_name || val.subject || '';
      if (typeof name === 'string' && name.trim()) {
        found.push(name.trim());
      }
    }
  };

  extract(t.subjects);
  extract(t.subjects_taught);
  extract(t.subject);
  extract(t.department);
  extract(t.designation);

  let extras = t.extras;
  if (typeof extras === 'string') {
    try { extras = JSON.parse(extras); } catch (e) { extras = null; }
  }
  if (extras && typeof extras === 'object') {
    extract(extras.subjects);
    extract(extras.subject);
    extract(extras.subjects_taught);
    extract(extras.department);
    extract(extras.designation);
  }

  let extrasData = t.extras_data;
  if (typeof extrasData === 'string') {
    try { extrasData = JSON.parse(extrasData); } catch (e) { extrasData = null; }
  }
  if (extrasData && typeof extrasData === 'object') {
    extract(extrasData.subjects);
    extract(extrasData.subject);
  }

  if (t.user) {
    extract(t.user.subjects);
    let uExtras = t.user.extras;
    if (typeof uExtras === 'string') {
      try { uExtras = JSON.parse(uExtras); } catch (e) { uExtras = null; }
    }
    if (uExtras && typeof uExtras === 'object') {
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

  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const getSelectedContextName = () => {
    const clsName = classes.find(c => c.id === selectedClassId)?.name || "";
    const secName = sections.find(s => s.id === selectedSectionId)?.name || "";
    if (clsName && secName) return "Class " + clsName + " (Section " + secName + ")";
    if (clsName) return "Class " + clsName;
    return "...";
  };

  const teacherName = (t: any) => {
    if (!t) return "Unknown";
    if (t.full_name) return t.full_name;
    if (t.name) return t.name;
    const first = t.first_name || t.firstName || "";
    const last = t.last_name || t.lastName || "";
    const n = (first + " " + last).trim();
    return n || t.email || "Teacher";
  };

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

  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId("");
      return;
    }

    const currentClass = classes.find(c => c.id === selectedClassId);
    if (currentClass?.sections && Array.isArray(currentClass.sections) && currentClass.sections.length > 0) {
      setSections(currentClass.sections);
      setSelectedSectionId(currentClass.sections[0].id);
      return;
    }

    const fetchSections = async () => {
      setIsLoadingSections(true);
      try {
        const res = await api.get(/classes/ + selectedClassId + /sections);
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

  useEffect(() => {
    if (!selectedClassId) return;

    const fetchSubjects = async () => {
      setIsLoading(true);
      try {
        let url = /class-subjects?class_id= + selectedClassId;
        if (selectedSectionId) {
          url += &section_id= + selectedSectionId;
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

  useEffect(() => {
    if (subjectQuery.trim() === "") {
      setApiSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const res = await api.get(/class-subjects/suggestions?query= + subjectQuery);
        setApiSuggestions(res.data.suggestions || []);
      } catch (error) {
        setApiSuggestions([]); 
      }
    };
    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [subjectQuery]);

  useEffect(() => {
    if (activeTab !== "teachers" || !selectedClassId) return;

    const loadTab2 = async () => {
      setIsLoadingTeachers(true);
      try {
        let teacherList: any[] = [];
        try {
          const r = await api.get("/staff?role=teacher");
          teacherList = Array.isArray(r.data) ? r.data : (r.data?.items || r.data?.data || []);
        } catch {
          try {
            const r2 = await api.get("/staff");
            const all = Array.isArray(r2.data) ? r2.data : (r2.data?.items || []);
            teacherList = all;
          } catch {
            teacherList = [];
          }
        }
        setTeachers(teacherList);

        try {
          let aUrl = /teacher-assignments?class_id= + selectedClassId;
          if (selectedSectionId) aUrl += &section_id= + selectedSectionId;
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

    loadTab2();
  }, [activeTab, selectedClassId, selectedSectionId]);

  const getDisplayedChips = () => {
    let chips: any[] = [];
    if (subjectQuery.trim().length > 0) {
      if (apiSuggestions.length > 0) {
        chips = apiSuggestions.map(s => ({
          name: s.name, color: s.suggested_color || "#3B82F6"
        }));
      } else {
        chips = QUICK_SUBJECTS.filter(s => s.name.toLowerCase().includes(subjectQuery.toLowerCase()));
      }
    } else {
      chips = QUICK_SUBJECTS;
    }
    const addedNames = classSubjects.map(cs => cs.subject_name.toLowerCase());
    return chips.filter(chip => !addedNames.includes(chip.name.toLowerCase())).slice(0, 12);
  };

  const displayedChips = getDisplayedChips();
  const exactMatchExists = displayedChips.some(c => c.name.toLowerCase() === subjectQuery.toLowerCase().trim()) || 
                           classSubjects.some(cs => cs.subject_name.toLowerCase() === subjectQuery.toLowerCase().trim());

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
        is_custom: isCustom
      });
      setClassSubjects(prev => [...prev, res.data]);
      setSubjectQuery(""); 
      toast.success(name + " added!");
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
      await api.patch(/class-subjects/ + subjectId, { periods_per_week: newPeriods });
      setClassSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, periods_per_week: newPeriods } : s));
      toast.success("Updated to " + newPeriods + " periods/week");
    } catch (error: any) {
      toast.error("Failed to update periods");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteSubject = async (subjectId: string, name: string) => {
    if (!confirm("Remove " + name + "?")) return;
    try {
      await api.delete(/class-subjects/ + subjectId);
      setClassSubjects(prev => prev.filter(s => s.id !== subjectId));
      toast.success("Subject removed");
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : "Failed to remove");
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

      setAssignments(prev => ({
        ...prev,
        [classSubjectId]: res.data,
      }));

      try {
        const wRes = await api.get("/teacher-assignments/workload/all");
        setWorkloads(wRes.data || []);
      } catch {}

      if (res.data?.is_overloaded) {
        toast.warning(res.data.teacher_name + " is now at " + res.data.current_workload + "/30 periods — overloaded, but saved.");
      } else {
        toast.success("Assigned to " + res.data.teacher_name);
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

    const match = teachers.find(t => 
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
    return classSubjects.filter(s => assignments[s.id]?.teacher_id).length;
  }, [classSubjects, assignments]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Smart Timetable Builder</h1>
          <p className="text-slate-400 text-sm mt-1">Setup section-wise subjects, assign teachers, and build schedules.</p>
        </div>
      </div>

      <div className="flex bg-[#111827] border border-slate-800 p-1.5 rounded-xl w-fit shadow-sm overflow-x-auto">
        <button onClick={() => setActiveTab("subjects")} className={"flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap " + (activeTab === "subjects" ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" : "text-slate-400 hover:text-white")}>
          <BookOpen className="w-4 h-4" /> 1. Subjects Setup
        </button>
        <button onClick={() => setActiveTab("teachers")} className={"flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap " + (activeTab === "teachers" ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" : "text-slate-400 hover:text-white")}>
          <Users className="w-4 h-4" /> 2. Assign Teachers
        </button>
        <button onClick={() => setActiveTab("timetable")} className={"flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap " + (activeTab === "timetable" ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" : "text-slate-400 hover:text-white")}>
          <CalendarDays className="w-4 h-4" /> 3. Build Grid
        </button>
      </div>

      <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-6 shadow-sm">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Select Class</label>
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500">
            <option value="" disabled className="text-slate-500">-- Choose Class --</option>
            {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px] max-w-xs relative">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            Select Section
            {isLoadingSections && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
          </label>
          <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} disabled={sections.length === 0} className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {sections.length === 0 ? (<option value="">No sections found</option>) : (sections.map((sec) => (<option key={sec.id} value={sec.id}>{sec.name}</option>)))}
          </select>
        </div>

        {selectedClassId && (
          <div className="flex items-center gap-2 text-sm text-slate-300 mt-6 bg-[#0f172a] px-4 py-2 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Working on: <strong className="text-white">{getSelectedContextName()}</strong></span>
          </div>
        )}
      </div>

      {activeTab === "subjects" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 shadow-sm">
              <h3 className="font-bold text-white mb-4">Quick Add Subjects</h3>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Type to search or add custom..." value={subjectQuery} onChange={(e) => setSubjectQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder:text-slate-500 rounded-xl outline-none focus:border-blue-500" />
              </div>

              <div className="flex flex-wrap gap-2">
                {displayedChips.map((chip, idx) => (
                  <button key={idx} disabled={isAddingId === chip.name} onClick={() => handleAddSubject(chip.name, chip.color)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50">
                    {isAddingId === chip.name ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Plus className="w-3.5 h-3.5 text-slate-400" style={{ color: chip.color }} />}
                    {chip.name}
                  </button>
                ))}
                {subjectQuery.trim() !== "" && !exactMatchExists && (
                  <button disabled={isAddingId === subjectQuery.trim()} onClick={() => handleAddSubject(subjectQuery.trim(), "#6B7280", true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 rounded-lg text-sm text-blue-300 transition-colors">
                    {isAddingId === subjectQuery.trim() ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Add "{subjectQuery.trim()}"
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 shadow-sm min-h-[400px]">
              <h3 className="font-bold text-white flex items-center justify-between mb-5">
                <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-400" /> Configured Subjects</span>
                <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">Total: {classSubjects.length}</span>
              </h3>
              {isLoading ? (
                <div className="flex justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : classSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  <p className="text-sm font-medium text-slate-300">No subjects configured</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classSubjects.map((sub) => (
                    <div key={sub.id} className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-inner" style={{ backgroundColor: sub.color_code + "20", border: "1px solid " + sub.color_code + "40" }}><BookOpen className="w-4 h-4" style={{ color: sub.color_code }} /></div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{sub.subject_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1.5 bg-[#0f172a] border border-slate-700 rounded-lg px-2 py-0.5">
                              <button onClick={() => handleUpdatePeriods(sub.id, sub.periods_per_week, -1)} disabled={updatingId === sub.id || sub.periods_per_week <= 1} className="text-slate-400 hover:text-white disabled:opacity-30 p-0.5"><Minus className="w-3 h-3" /></button>
                              <span className="text-xs font-bold text-blue-400 min-w-[50px] text-center">{updatingId === sub.id ? "..." : sub.periods_per_week + " / wk"}</span>
                              <button onClick={() => handleUpdatePeriods(sub.id, sub.periods_per_week, 1)} disabled={updatingId === sub.id || sub.periods_per_week >= 20} className="text-slate-400 hover:text-white disabled:opacity-30 p-0.5"><Plus className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteSubject(sub.id, sub.subject_name)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "teachers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 min-h-[420px]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" /> Assign Teachers
                </h3>
                <span className={"text-xs font-semibold px-3 py-1 rounded-full border " + (classSubjects.length > 0 && assignedCount === classSubjects.length ? "bg-emerald-900/30 text-emerald-300 border-emerald-800" : "bg-slate-800 text-slate-300 border-slate-700")}>
                  {assignedCount} / {classSubjects.length} assigned
                </span>
              </div>

              {isLoading || isLoadingTeachers ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : classSubjects.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  <p className="text-sm text-slate-300 font-medium">No subjects in this section</p>
                </div>
              ) : teachers.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  <p className="text-sm text-slate-300 font-medium">No teachers found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classSubjects.map((sub) => {
                    const assigned = assignments[sub.id];
                    const isAssigning = assigningId === sub.id;
                    const selectedVal = getAssignedTeacherValue(assigned);

                    const eligibleTeachers = teachers.filter(t => {
                      const tSubjs = getTeacherSubjects(t);
                      return tSubjs.some(ts => matchSubjects(sub.subject_name, ts));
                    });

                    const isAssignedEligible = eligibleTeachers.some(t => {
                      const realId = t.id || t.user_id || t.user?.id;
                      return realId === selectedVal;
                    });

                    const assignedTeacherObj = !isAssignedEligible && selectedVal ? teachers.find(t => (t.id || t.user_id || t.user?.id) === selectedVal) : null;

                    return (
                      <div key={sub.id} className={"flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all " + (assigned && isAssignedEligible ? "border-emerald-800/50 bg-emerald-950/20" : "border-amber-800/40 bg-amber-950/10")}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: sub.color_code + "25", border: "1px solid " + sub.color_code + "50" }}><BookOpen className="w-4 h-4" style={{ color: sub.color_code }} /></div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{sub.subject_name}</p>
                            <p className="text-xs text-slate-400">{sub.periods_per_week} periods/week</p>
                          </div>
                          {(!assigned || !isAssignedEligible) && (<span className="text-[10px] uppercase tracking-wide font-semibold text-amber-400 bg-amber-900/30 border border-amber-800/50 px-2 py-0.5 rounded">Needed</span>)}
                        </div>

                        <div className="flex items-center gap-2 sm:w-[240px]">
                          {isAssigning ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm w-full justify-center py-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</div>
                          ) : (
                            <select value={isAssignedEligible ? selectedVal : (assignedTeacherObj ? selectedVal : "")} onChange={(e) => handleAssignTeacher(sub.id, e.target.value)} className={"w-full bg-[#0f172a] border text-sm rounded-lg px-3 py-2.5 outline-none transition-colors " + (eligibleTeachers.length === 0 && !assignedTeacherObj ? "border-amber-800/50 text-amber-400" : "border-slate-600 text-white focus:border-blue-500")}>
                              <option value="">-- Select Teacher --</option>
                              {assignedTeacherObj && (<option value={selectedVal}>{teacherName(assignedTeacherObj)} (Profile Update Needed)</option>)}
                              {eligibleTeachers.map((t) => {
                                const realTeacherId = t.id || t.user_id || t.user?.id;
                                return (<option key={t.id} value={realTeacherId}>{teacherName(t)}</option>);
                              })}
                              {eligibleTeachers.length === 0 && !assignedTeacherObj && (<option disabled value="none">No teachers profile matching "{sub.subject_name}"</option>)}
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
              <h3 className="font-bold text-white flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-400" /> Teacher Workload</h3>
              <p className="text-xs text-slate-500 mb-4">Max {MAX_PERIODS} periods/week</p>

              {isLoadingTeachers ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : workloads.length === 0 && teachers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No teacher data</p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {teachers.map((t) => {
                    const tid = t.user_id || t.user?.id || t.id;
                    const sid = t.id;
                    const w = workloads.find((item: any) => item.teacher_id === tid || item.staff_id === sid || item.teacher_id === sid) || { total_periods: 0, max_periods: MAX_PERIODS };
                    const periods = w.total_periods || 0;
                    const maxP = w.max_periods || MAX_PERIODS;
                    const pct = Math.min(100, Math.round((periods / maxP) * 100));
                    const isOver = periods > maxP;
                    
                    // DEBUG HELPER UI FOR YOU TO CHECK WHAT SYSTEM SEES!
                    const extSubj = getTeacherSubjects(t);
                    const debugText = extSubj.length > 0 ? extSubj.join(', ') : "?? No subjects in profile";

                    return (
                      <div key={t.id} className={"p-3 rounded-xl border " + (isOver ? "border-red-800/50 bg-red-950/20" : "border-slate-700/50 bg-slate-800/30")}>
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-medium text-slate-200 truncate pr-2">{teacherName(t)}</p>
                          <span className={"text-xs font-bold shrink-0 " + (isOver ? "text-red-400" : "text-slate-400")}>{periods}/{maxP}</span>
                        </div>
                        
                        {/* VISUAL INDICATOR OF EXTRACTED SUBJECTS */}
                        <p className={"text-[10px] mb-1.5 line-clamp-1 " + (extSubj.length === 0 ? "text-amber-500" : "text-blue-400/80")} title={debugText}>
                          {debugText}
                        </p>

                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className={"h-full rounded-full transition-all " + (isOver ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: Math.min(pct, 100) + "%" }} />
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

      {activeTab === "timetable" && (
        <div className="bg-[#111827] p-12 rounded-2xl border border-slate-800 text-center">
          <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Step 3: Build Grid</p>
        </div>
      )}
    </div>
  );
}
