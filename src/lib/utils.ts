// ============================================================
// WEAISCHOOL TEC — Utility Functions
// Helper functions jo poore app mein use hongi
// ============================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PlanType, TenantStatus } from "@/types";

// Shadcn UI ka cn utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── DATE HELPERS ───────────────────────────────────────────

// ISO date ko readable format mein
export function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Relative time (2 hours ago, 3 days ago)
export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days < 30) return `${days} days ago`;
  return formatDate(dateString);
}

// ─── PLAN HELPERS ───────────────────────────────────────────

// Plan ke according color
export function getPlanColor(plan: PlanType): string {
  const colors: Record<PlanType, string> = {
    TRIAL: "bg-yellow-100 text-yellow-800",
    STARTER: "bg-blue-100 text-blue-800",
    GROWTH: "bg-purple-100 text-purple-800",
    ENTERPRISE: "bg-green-100 text-green-800",
  };
  return colors[plan] || "bg-gray-100 text-gray-800";
}

// Plan ki display name
export function getPlanLabel(plan: PlanType): string {
  const labels: Record<PlanType, string> = {
    TRIAL: "Free Trial",
    STARTER: "Starter ₹4,999",
    GROWTH: "Growth ₹9,999",
    ENTERPRISE: "Enterprise ₹49,999",
  };
  return labels[plan] || plan;
}

// ─── STATUS HELPERS ─────────────────────────────────────────

// Status ke according color
export function getStatusColor(status: TenantStatus): string {
  const colors: Record<TenantStatus, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    TRIAL: "bg-yellow-100 text-yellow-800",
    SUSPENDED: "bg-red-100 text-red-800",
    EXPIRED: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

// ─── NUMBER HELPERS ─────────────────────────────────────────

// Indian number format (1,23,456)
export function formatIndianNumber(num: number): string {
  return num.toLocaleString("en-IN");
}

// Currency format (₹4,999)
export function formatCurrency(amount: number): string {
  return `₹${formatIndianNumber(amount)}`;
}

// ─── STRING HELPERS ─────────────────────────────────────────

// Initials from name (Raj Kumar → RK)
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Slug generate karo (St. Mary's School → st-marys-school)
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}