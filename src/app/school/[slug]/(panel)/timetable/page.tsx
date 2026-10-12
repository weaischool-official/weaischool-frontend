"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
  BookOpen, Users, CalendarDays, Search, Plus, 
  Trash2, Edit2, Loader2, AlertCircle, CheckCircle2 
} from "lucide-react";

export default function TimetableBuilderPage() {
  const params = useParams();
  const tenantSlug = params.slug as string;

  // UI States
  const [activeTab, setActiveTab] = useState<"subjects" | "teachers" | "timetable">("subjects");
  const [isLoading, setIsLoading] = useState(false);

  // Data States
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  
  // Subject Tab States
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Initial Data (Classes)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/classes");
        setClasses(res.data);
        if (res.data.length > 0) {
          setSelectedClassId(res.data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch classes:", error);
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

  // 3. Handle Smart Autocomplete Search
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (subjectQuery.trim() === "") {
        setSuggestions([]);
        return;
      }
      try {
        const res = await api.get(`/class-subjects/suggestions?query=${subjectQuery}`);
        setSuggestions(res.data.suggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Suggestion error:", error);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [subjectQuery]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4. Add Subject to Class
  const handleAddSubject = async (suggestion: any = null) => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }

    let subjectName = "";
    let colorCode = "#3B82F6";
    let periods = 5;
    let isCustom = false;

    if (suggestion) {
      subjectName = suggestion.name;
      colorCode = suggestion.suggested_color;
      periods = suggestion.suggested_periods;
    } else {
      if (!subjectQuery.trim()) return;
      subjectName = subjectQuery.trim();
      isCustom = true;
      // Default color for custom
      colorCode = "#6B7280"; 
    }

    setIsAddingSubject(true);
    try {
      const res = await api.post("/class-subjects", {
        class_id: selectedClassId,
        subject_name: subjectName,
        periods_per_week: periods,
        color_code: colorCode,
        is_custom: isCustom
      });
      
      setClassSubjects([...classSubjects, res.data]);
      setSubjectQuery("");
      setShowSuggestions(false);
      toast.success(`${subjectName} added to class!`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error("This subject is already added to this class");
      } else {
        toast.error("Failed to add subject");
      }
    } finally {
      setIsAddingSubject(false);
    }
  };

  // 5. Delete Subject
  const handleDeleteSubject = async (subjectId: string, name: string) => {
    if (!confirm(`Remove ${name} from this class? This will delete associated timetable slots.`)) return;
    
    try {
      await api.delete(`/class-subjects/${subjectId}`);
      setClassSubjects(classSubjects.filter(s => s.id !== subjectId));
      toast.success("Subject removed");
    } catch (error) {
      toast.error("Failed to remove subject");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Smart Timetable Builder</h1>
          <p className="text-slate-500 text-sm mt-1">Set subjects, assign teachers, and build clash-free schedules.</p>
        </div>
      </div>

      {/* 3-TAB NAVIGATION */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("subjects")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            activeTab === "subjects" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          1. Subjects Setup
        </button>
        <button
          onClick={() => setActiveTab("teachers")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            activeTab === "teachers" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4" />
          2. Assign Teachers
        </button>
        <button
          onClick={() => setActiveTab("timetable")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            activeTab === "timetable" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          3. Build Grid
        </button>
      </div>

      {/* GLOBAL CLASS SELECTOR (Applies to all tabs) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
        <div className="flex-1 max-w-xs">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Working on Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          >
            <option value="" disabled>-- Select Class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>Class {cls.name}</option>
            ))}
          </select>
        </div>
        {selectedClassId && (
          <div className="flex-1 flex items-center gap-2 text-sm text-slate-500 mt-5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Active: Class {classes.find(c => c.id === selectedClassId)?.name}
          </div>
        )}
      </div>

      {/* =========================================
          TAB 1: SUBJECTS SETUP (Active Phase 1)
          ========================================= */}
      {activeTab === "subjects" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Autocomplete Add Section */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Plus className="w-4 h-4 text-blue-600" /> Add Subject
              </h3>
              
              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Type subject name..."
                    value={subjectQuery}
                    onChange={(e) => {
                      setSubjectQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions && subjectQuery.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                    {suggestions.length > 0 ? (
                      <div className="p-2 space-y-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">Suggestions</p>
                        {suggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAddSubject(sug)}
                            disabled={isAddingSubject}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg flex items-center justify-between group transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: sug.suggested_color }}
                              />
                              <div>
                                <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700">{sug.name}</p>
                                <p className="text-xs text-slate-400">{sug.category}</p>
                              </div>
                            </div>
                            <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm text-slate-500 mb-3">No standard subjects found.</p>
                        <button 
                          onClick={() => handleAddSubject()}
                          disabled={isAddingSubject}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          + Add "{subjectQuery}" as Custom
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                Type to see CBSE/ICSE standard subjects, or create your own custom subject.
              </p>
            </div>
          </div>

          {/* RIGHT: Added Subjects List */}
          <div className="lg:col-span-2">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-blue-600" /> 
                Subjects for Class {classes.find(c => c.id === selectedClassId)?.name || "..."}
                <span className="ml-auto text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  Total: {classSubjects.length}
                </span>
              </h3>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                  <p>Loading subjects...</p>
                </div>
              ) : classSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                  <BookOpen className="w-12 h-12 mb-4 text-slate-200" />
                  <p className="text-sm font-medium text-slate-600 mb-1">No subjects added yet</p>
                  <p className="text-xs">Use the search box on the left to add subjects.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classSubjects.map((sub) => (
                    <div 
                      key={sub.id} 
                      className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-md flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: `${sub.color_code}20`, color: sub.color_code }}
                        >
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{sub.subject_name}</p>
                          <p className="text-xs text-slate-500">{sub.periods_per_week} periods/week</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit (Coming Soon)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSubject(sub.id, sub.subject_name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          TAB 2: TEACHERS (Placeholder for next step)
          ========================================= */}
      {activeTab === "teachers" && (
        <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Teacher Assignment Setup</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            In the next step, you will assign teachers to the subjects you just created in Tab 1.
          </p>
          <button 
            onClick={() => setActiveTab("subjects")}
            className="text-blue-600 font-medium hover:underline"
          >
            ← Back to Subjects
          </button>
        </div>
      )}

      {/* =========================================
          TAB 3: TIMETABLE GRID (Placeholder for next step)
          ========================================= */}
      {activeTab === "timetable" && (
        <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center">
          <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Smart Drag & Drop Grid</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            After setting up subjects and teachers, you will drag and drop them here. Clash detection will prevent double-booking!
          </p>
          <button 
            onClick={() => setActiveTab("teachers")}
            className="text-blue-600 font-medium hover:underline"
          >
            ← Go to Teachers Setup
          </button>
        </div>
      )}

    </div>
  );
}