"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { School, Lock, Mail, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

export default function SchoolLoginPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.slug as string) || "ppps";

  const { setTokens, setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      // 1. Call login API with dynamic school slug
      const res = await authApi.login(email.trim(), password, slug);
      const data = res.data;

      const token = data.access_token || data.token;
      const user = data.user;

      if (!token) {
        toast.error("Access token not returned from server");
        setLoading(false);
        return;
      }

      // 2. Clear previous stale sessions completely
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        localStorage.removeItem("userToken");
        localStorage.setItem(`tenant_id_${slug}`, user?.tenant_id || "");
        localStorage.setItem("tenant_id", user?.tenant_id || "");
      }

      // 3. Save new 30-day token to AuthStore & LocalStorage
      setTokens(token, data.refresh_token || "");
      if (user) {
        setUser(user);
      }

      toast.success("Login successful! Welcome back.");
      router.replace(`/school/${slug}/dashboard`);
    } catch (err: any) {
      console.error("[School Login Error]", err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Invalid email or password";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-2xl mb-4">
            <School className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white capitalize mb-1">
            {slug.replace(/-/g, " ")}
          </h1>
          <p className="text-sm text-slate-400">School Admin Panel Login</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                placeholder="admin@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white focus:border-blue-500"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition-all gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Login to School Panel
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          WeAISchool Tec SaaS Platform • Multi-Tenant Secure
        </div>
      </div>
    </div>
  );
}