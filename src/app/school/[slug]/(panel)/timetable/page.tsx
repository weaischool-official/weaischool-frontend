"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
  BookOpen, Users, CalendarDays, Search, Plus, Minus,
  Trash2, Loader2, CheckCircle2, AlertCircle
} from "lucide-react";

// Standard quick suggestions (Admin can adjust period count anytime)
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

export default function TimetableBuilderPage() {
  const params = useParams();

  // UI States
  const [activeTab, setActiveTab] = useState<"subjects" | "teachers" | "timetable">("subjects");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingId, setIsAddingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Data States
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  
  // Sections State
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  
  // Subject Tab States
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [apiSuggestions, setApiSuggestions] = useState<any[]>([]);

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

    const currentClass = classes.find(c => c.id === selectedClassId);
    if (currentClass?.sections && Array.isArray(currentClass.sections) && currentClass.sections.length > 0) {
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

  // 3. Fetch SUBJECTS when Class changes
  useEffect(() => {
    if (!selectedClassId) return;
    const fetchSubjects = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/class-subjects?class_id=${selectedClassId}`);
        setClassSubjects(res.data || []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, [selectedClassId]);

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

  // 5. Smart Chip Logic
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

  // 6. Add Subject (Default 5, Admin can change anytime)
  const handleAddSubject = async (name: string, color: string = "#3B82F6", isCustom: boolean = false) => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }

    setIsAddingId(name);
    try {
      const res = await api.post("/class-subjects", {
        class_id: selectedClassId,
        subject_name: name,
        periods_per_week: 5, // Initial default, admin adjusts via +/-
        color_code: color,
        is_custom: isCustom
      });
      
      setClassSubjects(prev => [...prev, res.data]);
      setSubjectQuery(""); 
      toast.success(`${name} added! Adjust periods using + / -`);
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || "Failed to add subject";
      toast.error(msg);
    } finally {
      setIsAddingId(null);
    }
  };

  // 7. ADMIN PERIODS PER WEEK CONTROL (+ / -)
  const handleUpdatePeriods = async (subjectId: string, currentPeriods: number, delta: number) => {
    const newPeriods = currentPeriods + delta;
    if (newPeriods < 1 || newPeriods > 20) return;

    setUpdatingId(subjectId);
    try {
      const res = await api.patch(`/class-subjects/${subjectId}`, {
        periods_per_week: newPeriods
      });

      setClassSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, periods_per_week: newPeriods } : s));
      toast.success(`Updated to ${newPeriods} periods/week`);
    } catch (error: any) {
      toast.error("Failed to update periods");
    } finally {
      setUpdatingId(null);
    }
  };

  // 8. Delete Subject
  const handleDeleteSubject = async (subjectId: string, name: string) => {
    if (!confirm(`Remove ${name} from this class?`)) return;
    try {
      await api.delete(`/class-subjects/${subjectId}`);
      setClassSubjects(prev => prev.filter(s => s.id !== subjectId));
      toast.success("Subject removed");
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : "Failed to remove");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Smart Timetable Builder</h1>
          <p className="text-slate-400 text-sm mt-1">Setup subjects, assign teachers per section, and build schedules.</p>
        </div>
      </div>

      {/* 3-TAB NAVIGATION */}
      <div className="flex bg-[#111827] border border-slate-800 p-1.5 rounded-xl w-fit shadow-sm overflow-x-auto">
        <button onClick={() => setActiveTab("subjects")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === "subjects" ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" : "text-slate-400 hover:text-white"}`}>
          <BookOpen className="w-4 h-4" /> 1. Subjects Setup
        </button>
        <button onClick={() => setActiveTab("teachers")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === "teachers" ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" : "text-slate-400 hover:text-white"}`}>
          <Users className="w-4 h-4" /> 2. Assign Teachers
        </button>
        <button onClick={() => setActiveTab("timetable")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === "timetable" ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" : "text-slate-400 hover:text-white"}`}>
          <CalendarDays className="w-4 h-4" /> 3. Build Grid
        </button>
      </div>

      {/* GLOBAL SELECTORS */}
      <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-6 shadow-sm">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Select Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500"
          >
            <option value="" disabled className="text-slate-500">-- Choose Class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
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
                <option key={sec.id} value={sec.id}>{sec.name}</option>
              ))
            )}
          </select>
        </div>

        {selectedClassId && (
          <div className="flex items-center gap-2 text-sm text-slate-300 mt-6 bg-[#0f172a] px-4 py-2 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Working on: <strong className="text-white">{classes.find(c => c.id === selectedClassId)?.name}</strong> 
              {selectedSectionId && sections.length > 0 && (
                <> (Section <strong className="text-white">{sections.find(s => s.id === selectedSectionId)?.name}</strong>)</>
              )}
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
                  Subjects are added to the class. Use the <strong>+ / - buttons</strong> on each card to set required periods per week.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 shadow-sm min-h-[400px]">
              <h3 className="font-bold text-white flex items-center justify-between mb-5">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" /> 
                  Configured Subjects for {classes.find(c => c.id === selectedClassId)?.name}
                </span>
                <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                  Total: {classSubjects.length}
                </span>
              </h3>

              {isLoading ? (
                <div className="flex justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : classSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  <p className="text-sm font-medium text-slate-300">No subjects added</p>
                  <p className="text-xs mt-1">Click a chip on the left to add quickly.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classSubjects.map((sub) => (
                    <div key={sub.id} className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-inner" style={{ backgroundColor: `${sub.color_code}20`, border: `1px solid ${sub.color_code}40` }}>
                          <BookOpen className="w-4 h-4" style={{ color: sub.color_code }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{sub.subject_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {/* ADMIN PERIODS CONTROL (- / +) */}
                            <div className="flex items-center gap-1.5 bg-[#0f172a] border border-slate-700 rounded-lg px-2 py-0.5">
                              <button
                                onClick={() => handleUpdatePeriods(sub.id, sub.periods_per_week, -1)}
                                disabled={updatingId === sub.id || sub.periods_per_week <= 1}
                                className="text-slate-400 hover:text-white disabled:opacity-30 p-0.5"
                                title="Decrease periods/week"
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
                                title="Increase periods/week"
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
                        title="Remove Subject"
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

      {/* TAB 2 & TAB 3 Placeholders... */}
      {activeTab !== "subjects" && (
        <div className="bg-[#111827] p-12 rounded-2xl border border-slate-800 text-center">
          <p className="text-slate-400">Step {activeTab === "teachers" ? "2: Assign Teachers per Section" : "3: Drag & Drop Grid Builder"} coming next!</p>
          <button onClick={() => setActiveTab("subjects")} className="mt-4 text-blue-400 font-medium text-sm">← Back to Subjects Setup</button>
        </div>
      )}
    </div>
  );
}