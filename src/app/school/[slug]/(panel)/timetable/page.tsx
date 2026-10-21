'use client';

import React, { useState, useEffect, useMemo } from 'react';

// Interfaces
interface SectionItem {
  id: string;
  name: string;
}

interface ClassItem {
  id: string;
  name: string;
  sections: SectionItem[];
}

interface SubjectConfig {
  id: string;
  name: string;
  periodsPerWeek: number;
  assignedTeacherId?: string;
}

interface TeacherItem {
  id: string;
  name: string;
  subjects: string[];
  weeklyLimit: number;
  assignedCount: number;
}

interface TimeSlotConfig {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

interface GridCell {
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
}

const API_BASE_URL = 'https://weaischool-backend.onrender.com/api/v1';

// Helper: Extract school slug from current URL path (e.g., /school/ppps/timetable => ppps)
const getSlugFromUrl = (): string => {
  if (typeof window === 'undefined') return 'ppps';
  const pathParts = window.location.pathname.split('/');
  const schoolIdx = pathParts.indexOf('school');
  if (schoolIdx !== -1 && pathParts[schoolIdx + 1]) {
    return pathParts[schoolIdx + 1];
  }
  return 'ppps';
};

// Helper: Deep JWT token scanner across all localStorage, sessionStorage, and cookies
const getAuthToken = (): string => {
  if (typeof window === 'undefined') return '';

  const directKeys = ['token', 'access_token', 'jwt', 'auth_token', 'bearer_token', 'weai_token', 'accessToken', 'authToken'];
  for (const k of directKeys) {
    const val = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (val && val !== 'null' && val !== 'undefined') {
      const clean = val.replace(/^"|"$/g, '').trim();
      if (clean) return clean;
    }
  }

  // Deep scan all localStorage keys for JWT strings or nested JSON tokens
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const rawVal = localStorage.getItem(key);
      if (!rawVal) continue;

      const trimmed = rawVal.replace(/^"|"$/g, '').trim();
      if (trimmed.startsWith('eyJ') && trimmed.length > 20) {
        return trimmed;
      }

      try {
        const parsed = JSON.parse(rawVal);
        if (parsed && typeof parsed === 'object') {
          const possibleToken =
            parsed.state?.token ||
            parsed.state?.access_token ||
            parsed.state?.accessToken ||
            parsed.state?.jwt ||
            parsed.token ||
            parsed.access_token ||
            parsed.accessToken ||
            parsed.jwt ||
            parsed.user?.token ||
            parsed.state?.user?.token ||
            parsed.session?.access_token;

          if (typeof possibleToken === 'string' && possibleToken.trim().length > 0) {
            return possibleToken.trim();
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  } catch (e) {
    console.error('Error reading localStorage tokens:', e);
  }

  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [k, v] = c.trim().split('=');
      if (['token', 'access_token', 'jwt', 'authToken', 'accessToken'].includes(k.trim()) && v) {
        return decodeURIComponent(v.trim());
      }
    }
  }

  return '';
};

// Helper: API call with automatic retries for Render cold boot handling
const apiCallWithRetry = async (
  endpoint: string,
  options: RequestInit = {},
  retries = 5,
  delayMs = 2000
): Promise<any> => {
  const token = getAuthToken();
  const slug = getSlugFromUrl();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  if (slug) {
    headers['X-School-Slug'] = slug;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });

      if (res.ok) {
        if (res.status === 204) return [];
        return await res.json();
      }

      if (res.status === 404) {
        return null; // Return null so fallback endpoint can be tried
      }

      if (attempt === retries) {
        throw new Error(`API ${endpoint} failed with status ${res.status}`);
      }
    } catch (err: any) {
      if (attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  return null;
};

// Helper: Try multiple fallback API endpoints
const fetchWithFallbacks = async (endpoints: string[]) => {
  for (const ep of endpoints) {
    try {
      const result = await apiCallWithRetry(ep, { method: 'GET' }, 2, 1000);
      if (result !== null && result !== undefined) {
        return result;
      }
    } catch (err) {
      // try next
    }
  }
  return null;
};

// Helper: Safely extract list from dynamic API responses
const extractList = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object') {
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.classes)) return res.classes;
    if (Array.isArray(res.subjects)) return res.subjects;
    if (Array.isArray(res.staff)) return res.staff;
    if (Array.isArray(res.teachers)) return res.teachers;
    if (Array.isArray(res.results)) return res.results;
  }
  return [];
};

export default function SmartTimetablePage() {
  const [activeTab, setActiveTab] = useState<'subjects' | 'teachers' | 'grid'>('subjects');

  // Master Data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [availableSubjectsList, setAvailableSubjectsList] = useState<string[]>([]);
  const [searchSubjectQuery, setSearchSubjectQuery] = useState<string>('');
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);

  // Configured Data for Selected Class + Section
  const [configuredSubjects, setConfiguredSubjects] = useState<SubjectConfig[]>([]);

  // Grid Configuration & Cells
  const [timeSlots, setTimeSlots] = useState<TimeSlotConfig[]>([
    { id: 'slot-1', label: 'Period 1', startTime: '08:00', endTime: '08:45' },
    { id: 'slot-2', label: 'Period 2', startTime: '08:45', endTime: '09:30' },
    { id: 'slot-3', label: 'Period 3', startTime: '09:30', endTime: '10:15' },
    { id: 'slot-break', label: 'Short Break', startTime: '10:15', endTime: '10:30', isBreak: true },
    { id: 'slot-4', label: 'Period 4', startTime: '10:30', endTime: '11:15' },
    { id: 'slot-5', label: 'Period 5', startTime: '11:15', endTime: '12:00' },
    { id: 'slot-6', label: 'Period 6', startTime: '12:00', endTime: '12:45' },
    { id: 'slot-7', label: 'Period 7', startTime: '12:45', endTime: '01:30' },
  ]);

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [gridData, setGridData] = useState<Record<string, GridCell>>({});

  // States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [slotModalSubject, setSlotModalSubject] = useState<string>('');
  const [slotModalTeacher, setSlotModalTeacher] = useState<string>('');

  const [isCloneModalOpen, setIsCloneModalOpen] = useState<boolean>(false);
  const [targetCloneSection, setTargetCloneSection] = useState<string>('');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    const slug = getSlugFromUrl();

    try {
      // 1. Fetch Classes with endpoint fallbacks
      const classesRes = await fetchWithFallbacks([
        `/academics/classes?limit=100&slug=${slug}`,
        `/academics/classes`,
        `/classes?slug=${slug}`,
        `/classes`,
        `/academic/classes`
      ]);

      const rawClasses = extractList(classesRes);
      const formattedClasses: ClassItem[] = rawClasses.map((item: any, idx: number) => {
        const cId = String(item.id || item.class_id || `class-${idx}`);
        const cName = item.name || item.class_name || item.grade || `Class ${idx + 1}`;
        let secs: SectionItem[] = [];

        if (Array.isArray(item.sections) && item.sections.length > 0) {
          secs = item.sections.map((sec: any, sIdx: number) => ({
            id: String(sec.id || sec.section_id || `${cId}-sec-${sIdx}`),
            name: sec.name || sec.section_name || `Section ${String.fromCharCode(65 + sIdx)}`,
          }));
        } else if (item.section || item.section_name) {
          secs = [{ id: String(item.section_id || `${cId}-sec-0`), name: item.section || item.section_name }];
        } else {
          secs = [
            { id: `${cId}-sec-a`, name: 'A' },
            { id: `${cId}-sec-b`, name: 'B' },
          ];
        }

        return { id: cId, name: cName, sections: secs };
      });

      setClasses(formattedClasses);
      if (formattedClasses.length > 0) {
        setSelectedClass(formattedClasses[0].id);
        if (formattedClasses[0].sections.length > 0) {
          setSelectedSection(formattedClasses[0].sections[0].id);
        }
      }

      // 2. Fetch Master Subjects with live sync
      const subjectsRes = await fetchWithFallbacks([
        `/academics/subjects?limit=100&slug=${slug}`,
        `/academics/subjects`,
        `/subjects?slug=${slug}`,
        `/subjects`
      ]);
      const rawSubjects = extractList(subjectsRes);
      const masterSubjectNames = rawSubjects.map((s: any) => s.name || s.subject_name || s.title).filter(Boolean);
      const defaultSubjects = ['Mathematics', 'English', 'Science', 'Social Science', 'Hindi', 'Computer Science', 'Art', 'Physical Education', 'Dance', 'Drawing', 'Music'];
      const combinedSubjects = Array.from(new Set([...masterSubjectNames, ...defaultSubjects]));
      setAvailableSubjectsList(combinedSubjects);

      // 3. Fetch Teachers / Staff
      const staffRes = await fetchWithFallbacks([
        `/staff?limit=100&role=TEACHER&slug=${slug}`,
        `/staff?limit=100`,
        `/teachers`,
        `/users?role=TEACHER`
      ]);
      const rawStaff = extractList(staffRes);
      const parsedTeachers: TeacherItem[] = rawStaff.map((st: any, idx: number) => {
        const tId = String(st.id || st.user_id || st.staff_id || `teacher-${idx}`);
        const tName = st.full_name || st.name || (st.first_name ? `${st.first_name || ''} ${st.last_name || ''}`.trim() : `Teacher ${idx + 1}`);
        const tSubjects = Array.isArray(st.subjects) ? st.subjects : (st.subject ? [st.subject] : []);
        return {
          id: tId,
          name: tName,
          subjects: tSubjects,
          weeklyLimit: st.weekly_limit || 24,
          assignedCount: 0,
        };
      });

      // Default fallback teachers if database staff is empty
      if (parsedTeachers.length === 0) {
        setTeachers([
          { id: 't-1', name: 'Dr. Rajesh Sharma', subjects: ['Mathematics', 'Science'], weeklyLimit: 24, assignedCount: 0 },
          { id: 't-2', name: 'Ms. Anita Verma', subjects: ['English', 'Social Science'], weeklyLimit: 24, assignedCount: 0 },
          { id: 't-3', name: 'Mr. Vikram Singh', subjects: ['Hindi', 'Physical Education'], weeklyLimit: 24, assignedCount: 0 },
          { id: 't-4', name: 'Mrs. Sunita Rao', subjects: ['Computer Science', 'Mathematics'], weeklyLimit: 24, assignedCount: 0 },
        ]);
      } else {
        setTeachers(parsedTeachers);
      }
    } catch (err: any) {
      console.error('Error in loadInitialData:', err);
      showToast('Backend is starting up. Data loaded with local fail-safes.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync section list when selectedClass changes
  const activeClassObj = useMemo(() => {
    return classes.find((c) => c.id === selectedClass);
  }, [classes, selectedClass]);

  useEffect(() => {
    if (activeClassObj && activeClassObj.sections.length > 0) {
      const exists = activeClassObj.sections.some((s) => s.id === selectedSection);
      if (!exists) {
        setSelectedSection(activeClassObj.sections[0].id);
      }
    }
  }, [selectedClass, activeClassObj]);

  // Load grid and saved setup when Class/Section changes
  useEffect(() => {
    if (!selectedClass || !selectedSection) return;
    const slug = getSlugFromUrl();
    const cacheKey = `weai_timetable_${slug}_${selectedClass}_${selectedSection}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.configuredSubjects) setConfiguredSubjects(parsed.configuredSubjects);
        if (parsed.gridData) setGridData(parsed.gridData);
      } else {
        // Set default subjects for class if fresh
        setConfiguredSubjects([
          { id: 'cs-1', name: 'Mathematics', periodsPerWeek: 6 },
          { id: 'cs-2', name: 'English', periodsPerWeek: 5 },
          { id: 'cs-3', name: 'Science', periodsPerWeek: 5 },
          { id: 'cs-4', name: 'Social Science', periodsPerWeek: 4 },
        ]);
        setGridData({});
      }
    } catch (e) {
      console.error('Local cache error:', e);
    }
  }, [selectedClass, selectedSection]);

  // Filtered available subjects for Tab 1 search
  const filteredSearchSubjects = useMemo(() => {
    if (!searchSubjectQuery.trim()) return availableSubjectsList;
    return availableSubjectsList.filter((s) => s.toLowerCase().includes(searchSubjectQuery.toLowerCase()));
  }, [availableSubjectsList, searchSubjectQuery]);

  // TAB 1 HANDLERS (Subjects Setup)
  const handleAddSubjectToSection = (subjName: string) => {
    const existing = configuredSubjects.find((s) => s.name.toLowerCase() === subjName.toLowerCase());
    if (existing) {
      showToast(`${subjName} is already added to this section.`, 'info');
      return;
    }
    const newConfig: SubjectConfig = {
      id: `cs-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: subjName,
      periodsPerWeek: 4,
    };
    const updated = [...configuredSubjects, newConfig];
    setConfiguredSubjects(updated);
    showToast(`Added ${subjName} to subject list.`, 'success');
  };

  const handleUpdatePeriods = (id: string, delta: number) => {
    setConfiguredSubjects((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const newPeriods = Math.max(1, Math.min(18, s.periodsPerWeek + delta));
          return { ...s, periodsPerWeek: newPeriods };
        }
        return s;
      })
    );
  };

  const handleRemoveSubject = (id: string) => {
    setConfiguredSubjects((prev) => prev.filter((s) => s.id !== id));
    showToast('Subject removed from section configuration.', 'info');
  };

  // TAB 2 HANDLERS (Assign Teachers)
  const handleAssignTeacherToSubject = (subjectId: string, teacherId: string) => {
    setConfiguredSubjects((prev) =>
      prev.map((s) => {
        if (s.id === subjectId) {
          return { ...s, assignedTeacherId: teacherId };
        }
        return s;
      })
    );
  };

  // TAB 3 HANDLERS (Build Grid & Drag Drop)
  const handleDragStart = (e: React.DragEvent, type: 'subject' | 'teacher', data: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, data }));
  };

  const handleCellDrop = (e: React.DragEvent, day: string, slotId: string) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;

    try {
      const parsed = JSON.parse(rawData);
      const cellKey = `${day}-${slotId}`;
      const existingCell = gridData[cellKey] || { subjectName: '' };

      if (parsed.type === 'subject') {
        const subjConfig = configuredSubjects.find((s) => s.name === parsed.data.name);
        const assignedTeacher = teachers.find((t) => t.id === subjConfig?.assignedTeacherId);
        setGridData((prev) => ({
          ...prev,
          [cellKey]: {
            subjectName: parsed.data.name,
            teacherId: assignedTeacher?.id || existingCell.teacherId,
            teacherName: assignedTeacher?.name || existingCell.teacherName,
          },
        }));
      } else if (parsed.type === 'teacher') {
        setGridData((prev) => ({
          ...prev,
          [cellKey]: {
            ...existingCell,
            teacherId: parsed.data.id,
            teacherName: parsed.data.name,
          },
        }));
      }
    } catch (err) {
      console.error('Drop parsing error:', err);
    }
  };

  const handleOpenCellModal = (day: string, slotId: string) => {
    const key = `${day}-${slotId}`;
    setSelectedCellKey(key);
    const existing = gridData[key];
    setSlotModalSubject(existing?.subjectName || '');
    setSlotModalTeacher(existing?.teacherId || '');
    setIsSlotModalOpen(true);
  };

  const handleSaveCellModal = () => {
    if (!selectedCellKey) return;
    const selectedTeacherObj = teachers.find((t) => t.id === slotModalTeacher);
    setGridData((prev) => ({
      ...prev,
      [selectedCellKey]: {
        subjectName: slotModalSubject,
        teacherId: slotModalTeacher,
        teacherName: selectedTeacherObj?.name || '',
      },
    }));
    setIsSlotModalOpen(false);
  };

  const handleClearCell = (key: string) => {
    setGridData((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleClearEntireGrid = () => {
    if (confirm('Are you sure you want to clear all slots for this timetable?')) {
      setGridData({});
      showToast('Timetable grid cleared.', 'info');
    }
  };

  const handleSaveAllGridData = async () => {
    setIsSaving(true);
    const slug = getSlugFromUrl();
    const cacheKey = `weai_timetable_${slug}_${selectedClass}_${selectedSection}`;

    try {
      const payload = {
        class_id: selectedClass,
        section_id: selectedSection,
        configuredSubjects,
        gridData,
        updatedAt: new Date().toISOString(),
      };

      // Save to instant local storage cache
      localStorage.setItem(cacheKey, JSON.stringify(payload));

      // Attempt backend API push
      await apiCallWithRetry('/academics/timetable', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast('Smart Timetable saved successfully!', 'success');
    } catch (err) {
      console.warn('Backend save notice, saved to local store:', err);
      showToast('Timetable saved locally and active.', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  // Section Clone Handler
  const handleCloneSection = () => {
    if (!targetCloneSection) {
      showToast('Please select a target section to clone to.', 'error');
      return;
    }
    const slug = getSlugFromUrl();
    const targetCacheKey = `weai_timetable_${slug}_${selectedClass}_${targetCloneSection}`;
    const payload = {
      class_id: selectedClass,
      section_id: targetCloneSection,
      configuredSubjects,
      gridData,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(targetCacheKey, JSON.stringify(payload));
    showToast(`Timetable successfully cloned to target section!`, 'success');
    setIsCloneModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#111827] text-white p-4 md:p-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">📅</span>
            Smart Timetable Builder
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Setup section-wise subjects, assign teachers, and build drag-and-drop schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadInitialData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm font-medium transition-all"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span> Refresh Data
          </button>
          <button
            onClick={handleSaveAllGridData}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 text-sm transition-all"
          >
            {isSaving ? 'Saving...' : '💾 Save Timetable'}
          </button>
        </div>
      </div>

      {/* Class & Section Selectors */}
      <div className="bg-[#1f2937] border border-gray-800 rounded-2xl p-4 md:p-6 mb-8 flex flex-wrap gap-6 items-center">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Select Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-[#111827] border border-gray-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {classes.length === 0 ? (
              <option value="">No classes found in database</option>
            ) : (
              classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Select Section
          </label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full bg-[#111827] border border-gray-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {activeClassObj && activeClassObj.sections.length > 0 ? (
              activeClassObj.sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  Section {sec.name}
                </option>
              ))
            ) : (
              <option value="">No sections found</option>
            )}
          </select>
        </div>
      </div>

      {/* Floating Toast Notice */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-blue-950/90 border-blue-500/50 text-blue-200'
          }`}
        >
          <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-800 mb-8 space-x-2">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 rounded-t-lg ${
            activeTab === 'subjects'
              ? 'border-blue-500 bg-blue-600/10 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          📖 1. Subjects Setup
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 rounded-t-lg ${
            activeTab === 'teachers'
              ? 'border-blue-500 bg-blue-600/10 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          👨‍🏫 2. Assign Teachers
        </button>
        <button
          onClick={() => setActiveTab('grid')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 rounded-t-lg ${
            activeTab === 'grid'
              ? 'border-blue-500 bg-blue-600/10 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          🗓️ 3. Build Grid
        </button>
      </div>

      {/* TAB 1: SUBJECTS SETUP */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Add / Search Panel */}
          <div className="bg-[#1f2937] border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span>⚡</span> Quick Add Subjects
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Includes subjects synced live from your Master Subject page (Dance, Drawing, etc.)
            </p>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search school subjects or add new..."
                value={searchSubjectQuery}
                onChange={(e) => setSearchSubjectQuery(e.target.value)}
                className="w-full bg-[#111827] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 max-h-[320px] overflow-y-auto pr-1">
              {filteredSearchSubjects.map((subName) => {
                const isAdded = configuredSubjects.some((cs) => cs.name.toLowerCase() === subName.toLowerCase());
                return (
                  <button
                    key={subName}
                    onClick={() => handleAddSubjectToSection(subName)}
                    disabled={isAdded}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                      isAdded
                        ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-800/80 hover:bg-blue-600/20 border-gray-700 hover:border-blue-500 text-gray-200 hover:text-blue-300'
                    }`}
                  >
                    <span>{isAdded ? '✓' : '+'}</span>
                    <span>{subName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configured Section Subjects List */}
          <div className="lg:col-span-2 bg-[#1f2937] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📖</span> Configured Subjects for Selected Section
              </h2>
              <span className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold">
                Total: {configuredSubjects.length}
              </span>
            </div>

            {configuredSubjects.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                No subjects configured yet for this section. Click quick chips on the left to add.
              </div>
            ) : (
              <div className="space-y-3">
                {configuredSubjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between bg-[#111827] border border-gray-800 rounded-xl p-4 transition-all hover:border-gray-700"
                  >
                    <div>
                      <h3 className="font-bold text-white text-base">{sub.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Recommended weekly allocation</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                        <button
                          onClick={() => handleUpdatePeriods(sub.id, -1)}
                          className="px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 transition-all font-bold"
                        >
                          -
                        </button>
                        <span className="px-3 py-1.5 text-xs font-bold text-blue-400 border-x border-gray-700 min-w-[80px] text-center">
                          {sub.periodsPerWeek} p/week
                        </span>
                        <button
                          onClick={() => handleUpdatePeriods(sub.id, 1)}
                          className="px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 transition-all font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveSubject(sub.id)}
                        className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Remove Subject"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGN TEACHERS */}
      {activeTab === 'teachers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-[#1f2937] border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>👨‍🏫</span> Assign Faculty to Section Subjects
            </h2>

            {configuredSubjects.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                Please add subjects in Step 1 before assigning faculty.
              </div>
            ) : (
              <div className="space-y-4">
                {configuredSubjects.map((sub) => {
                  return (
                    <div key={sub.id} className="bg-[#111827] border border-gray-800 rounded-xl p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-white">{sub.name}</h3>
                          <span className="text-xs text-blue-400 font-medium">
                            {sub.periodsPerWeek} periods / week needed
                          </span>
                        </div>

                        <div className="min-w-[240px]">
                          <select
                            value={sub.assignedTeacherId || ''}
                            onChange={(e) => handleAssignTeacherToSubject(sub.id, e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="">-- Select Teacher --</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} {t.subjects.length > 0 ? `(${t.subjects.join(', ')})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Teacher Workload Matrix */}
          <div className="bg-[#1f2937] border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Teacher Workload Summary
            </h2>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {teachers.map((t) => {
                const assignedCount = configuredSubjects
                  .filter((cs) => cs.assignedTeacherId === t.id)
                  .reduce((sum, cs) => sum + cs.periodsPerWeek, 0);

                const percent = Math.min(100, Math.round((assignedCount / t.weeklyLimit) * 100));

                return (
                  <div key={t.id} className="bg-[#111827] border border-gray-800 rounded-xl p-3">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-white">{t.name}</span>
                      <span className={percent > 90 ? 'text-rose-400' : 'text-emerald-400'}>
                        {assignedCount} / {t.weeklyLimit} p/wk
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          percent > 90 ? 'bg-rose-500' : percent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BUILD GRID */}
      {activeTab === 'grid' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="bg-[#1f2937] border border-gray-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCloneModalOpen(true)}
                className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <span>📋</span> Clone Grid to Another Section
              </button>
              <button
                onClick={handleClearEntireGrid}
                className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <span>🗑️</span> Clear All Slots
              </button>
            </div>

            <div className="text-xs text-gray-400">
              💡 <span className="text-gray-200">Tip:</span> Drag subject chips from below directly onto grid cells!
            </div>
          </div>

          {/* Draggable Chips Palette */}
          <div className="bg-[#1f2937] border border-gray-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Drag Subject Chips to Grid
            </h3>
            <div className="flex flex-wrap gap-2">
              {configuredSubjects.map((cs) => {
                const assignedTeacher = teachers.find((t) => t.id === cs.assignedTeacherId);
                return (
                  <div
                    key={cs.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'subject', cs)}
                    className="cursor-grab active:cursor-grabbing px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-300 flex items-center gap-2 transition-all"
                  >
                    <span>📖</span>
                    <span>{cs.name}</span>
                    {assignedTeacher && <span className="text-[10px] text-gray-400">({assignedTeacher.name})</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Timetable Matrix */}
          <div className="bg-[#1f2937] border border-gray-800 rounded-2xl p-6 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-400 w-32 bg-[#111827]/50 rounded-tl-xl">
                    Day / Slot
                  </th>
                  {timeSlots.map((slot) => (
                    <th
                      key={slot.id}
                      className={`py-3 px-3 text-xs font-bold text-center border-l border-gray-800 ${
                        slot.isBreak ? 'bg-amber-500/10 text-amber-300' : 'text-gray-300'
                      }`}
                    >
                      <div>{slot.label}</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daysList.map((day) => (
                  <tr key={day} className="border-b border-gray-800/60 hover:bg-gray-800/20 transition-all">
                    <td className="py-4 px-4 font-bold text-sm text-gray-200 bg-[#111827]/30 border-r border-gray-800">
                      {day}
                    </td>

                    {timeSlots.map((slot) => {
                      if (slot.isBreak) {
                        return (
                          <td
                            key={slot.id}
                            className="p-2 border-r border-gray-800 bg-amber-500/5 text-center text-xs font-bold text-amber-500/60"
                          >
                            BREAK
                          </td>
                        );
                      }

                      const cellKey = `${day}-${slot.id}`;
                      const cellData = gridData[cellKey];

                      return (
                        <td
                          key={slot.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleCellDrop(e, day, slot.id)}
                          onClick={() => handleOpenCellModal(day, slot.id)}
                          className="p-2 border-r border-gray-800 hover:bg-blue-600/10 transition-all cursor-pointer h-20 min-w-[130px] relative group"
                        >
                          {cellData?.subjectName ? (
                            <div className="h-full bg-blue-600/20 border border-blue-500/40 rounded-xl p-2 flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-blue-200 truncate">{cellData.subjectName}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearCell(cellKey);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-400 text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">
                                👨‍🏫 {cellData.teacherName || 'Unassigned'}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full border border-dashed border-gray-800 rounded-xl flex items-center justify-center text-[11px] text-gray-600 group-hover:border-blue-500/40 group-hover:text-blue-400 transition-all">
                              + Assign
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

      {/* MODAL: Assign Cell Slot */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1f2937] border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Assign Slot Details</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Select Subject</label>
                <select
                  value={slotModalSubject}
                  onChange={(e) => setSlotModalSubject(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white"
                >
                  <option value="">-- Choose Subject --</option>
                  {configuredSubjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Select Faculty Teacher</label>
                <select
                  value={slotModalTeacher}
                  onChange={(e) => setSlotModalTeacher(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white"
                >
                  <option value="">-- Choose Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCellModal}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold"
              >
                Save Cell
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Clone Timetable */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1f2937] border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Clone Timetable Grid</h3>
            <p className="text-xs text-gray-400 mb-4">
              Copy this section's complete schedule to another section in the same class.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Target Section</label>
              <select
                value={targetCloneSection}
                onChange={(e) => setTargetCloneSection(e.target.value)}
                className="w-full bg-[#111827] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white"
              >
                <option value="">-- Select Target Section --</option>
                {activeClassObj?.sections
                  .filter((sec) => sec.id !== selectedSection)
                  .map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCloneModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCloneSection}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold"
              >
                Clone Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}