"use client";

import React, { useState, useEffect } from "react";
import { MessageSquareWarning, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Complaint {
  id: string;
  category: string;
  subject: string;
  body: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  admin_reply: string;
  replied_at: string | null;
  created_at: string;
  student_name: string | null;
  class_section: string | null;
  raised_by: string | null;
}

const FILTERS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
];

const STATUS_CLASS: Record<string, string> = {
  OPEN: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  IN_PROGRESS: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export default function ComplaintsPage() {
  const [items, setItems] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/complaints/", { params: filter ? { status: filter } : {} });
      setItems(res.data?.data || []);
    } catch {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const update = async (c: Complaint, data: { status?: string; admin_reply?: string }) => {
    try {
      setSaving(c.id);
      const res = await api.patch(`/complaints/${c.id}`, data);
      setItems((list) => list.map((x) => (x.id === c.id ? { ...x, ...res.data.data } : x)));
      setDrafts((d) => ({ ...d, [c.id]: "" }));
      toast.success(data.admin_reply ? "Reply sent to parent" : "Status updated");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Could not update complaint");
    } finally {
      setSaving(null);
    }
  };

  const openCount = items.filter((c) => c.status === "OPEN").length;

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/25">
            <MessageSquareWarning className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">Complaints</h1>
            <p className="text-sm text-slate-400 mt-1">
              Raised by parents from the app{!filter && openCount ? ` · ${openCount} open` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-all ${
                filter === f.value
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-20 text-center">
          <h3 className="text-lg font-semibold text-white">No complaints</h3>
          <p className="mt-2 text-sm text-slate-400">Complaints parents send from the app will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((c) => (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase ${STATUS_CLASS[c.status] || ""}`}>
                  {c.status.replace("_", " ")}
                </span>
                <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[11px] text-slate-300">
                  {c.category}
                </span>
                <span className="text-xs text-slate-500 ml-auto">{fmt(c.created_at)}</span>
              </div>
              <h3 className="text-base font-bold text-white">{c.subject}</h3>
              <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{c.body}</p>
              <p className="text-xs text-slate-500 mt-2">
                Student: {c.student_name || "—"}
                {c.class_section ? ` (${c.class_section})` : ""} · From: {c.raised_by || "Parent"}
              </p>

              {c.admin_reply ? (
                <div className="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <p className="text-[11px] font-semibold text-emerald-400 uppercase">Your reply · {fmt(c.replied_at)}</p>
                  <p className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{c.admin_reply}</p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-col md:flex-row gap-2">
                <input
                  value={drafts[c.id] || ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                  placeholder={c.admin_reply ? "Update your reply…" : "Write a reply to the parent…"}
                  className="flex-1 rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  disabled={!drafts[c.id]?.trim() || saving === c.id}
                  onClick={() => update(c, { admin_reply: drafts[c.id].trim(), status: c.status === "OPEN" ? "IN_PROGRESS" : undefined })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                  {saving === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Reply
                </button>
                <select
                  value={c.status}
                  disabled={saving === c.id}
                  onChange={(e) => update(c, { status: e.target.value })}
                  className="rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
