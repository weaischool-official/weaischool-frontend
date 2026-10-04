"use client";

import { CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";
import { getCompletenessColor } from "@/lib/studentHelpers";

interface ComplianceBadgeProps {
  percentage: number;
  showLabel?: boolean;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function ComplianceBadge({
  percentage,
  showLabel = true,
  showIcon = true,
  size = "md",
}: ComplianceBadgeProps) {
  const color = getCompletenessColor(percentage);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2",
  };

  const iconSize = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const Icon =
    percentage >= 90
      ? CheckCircle2
      : percentage >= 70
      ? AlertCircle
      : percentage >= 40
      ? Clock
      : XCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${color.bg} ${color.text} ${color.border} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon className={iconSize[size]} />}
      <span>{percentage}%</span>
      {showLabel && <span className="hidden sm:inline">{color.label}</span>}
    </span>
  );
}