// ============================================================
// WEAISCHOOL TEC — Top Header Bar
// User info + Smart Logout (School Panel aware)
// ============================================================

"use client";

import { useRouter, useParams } from "next/navigation";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

export function Header() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const { user, logout } = useAuthStore();

  // Smart Logout handler
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore API logout errors
    } finally {
      // 1. Wipe all local storage session tokens
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        localStorage.removeItem("userToken");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        localStorage.removeItem("weaischool-admin-auth");
      }

      // 2. Wipe AuthStore memory
      logout();

      toast.success("Logged out successfully");

      // 3. Dynamic Redirect
      if (slug) {
        router.replace(`/school/${slug}/login`);
      } else {
        router.replace("/login");
      }
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
      {/* Left — Welcome text */}
      <div>
        <p className="text-slate-400 text-sm">
          Welcome back,{" "}
          <span className="text-white font-medium">
            {user?.first_name || user?.full_name || "Admin"}
          </span>
        </p>
      </div>

      {/* Right — User Menu */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 h-9 px-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="bg-blue-600 text-white text-xs">
                {user?.first_name ? getInitials(user.first_name) : "A"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm hidden sm:block">
              {user?.first_name || user?.full_name || "Admin"}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 bg-slate-800 border-slate-700"
          >
            <DropdownMenuLabel className="text-slate-400">
              My Account
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-slate-700" />

            <div className="px-2 py-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-2 text-slate-300">
                <User className="w-3.5 h-3.5" />
                <span className="truncate">{user?.email}</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500 pl-5">
                Role: {user?.role || "ADMIN"}
              </p>
            </div>

            <DropdownMenuSeparator className="bg-slate-700" />

            <DropdownMenuItem
              className="text-red-400 focus:bg-red-900/30 focus:text-red-300 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}