"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { classApi, sectionApi, academicYearApi } from "@/lib/api";
import { BookOpen, Users, Loader2, AlertCircle, ChevronDown } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ClassItem {
  id: string;
  name: string;
  numeric_level?: number;
  class_level?: number;
  total_sections?: number;
  total_students?: number;
}

interface SectionItem {
  id: string;
  name: string;
  max_students: number;
  current_strength: number;
}

interface AcademicYear {
  id: string;
  name: string;
  is_current?: boolean;
  is_active?: boolean;
}

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface ClassSectionSelectorProps {
  selectedClassId: string;
  selectedSectionId: string;
  onClassChange: (classId: string, className: string) => void;
  onSectionChange: (sectionId: string, sectionName: string) => void;
  showStudentCount?: boolean;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ClassSectionSelector({
  selectedClassId,
  selectedSectionId,
  onClassChange,
  onSectionChange,
  showStudentCount = true,
}: ClassSectionSelectorProps) {
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  // ── Fetch academic years ──
  const { data: yearsData } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearApi.list().then((r) => r.data),
  });

  const academicYears: AcademicYear[] = Array.isArray(yearsData)
    ? yearsData
    : yearsData?.items || [];

  const currentYear =
    academicYears.find((y) => y.is_current || y.is_active) ||
    academicYears[0];

  // ── Fetch classes ──
  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ["classes", currentYear?.id],
    queryFn: () => classApi.list(currentYear?.id).then((r) => r.data),
    enabled: !!currentYear?.id,
  });

  const classes: ClassItem[] = Array.isArray(classesData)
    ? classesData
    : classesData?.items || [];

  const sortedClasses = [...classes].sort((a, b) => {
    const aL = a.numeric_level ?? a.class_level ?? 0;
    const bL = b.numeric_level ?? b.class_level ?? 0;
    return aL - bL;
  });

  // ── Fetch sections for selected class ──
  const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections", selectedClassId],
    queryFn: () =>
      sectionApi.listByClass(selectedClassId).then((r) => r.data),
    enabled: !!selectedClassId,
  });

  const sections: SectionItem[] = Array.isArray(sectionsData)
    ? sectionsData
    : sectionsData?.items || [];

  // ── Update selectedClass when classes load or ID changes ──
  useEffect(() => {
    if (selectedClassId && sortedClasses.length > 0) {
      const cls = sortedClasses.find((c) => c.id === selectedClassId);
      if (cls) setSelectedClass(cls);
    }
  }, [selectedClassId, sortedClasses]);

  // ── Auto-clear section if class changes ──
  useEffect(() => {
    if (
      selectedSectionId &&
      selectedClassId &&
      sections.length > 0 &&
      !sections.find((s) => s.id === selectedSectionId)
    ) {
      onSectionChange("", "");
    }
  }, [selectedClassId, sections, selectedSectionId, onSectionChange]);

  const hasSections = sections.length > 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── CLASS DROPDOWN ── */}
        <div>
          <label className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            Select Class <span className="text-red-400">*</span>
          </label>
          {classesLoading ? (
            <div className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading classes...
            </div>
          ) : sortedClasses.length === 0 ? (
            <div className="w-full px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
              No classes found. Create classes first.
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => {
                  const cls = sortedClasses.find((c) => c.id === e.target.value);
                  onClassChange(e.target.value, cls?.name || "");
                }}
                className="w-full px-4 py-3 pr-10 bg-gray-800 border border-gray-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">-- Choose Class --</option>
                {sortedClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                    {showStudentCount && cls.total_students !== undefined
                      ? ` (${cls.total_students} students)`
                      : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* ── SECTION DROPDOWN ── */}
        <div>
          <label className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Select Section
            {selectedClassId && hasSections && (
              <span className="text-xs text-gray-500 font-normal">
                (Optional)
              </span>
            )}
          </label>

          {!selectedClassId ? (
            <div className="w-full px-4 py-3 bg-gray-800/50 border border-gray-800 rounded-xl text-gray-600 text-sm italic">
              Select a class first
            </div>
          ) : sectionsLoading ? (
            <div className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading sections...
            </div>
          ) : !hasSections ? (
            <div className="w-full px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>No sections — showing all students of this class</span>
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedSectionId}
                onChange={(e) => {
                  const sec = sections.find((s) => s.id === e.target.value);
                  onSectionChange(e.target.value, sec?.name || "");
                }}
                className="w-full px-4 py-3 pr-10 bg-gray-800 border border-gray-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name} ({sec.current_strength}/{sec.max_students})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      {selectedClassId && selectedClass && (
        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-gray-400">
            <span>
              📚 <span className="text-white font-semibold">{selectedClass.name}</span>
            </span>
            {hasSections && selectedSectionId && (
              <span>
                📖 Section{" "}
                <span className="text-white font-semibold">
                  {sections.find((s) => s.id === selectedSectionId)?.name}
                </span>
              </span>
            )}
            {hasSections && !selectedSectionId && (
              <span className="text-blue-400">All sections</span>
            )}
            {!hasSections && (
              <span className="text-yellow-400">Direct class (no sections)</span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {sections.length > 0
              ? `${sections.length} sections available`
              : "No sections in this class"}
          </div>
        </div>
      )}
    </div>
  );
}