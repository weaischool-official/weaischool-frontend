"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
  BookOpen, Users, CalendarDays, Search, Plus, 
  Trash2, Edit2, Loader2, CheckCircle2 
} from "lucide-react";

// Fallback Quick Subjects (Agar API slow ho to UI fast chalega)
const QUICK_SUBJECTS = [
  { name: "English", color: "#3B82F6", periods: 6 },
  { name: "Hindi", color: "#10B981", periods: 5 },
  { name: "Mathematics", color: "#F59E0B", periods: 6 },
  { name: "Science", color: "#8B5CF6", periods: 6 },
  { name: "Social Science", color: "#EC4899", periods: 5 },
  { name: "Computer", color: "#78350F", periods: 3 },
  { name: "EVS", color: "#10B981", periods: 4 },
  { name: "General Knowledge", color: "#6B7280", periods: 2 },
  { name: "Physical Education", color: "#DC2626", periods: 3 },
  { name: "Art", color: "#F472B6", periods: 2 },
];

export default function TimetableBuilderPage() {
  const params = useParams();

  // UI States
  const [activeTab, setActiveTab] = useState<"subjects" | "teachers" | "timetable">("subjects");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingId, setIsAddingId] = useState<string | null>(null);

  // Data States
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  
  // Subject Tab States
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [apiSuggestions, setApiSuggestions] = useState<any[]>([]);

  // 1. Fetch Classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/classes");
        setClasses(res.data);
        if (res.data.length > 0) setSelectedClassId(res.data[0].id);
      } catch (error) {
        toast.error("Failed to load classes");
      }
    };
    fetchClasses();
  }, []);

  // 2. Fetch Subjects when Class changes
  useEffect(() => {
    if (!selectedClassId) return;
    const fetchSubjects = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/class-subjects?class_id=${selectedClassId}`);
        setClassSubjects(res.data);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, [selectedClassId]);

  // 3. Fetch API Suggestions as user types
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
        // Fallback to empty if API not ready yet
        setApiSuggestions([]); 
      }
    };
    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [subjectQuery]);

  // 4. Smart Chip Logic
  const getDisplayedChips = () => {
    let chips: any[] = [];
    
    // If typing, show API suggestions + Filtered Quick Subjects
    if (subjectQuery.trim().length > 0) {
      if (apiSuggestions.length > 0) {
        chips = apiSuggestions.map(s => ({
          name: s.name, color: s.suggested_color || "#3B82F6", periods: s.suggested_periods || 5
        }));
      } else {
        chips = QUICK_SUBJECTS.filter(s => s.name.toLowerCase().includes(subjectQuery.toLowerCase()));
      }
    } else {
      // If empty, show Quick Subjects
      chips = QUICK_SUBJECTS;
    }

    // Filter out subjects already added to the class
    const addedNames = classSubjects.map(cs => cs.subject_name.toLowerCase());
    return chips.filter(chip => !addedNames.includes(chip.name.toLowerCase())).slice(0, 12);
  };

  const displayedChips = getDisplayedChips();
  const exactMatchExists = displayedChips.some(c => c.name.toLowerCase() === subjectQuery.toLowerCase().trim()) || 
                           classSubjects.some(cs => cs.subject_name.toLowerCase() === subjectQuery.toLowerCase().trim());

  // 5. Direct Add Subject
  const handleAddSubject = async (name: string, color: string = "#6B7280", periods: number = 5, isCustom: boolean = false) => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }

    setIsAddingId(name);
    try {
      const res = await api.post("/class-subjects", {
        class_id: selectedClassId,
        subject_name: name,
        periods_per_week: periods,
        color_code: color,
        is_custom: isCustom
      });
      
      setClassSubjects([...classSubjects, res.data]);
      setSubjectQuery(""); // Clear search box after add
      toast.success(`${name} added!`);
    } catch (error: any) {
      console.error("Add Subject Error:", error);
      if (error.response?.status === 409) {
        toast.error("Already added to this class");
      } else {
        toast.error("API Error: Make sure backend is deployed");
      }
    } finally {
      setIsAddingId(null);
    }
  };

  // 6. Delete Subject
  const handleDeleteSubject = async (subjectId: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await api.delete(`/class-subjects/${subjectId}`);
      setClassSubjects(classSubjects.filter(s => s.id !== subjectId));
      toast.success("Removed");
    } catch (error) {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Smart Timetable</h1>
          <p className="text-slate-400 text-sm mt-1">Manage subjects and build clash-free schedules.</p>
        </div>
      </div>

      {/* 3-TAB NAVIGATION */}
      <div className="flex bg-[#111827] border border-slate-800 p-1.5 rounded-xl w-fit shadow-sm overflow-x-auto">
        <button onClick={() => setActiveTab("subjects")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === "subjects" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
          <BookOpen className="w-4 h-4" /> 1. Subjects
        </button>
        <button onClick={() => setActiveTab("teachers")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === "teachers" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
          <Users className="w-4 h-4" /> 2. Teachers
        </button>
        <button onClick={() => setActiveTab("timetable")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === "timetable" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
          <CalendarDays className="w-4 h-4" /> 3. Build Grid
        </button>
      </div>

      {/* GLOBAL CLASS SELECTOR */}
      <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 flex items-center gap-6 shadow-sm">
        <div className="flex-1 max-w-xs">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Select Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500"
          >
            <option value="" disabled className="text-slate-500">-- Choose --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
        {selectedClassId && (
          <div className="flex-1 flex items-center gap-2 text-sm text-slate-300 mt-6">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Working on: <strong>{classes.find(c => c.id === selectedClassId)?.name}</strong>
          </div>
        )}
      </div>

      {/* TAB 1: SUBJECTS SETUP */}
      {activeTab === "subjects" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Smart Quick Add Section */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 shadow-sm">
              <h3 className="font-bold text-white mb-4">Quick Add Subjects</h3>
              
              {/* Search Bar */}
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

              {/* Quick Chips Area */}
              <div className="flex flex-wrap gap-2">
                {displayedChips.map((chip, idx) => (
                  <button
                    key={idx}
                    disabled={isAddingId === chip.name}
                    onClick={() => handleAddSubject(chip.name, chip.color, chip.periods)}
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

                {/* Custom Add Chip (Shows only when typing something new) */}
                {subjectQuery.trim() !== "" && !exactMatchExists && (
                  <button
                    disabled={isAddingId === subjectQuery.trim()}
                    onClick={() => handleAddSubject(subjectQuery.trim(), "#6B7280", 5, true)}
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

              {displayedChips.length === 0 && subjectQuery === "" && (
                <p className="text-xs text-slate-500 mt-2 text-center">All standard subjects added!</p>
              )}
            </div>
          </div>

          {/* RIGHT: Added Subjects Grid */}
          <div className="lg:col-span-2">
            <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 shadow-sm min-h-[400px]">
              <h3 className="font-bold text-white flex items-center justify-between mb-5">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" /> 
                  Added Subjects
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
                    <div key={sub.id} className="group flex items-center justify-between p-3 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-inner" style={{ backgroundColor: `${sub.color_code}20`, border: `1px solid ${sub.color_code}40` }}>
                          <BookOpen className="w-3.5 h-3.5" style={{ color: sub.color_code }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{sub.subject_name}</p>
                          <p className="text-xs text-slate-400">{sub.periods_per_week} periods/week</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteSubject(sub.id, sub.subject_name)} className="p-1.5 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* TABS 2 & 3 Placeholders... */}
      {activeTab !== "subjects" && (
        <div className="bg-[#111827] p-12 rounded-2xl border border-slate-800 text-center">
          <p className="text-slate-400">Section coming next...</p>
          <button onClick={() => setActiveTab("subjects")} className="mt-4 text-blue-400 font-medium text-sm">← Back</button>
        </div>
      )}
    </div>
  );
}