'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Sparkles,
  Calendar,
  Plus,
  RefreshCw,
  Trash2,
  Save,
  Copy,
  AlertTriangle,
  Clock,
  Settings,
  X,
  Check,
  Loader2,
  Info
} from 'lucide-react';

interface ClassItem {
  id: string;
  class_name: string;
}

interface SectionItem {
  id: string;
  section_name: string;
}

interface TeacherItem {
  id: string;
  full_name: string;
  qualification?: string;
}

interface SubjectItem {
  id: string;
  subject_name: string;
  code?: string;
}

interface TimeSlot {
  period_num: number;
  name: string;
  start_time: string;
  end_time: string;
  slot_type: 'CLASS' | 'BREAK' | 'LUNCH';
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
  is_clash?: boolean;
  clash_reason?: string;
}

interface TeacherClash {
  period_num: number;
  day: string;
  clashing_class_name: string;
}

const DEFAULT_SLOTS: TimeSlot[] = [
  { period_num: 1, name: 'Period 1', start_time: '08:00', end_time: '08:45', slot_type: 'CLASS' },
  { period_num: 2, name: 'Period 2', start_time: '08:45', end_time: '09:30', slot_type: 'CLASS' },
  { period_num: 3, name: 'Short Break', start_time: '09:30', end_time: '09:45', slot_type: 'BREAK' },
  { period_num: 4, name: 'Period 3', start_time: '09:45', end_time: '10:30', slot_type: 'CLASS' },
  { period_num: 5, name: 'Period 4', start_time: '10:30', end_time: '11:15', slot_type: 'CLASS' },
  { period_num: 6, name: 'Lunch Break', start_time: '11:15', end_time: '12:00', slot_type: 'LUNCH' },
  { period_num: 7, name: 'Period 5', start_time: '12:00', end_time: '12:45', slot_type: 'CLASS' },
  { period_num: 8, name: 'Period 6', start_time: '12:45', end_time: '13:30', slot_type: 'CLASS' },
];

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SmartTimetablePage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const [activeTab, setActiveTab] = useState<'automate' | 'manual' | 'grid'>('grid');

  // Dropdown data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  // Selected filters
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // Slot Config & Grid State
  const [slotConfig, setSlotConfig] = useState<TimeSlotConfig>({
    working_days: DEFAULT_DAYS,
    period_slots: DEFAULT_SLOTS,
  });
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [gridData, setGridData] = useState<GridCell[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [teacherClashes, setTeacherClashes] = useState<Record<string, TeacherClash[]>>({});
  const [activeCell, setActiveCell] = useState<{ period_num: number; day: string } | null>(null);

  // Clone Modal
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');

  const getHeaders = () => {
    const authStr = localStorage.getItem('school_auth');
    if (!authStr) return { 'Content-Type': 'application/json' };
    const auth = JSON.parse(authStr);
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.access_token}`,
    };
  };

  // 1. Initial Load: Classes, Teachers, Subjects
  useEffect(() => {
    if (!slug) return;
    const fetchInitialData = async () => {
      try {
        const headers = getHeaders();
        const [resClasses, resTeachers, resSubjects] = await Promise.all([
          fetch(`https://weaischool-backend.onrender.com/api/v1/classes?slug=${slug}`, { headers }),
          fetch(`https://weaischool-backend.onrender.com/api/v1/staff?slug=${slug}&role=TEACHER`, { headers }),
          fetch(`https://weaischool-backend.onrender.com/api/v1/subjects?slug=${slug}`, { headers }),
        ]);

        if (resClasses.ok) {
          const data = await resClasses.json();
          setClasses(data);
          if (data.length > 0) setSelectedClassId(data[0].id);
        }
        if (resTeachers.ok) setTeachers(await resTeachers.json());
        if (resSubjects.ok) setSubjects(await resSubjects.json());
      } catch (err) {
        console.error('Error loading initial timetable data:', err);
      }
    };
    fetchInitialData();
  }, [slug]);

  // 2. Load Sections when Class changes
  useEffect(() => {
    if (!selectedClassId || !slug) return;
    const fetchSections = async () => {
      try {
        const res = await fetch(`https://weaischool-backend.onrender.com/api/v1/classes/${selectedClassId}/sections`, {
          headers: getHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setSections(data);
          if (data.length > 0) setSelectedSectionId(data[0].id);
          else setSelectedSectionId('');
        }
      } catch (err) {
        console.error('Error loading sections:', err);
      }
    };
    fetchSections();
  }, [selectedClassId, slug]);

  // 3. Load Slot Config and Grid Entries when Class/Section changes
  const fetchGridAndConfig = async () => {
    if (!selectedClassId || !selectedSectionId) return;
    setLoadingGrid(true);
    try {
      const headers = getHeaders();

      // Fetch Time Config
      const resConfig = await fetch(
        `https://weaischool-backend.onrender.com/api/v1/timetable-grid/config?class_id=${selectedClassId}&section_id=${selectedSectionId}`,
        { headers }
      );
      if (resConfig.ok) {
        const cfgData = await resConfig.json();
        if (cfgData && cfgData.period_slots && cfgData.period_slots.length > 0) {
          setSlotConfig({
            working_days: cfgData.working_days || DEFAULT_DAYS,
            period_slots: cfgData.period_slots,
          });
        }
      }

      // Fetch Grid Entries
      const resEntries = await fetch(
        `https://weaischool-backend.onrender.com/api/v1/timetable-grid/entries?class_id=${selectedClassId}&section_id=${selectedSectionId}`,
        { headers }
      );
      if (resEntries.ok) {
        const entriesData = await resEntries.json();
        setGridData(entriesData);
      }

      // Check teacher clashes across school
      fetchTeacherClashes();
    } catch (err) {
      console.error('Error loading timetable grid:', err);
    } finally {
      setLoadingGrid(false);
    }
  };

  useEffect(() => {
    if (selectedClassId && selectedSectionId) {
      fetchGridAndConfig();
    }
  }, [selectedClassId, selectedSectionId]);

  const fetchTeacherClashes = async () => {
    try {
      const res = await fetch(`https://weaischool-backend.onrender.com/api/v1/timetable-grid/check-clash`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const clashesData = await res.json();
        setTeacherClashes(clashesData);
      }
    } catch (err) {
      console.error('Error checking clashes:', err);
    }
  };

  // Cell Update Helper
  const handleCellUpdate = (periodNum: number, day: string, field: keyof GridCell, value: string) => {
    setGridData((prev) => {
      const existingIdx = prev.findIndex((c) => c.period_num === periodNum && c.day === day);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const updatedCell = { ...updated[existingIdx], [field]: value };

        if (field === 'teacher_id') {
          const t = teachers.find((tch) => tch.id === value);
          updatedCell.teacher_name = t ? t.full_name : '';
        }
        updated[existingIdx] = updatedCell;
        return updated;
      } else {
        const newCell: GridCell = {
          period_num: periodNum,
          day,
          [field]: value,
        };
        if (field === 'teacher_id') {
          const t = teachers.find((tch) => tch.id === value);
          newCell.teacher_name = t ? t.full_name : '';
        }
        return [...prev, newCell];
      }
    });
  };

  // Drag and Drop Grid Handlers
  const handleDragStart = (e: React.DragEvent, periodNum: number, day: string) => {
    const cell = gridData.find((c) => c.period_num === periodNum && c.day === day);
    if (!cell || (!cell.subject_name && !cell.teacher_id)) return;
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        sourcePeriod: periodNum,
        sourceDay: day,
        cell,
      })
    );
  };

  const handleDrop = (e: React.DragEvent, targetPeriod: number, targetDay: string) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const data = JSON.parse(raw);
      const { sourcePeriod, sourceDay, cell } = data;

      if (sourcePeriod === targetPeriod && sourceDay === targetDay) return;

      setGridData((prev) => {
        const targetCell = prev.find((c) => c.period_num === targetPeriod && c.day === targetDay);
        const nextGrid = prev.filter(
          (c) => !(c.period_num === sourcePeriod && c.day === sourceDay) && !(c.period_num === targetPeriod && c.day === targetDay)
        );

        // Move source to target
        nextGrid.push({
          period_num: targetPeriod,
          day: targetDay,
          teacher_id: cell.teacher_id,
          teacher_name: cell.teacher_name,
          subject_name: cell.subject_name,
          room_no: cell.room_no,
        });

        // Swap target to source if exists
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
    } catch (err) {
      console.error('Invalid drag payload:', err);
    }
  };

  // Save Grid to Backend
  const handleSaveGrid = async () => {
    if (!selectedClassId || !selectedSectionId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        class_id: selectedClassId,
        section_id: selectedSectionId,
        entries: gridData,
      };
      const res = await fetch(`https://weaischool-backend.onrender.com/api/v1/timetable-grid/entries/bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveMsg({ type: 'success', text: 'Timetable grid saved successfully!' });
        fetchTeacherClashes();
      } else {
        const errData = await res.json();
        setSaveMsg({ type: 'error', text: errData.detail || 'Failed to save timetable grid' });
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Network error saving timetable' });
    } finally {
      setSaving(false);
    }
  };

  // Save Slot Config
  const handleSaveConfig = async () => {
    if (!selectedClassId || !selectedSectionId) return;
    setIsSavingConfig(true);
    try {
      const payload = {
        class_id: selectedClassId,
        section_id: selectedSectionId,
        working_days: slotConfig.working_days,
        period_slots: slotConfig.period_slots,
      };
      const res = await fetch(`https://weaischool-backend.onrender.com/api/v1/timetable-grid/config`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsConfigModalOpen(false);
        fetchGridAndConfig();
      }
    } catch (err) {
      console.error('Error saving slot config:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Clone Grid
  const handleCloneGrid = async () => {
    if (!selectedClassId || !selectedSectionId || !targetClassId || !targetSectionId) return;
    try {
      const res = await fetch(
        `https://weaischool-backend.onrender.com/api/v1/timetable-grid/clone?source_class_id=${selectedClassId}&source_section_id=${selectedSectionId}&target_class_id=${targetClassId}&target_section_id=${targetSectionId}`,
        {
          method: 'POST',
          headers: getHeaders(),
        }
      );
      if (res.ok) {
        setIsCloneModalOpen(false);
        alert('Grid cloned successfully!');
      }
    } catch (err) {
      console.error('Clone grid failed:', err);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-indigo-600" />
            Smart Timetable Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build, automate, and resolve clashes in real-time across your school schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <Clock className="w-4 h-4 text-slate-600" />
            Configure Time Slots
          </button>

          <button
            onClick={handleSaveGrid}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Grid
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 pt-3 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveTab('grid')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'grid'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Interactive Grid Builder (Tab 3)
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'manual'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          Teacher Workload Allocator
        </button>
        <button
          onClick={() => setActiveTab('automate')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'automate'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          AI Auto-Generator
        </button>
      </div>

      {/* Class & Section Selectors */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Select Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Select Section</label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.section_name}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setIsCloneModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <Copy className="w-3.5 h-3.5" />
            Clone to another Section
          </button>
          <button
            onClick={() => setGridData([])}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Grid
          </button>
        </div>
      </div>

      {/* Save Notification Toast */}
      {saveMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            saveMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {saveMsg.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          {saveMsg.text}
        </div>
      )}

      {/* TAB 3 CONTENT: Smart Drag & Drop Timetable Grid Builder */}
      {activeTab === 'grid' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loadingGrid ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="font-medium text-sm">Loading timetable grid...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 text-left border-r border-slate-200 w-44">Time / Period</th>
                    {slotConfig.working_days.map((day) => (
                      <th key={day} className="p-4 text-center border-r border-slate-200 min-w-[160px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {slotConfig.period_slots.map((slot) => {
                    const isBreakOrLunch = slot.slot_type !== 'CLASS';

                    return (
                      <tr key={slot.period_num} className={isBreakOrLunch ? 'bg-amber-50/50' : 'hover:bg-slate-50/50 transition'}>
                        {/* Time Column */}
                        <td className="p-4 border-r border-slate-200 bg-slate-50/80">
                          <div className="font-bold text-sm text-slate-900">{slot.name}</div>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {slot.start_time} - {slot.end_time}
                          </div>
                          {isBreakOrLunch && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-800 rounded">
                              {slot.slot_type}
                            </span>
                          )}
                        </td>

                        {/* Days Cells */}
                        {slotConfig.working_days.map((day) => {
                          if (isBreakOrLunch) {
                            return (
                              <td key={`${day}-${slot.period_num}`} className="p-3 text-center border-r border-slate-200 text-xs font-semibold text-amber-700 italic bg-amber-50/30">
                                {slot.name}
                              </td>
                            );
                          }

                          const cell = gridData.find((c) => c.period_num === slot.period_num && c.day === day) || {
                            period_num: slot.period_num,
                            day,
                          };

                          // Check if teacher assigned here has a clash elsewhere
                          const teacherClashList = cell.teacher_id ? teacherClashes[cell.teacher_id] : null;
                          const hasClash = teacherClashList && teacherClashList.some((cl) => cl.period_num === slot.period_num && cl.day === day);

                          return (
                            <td
                              key={`${day}-${slot.period_num}`}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDrop(e, slot.period_num, day)}
                              className={`p-2.5 border-r border-slate-200 relative transition ${
                                hasClash ? 'bg-rose-50/80 border-rose-300' : 'hover:bg-indigo-50/30'
                              }`}
                            >
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, slot.period_num, day)}
                                className="space-y-2 cursor-grab active:cursor-grabbing"
                              >
                                {/* Subject Selector */}
                                <select
                                  value={cell.subject_name || ''}
                                  onChange={(e) => handleCellUpdate(slot.period_num, day, 'subject_name', e.target.value)}
                                  className="w-full text-xs font-semibold px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="">-- Subject --</option>
                                  {subjects.map((sub) => (
                                    <option key={sub.id} value={sub.subject_name}>
                                      {sub.subject_name}
                                    </option>
                                  ))}
                                </select>

                                {/* Teacher Selector */}
                                <select
                                  value={cell.teacher_id || ''}
                                  onChange={(e) => handleCellUpdate(slot.period_num, day, 'teacher_id', e.target.value)}
                                  className={`w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 ${
                                    hasClash
                                      ? 'bg-rose-100 border-rose-400 font-bold text-rose-900 focus:ring-rose-500'
                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <option value="">-- Teacher --</option>
                                  {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.full_name}
                                    </option>
                                  ))}
                                </select>

                                {/* Clash Alert Badge */}
                                {hasClash && (
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 p-1 rounded">
                                    <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0" />
                                    <span>Teacher Busy Elsewhere!</span>
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

      {/* TAB 1 & 2 Placeholders */}
      {activeTab === 'automate' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">AI Automatic Timetable Engine</h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">
            Auto-generate optimal zero-clash schedules using constraint logic programming and teacher preferences.
          </p>
          <button className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow transition">
            Run AI Auto-Scheduler
          </button>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <Settings className="w-12 h-12 text-indigo-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Teacher Workload & Assignment Matrix</h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">
            Manage teacher period limits per week and subject assignments.
          </p>
          <div className="max-w-xs mx-auto text-left">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Select Teacher</label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full p-2 text-sm border border-slate-300 rounded-lg"
            >
              <option value="">-- Choose Teacher --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* TIME SLOTS CONFIGURATION MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Configure Time Slots & Working Days
              </h3>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Period Slots</h4>
                <div className="space-y-3">
                  {slotConfig.period_slots.map((slot, idx) => (
                    <div key={slot.period_num} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="w-7 h-7 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
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
                        className="flex-1 text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
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
                        className="text-xs px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />

                      <span className="text-slate-400 text-xs">to</span>

                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => {
                          const updated = [...slotConfig.period_slots];
                          updated[idx].end_time = e.target.value;
                          setSlotConfig({ ...slotConfig, period_slots: updated });
                        }}
                        className="text-xs px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />

                      <select
                        value={slot.slot_type}
                        onChange={(e) => {
                          const updated = [...slotConfig.period_slots];
                          updated[idx].slot_type = e.target.value as 'CLASS' | 'BREAK' | 'LUNCH';
                          setSlotConfig({ ...slotConfig, period_slots: updated });
                        }}
                        className="text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
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
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
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
                          start_time: '13:30',
                          end_time: '14:15',
                          slot_type: 'CLASS',
                        },
                      ],
                    });
                  }}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Period Slot
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-2"
              >
                {isSavingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLONE GRID MODAL */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <Copy className="w-5 h-5 text-indigo-600" />
              Clone Grid to Another Section
            </h3>
            <p className="text-xs text-slate-500">
              Copy current class timetable grid and time slot structure to another target class/section.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Target Class</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                >
                  <option value="">-- Choose Target Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Target Section</label>
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                >
                  <option value="">-- Choose Target Section --</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.section_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsCloneModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCloneGrid}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow"
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