"use client";

import Link from "next/link";
import { CheckCircle2, AlertCircle, XCircle, Clock, Eye } from "lucide-react";
import {
  getUdiseCompliance,
  getInitials,
  getAvatarColor,
  type StudentData,
} from "@/lib/studentHelpers";

interface UdiseStudentGridProps {
  students: Array<{
    id: string;
    admission_number: string;
    first_name: string;
    last_name: string | null;
    full_name: string;
    photo_url: string | null;
    [key: string]: unknown;
  }>;
  slug: string;
}

export default function UdiseStudentGrid({
  students,
  slug,
}: UdiseStudentGridProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                Student
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                Admission #
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase">
                UDISE %
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase">
                Basic
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase">
                Family
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase">
                Category
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase">
                Address
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase">
                Academic
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase">
                Issues
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const compliance = getUdiseCompliance(student as StudentData);
              return (
                <tr
                  key={student.id}
                  className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {student.photo_url ? (
                        <img
                          src={student.photo_url}
                          alt={student.full_name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs ${getAvatarColor(
                            student.full_name
                          )}`}
                        >
                          {getInitials(student.full_name)}
                        </div>
                      )}
                      <p className="font-semibold text-white text-sm">
                        {student.full_name}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400 font-mono">
                      {student.admission_number}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-center">
                    <span
                      className={`text-sm font-bold ${
                        compliance.percentage >= 90
                          ? "text-green-400"
                          : compliance.percentage >= 70
                          ? "text-blue-400"
                          : compliance.percentage >= 40
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {compliance.percentage}%
                    </span>
                  </td>

                  {compliance.categoryResults.map((cat) => (
                    <td key={cat.categoryId} className="px-3 py-3 text-center">
                      <CategoryDot percentage={cat.percentage} />
                    </td>
                  ))}

                  <td className="px-3 py-3 text-center">
                    {compliance.validationErrors.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {compliance.validationErrors.length}
                      </span>
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/school/${slug}/students/${student.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryDot({ percentage }: { percentage: number }) {
  if (percentage >= 90) {
    return <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />;
  }
  if (percentage >= 70) {
    return <div className="w-3 h-3 rounded-full bg-blue-400 mx-auto" />;
  }
  if (percentage >= 40) {
    return <Clock className="w-4 h-4 text-yellow-400 mx-auto" />;
  }
  return <XCircle className="w-4 h-4 text-red-400 mx-auto" />;
}