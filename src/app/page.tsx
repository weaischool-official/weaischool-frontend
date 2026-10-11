"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user has an active session in localStorage
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("userToken");

    const hasToken = Boolean(
      token && token !== "undefined" && token !== "null" && token.length > 10
    );

    if (hasToken) {
      // Valid session found -> send directly to Dashboard!
      router.replace("/dashboard");
    } else {
      // No session -> send to Login
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-400">Loading WeAISchool...</p>
      </div>
    </div>
  );
}