// ============================================================
// WEAISCHOOL TEC — Top Header Bar
// User info + Logout button (Fixed for Base UI)
// ============================================================

"use client";

import { useRouter } from "next/navigation";
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
  const { user, logout } = useAuthStore();

  // Logout handler
  const handleLogout = async () => {
    try {
      await authApi.logout();
      toast.success("Logout successful", {
        description: "See you soon! 👋",
      });
    } catch {
      // Error ignore karo — logout anyway
    } finally {
      logout();
      router.push("/login");
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
      {/* Left — Welcome text */}
      <div>
        <p className="text-slate-400 text-sm">
          Welcome back,{" "}
          <span className="text-white font-medium">
            {user?.full_name || "Super Admin"}
          </span>
        </p>
      </div>

      {/* Right — User Menu */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          {/* IMPORTANT: No asChild, no Button inside! */}
          <DropdownMenuTrigger className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 h-9 px-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="bg-blue-600 text-white text-xs">
                {user?.full_name ? getInitials(user.full_name) : "SA"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm hidden sm:block">
              {user?.full_name || "Super Admin"}
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
                Role: {user?.role || "SUPER_ADMIN"}
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