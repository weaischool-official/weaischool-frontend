"use client";

import { Settings, Info } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm">Platform configuration</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <Info className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Settings page coming soon...</p>
        <p className="text-slate-600 text-sm mt-1">
          Phase 10 mein add hoga
        </p>
      </div>
    </div>
  );
}