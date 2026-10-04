// ============================================================
// WEAISCHOOL TEC — Super Admin Login Page
// Sirf super admin login kar sakta hai yahan
// Email + Password authentication
// ============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  School,
  Loader2,
  Shield,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─── VALIDATION SCHEMA ──────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email zaroori hai")
    .email("Valid email daalo (e.g., admin@weaischool.com)"),
  password: z
    .string()
    .min(1, "Password zaroori hai")
    .min(6, "Password kam se kam 6 characters ka ho"),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── LOGIN PAGE COMPONENT ───────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@weaischool.com",
      password: "",
    },
  });

  // ── Quick Fill (Dev Convenience) ─────────────────────────
  const fillDevCredentials = () => {
    setValue("email", "admin@weaischool.com");
    setValue("password", "SuperAdmin@2026!");
    toast.info("Dev credentials filled", {
      description: "Ab Login button dabao",
      duration: 2000,
    });
  };

  // ── Form Submit Handler ──────────────────────────────────
  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    try {
      const response = await authApi.login(data.email, data.password);
      const { access_token, refresh_token, user } = response.data;

      // Check karo — sirf SUPER_ADMIN login kar sake
      if (user.role !== "SUPER_ADMIN") {
        setError(
          `Access denied. Ye panel sirf Super Admin ke liye hai. Aapka role: ${user.role}`
        );
        toast.error("Access Denied", {
          description: "Ye panel sirf Super Admin ke liye hai",
        });
        return;
      }

      // Tokens aur user save karo
      setTokens(access_token, refresh_token);
      setUser(user);

      // Success toast
      toast.success(`Welcome back, ${user.full_name || "Admin"}! 👋`, {
        description: "Redirecting to dashboard...",
        duration: 2000,
      });

      // Dashboard pe redirect karo
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (err: unknown) {
      // Error handle karo
      const axiosError = err as {
        response?: {
          data?: {
            detail?: string;
            error?: { message?: string; code?: string };
          };
          status?: number;
        };
        code?: string;
        message?: string;
      };

      let errorMessage = "Kuch gadbad hua. Please try again.";

      // Network error (backend down)
      if (
        axiosError.code === "ERR_NETWORK" ||
        axiosError.message?.includes("Network Error")
      ) {
        errorMessage =
          "Server se connection nahi ho paa raha. Check karo backend chalu hai ya nahi.";
      }
      // Specific status codes
      else if (axiosError.response?.status === 401) {
        errorMessage = "Email ya password galat hai";
      } else if (axiosError.response?.status === 429) {
        errorMessage = "Bahut zyada tries. 15 minute baad try karo.";
      } else if (axiosError.response?.status === 403) {
        errorMessage = "Account suspended ya locked hai. Admin se contact karo.";
      } else if (axiosError.response?.status === 404) {
        errorMessage = "API endpoint nahi mila. Backend properly setup hai?";
      } else if (axiosError.response?.status === 500) {
        errorMessage = "Server error. Backend logs check karo.";
      }
      // Backend error message
      else if (axiosError.response?.data?.error?.message) {
        errorMessage = axiosError.response.data.error.message;
      } else if (axiosError.response?.data?.detail) {
        errorMessage = axiosError.response.data.detail;
      }

      setError(errorMessage);
      toast.error("Login Failed", {
        description: errorMessage,
      });
    }
  };

  // ── UI ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative w-full max-w-md z-10">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 mb-4 shadow-2xl shadow-blue-600/40 ring-4 ring-blue-500/10">
            <School className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            WeAISchool
          </h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            School Management Platform
            <Sparkles className="w-3 h-3" />
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">
                  Super Admin Login
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs mt-0.5">
                  Platform management panel — restricted access
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <Alert
                  variant="destructive"
                  className="bg-red-950/50 border-red-900 text-red-200"
                >
                  <AlertDescription className="text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-slate-300 text-sm flex items-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@weaischool.com"
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-11"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <span>⚠️</span> {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-slate-300 text-sm flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-10 h-11"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <span>⚠️</span> {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold h-11 shadow-lg shadow-blue-600/20 transition-all duration-200"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Login to Admin Panel
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-900 px-2 text-slate-500">
                    Development Mode
                  </span>
                </div>
              </div>

              {/* Dev Quick Fill Button */}
              <button
                type="button"
                onClick={fillDevCredentials}
                className="w-full text-center text-xs text-slate-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-slate-800/50"
              >
                <Sparkles className="w-3 h-3" />
                Quick Fill Dev Credentials
              </button>

              {/* Credentials Info Box */}
              <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3 space-y-1">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">
                  Dev Credentials
                </p>
                <div className="space-y-0.5 font-mono text-xs">
                  <p className="text-slate-400">
                    <span className="text-slate-600">Email:</span>{" "}
                    admin@weaischool.com
                  </p>
                  <p className="text-slate-400">
                    <span className="text-slate-600">Pass:</span>{" "}
                    SuperAdmin@2026!
                  </p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-slate-600 text-xs">
            © 2026 WeAISchool Tec. All rights reserved.
          </p>
          <p className="text-slate-700 text-[10px] flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            System operational
          </p>
        </div>
      </div>
    </div>
  );
}