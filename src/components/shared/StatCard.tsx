// Dashboard pe stats cards ke liye

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  color?: "blue" | "green" | "purple" | "orange" | "red";
}

const colorMap = {
  blue: {
    bg: "bg-blue-500/10",
    icon: "text-blue-400",
    badge: "bg-blue-500/10 text-blue-400",
  },
  green: {
    bg: "bg-green-500/10",
    icon: "text-green-400",
    badge: "bg-green-500/10 text-green-400",
  },
  purple: {
    bg: "bg-purple-500/10",
    icon: "text-purple-400",
    badge: "bg-purple-500/10 text-purple-400",
  },
  orange: {
    bg: "bg-orange-500/10",
    icon: "text-orange-400",
    badge: "bg-orange-500/10 text-orange-400",
  },
  red: {
    bg: "bg-red-500/10",
    icon: "text-red-400",
    badge: "bg-red-500/10 text-red-400",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
          )}
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full text-xs font-medium",
                colors.badge
              )}
            >
              <span>{trend.positive ? "↑" : "↓"}</span>
              <span>{trend.value}%</span>
              <span className="text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>

        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colors.bg)}>
          <Icon className={cn("w-6 h-6", colors.icon)} />
        </div>
      </div>
    </div>
  );
}