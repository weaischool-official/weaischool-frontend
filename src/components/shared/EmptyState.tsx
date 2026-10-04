// Jab koi data na ho tab dikhane ke liye

import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
        <Icon className="w-8 h-8 text-slate-500" />
      </div>
      <div className="text-center">
        <h3 className="text-white font-semibold">{title}</h3>
        <p className="text-slate-400 text-sm mt-1 max-w-xs">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}