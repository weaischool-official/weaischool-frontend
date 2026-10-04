// Loading state ke liye

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({
  size = "md",
  message,
  fullPage = false,
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  if (fullPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className={cn("text-blue-400 animate-spin", sizeMap[size])} />
        {message && <p className="text-slate-400 text-sm">{message}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Loader2 className={cn("text-blue-400 animate-spin", sizeMap[size])} />
      {message && <span className="text-slate-400 text-sm">{message}</span>}
    </div>
  );
}