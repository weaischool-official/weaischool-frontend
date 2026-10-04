"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Megaphone,
  AlertCircle,
  Calendar,
  Users,
  X,
  Clock,
  Send,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Notice {
  id: string;
  title: string;
  content: string;
  notice_type: "general" | "urgent" | "event" | "holiday";
  audience: "all" | "staff" | "students" | "parents";
  publish_date: string;
  created_at: string;
  creator_name: string;
}

export default function NoticesPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noticeType, setNoticeType] = useState("general");
  const [audience, setAudience] = useState("all");

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notices/");
      setNotices(res.data?.items || []);
    } catch (error) {
      console.error("Failed to fetch notices:", error);
      toast.error("Failed to load notices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [slug]);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and message content are required.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/notices/", {
        title: title.trim(),
        content: content.trim(),
        notice_type: noticeType,
        audience,
      });

      toast.success("Notice broadcasted successfully!");
      setIsModalOpen(false);
      setTitle("");
      setContent("");
      setNoticeType("general");
      setAudience("all");
      await fetchNotices();
    } catch (error: any) {
      console.error("Failed to create notice:", error);
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error?.message ||
        "Failed to send notice";
      toast.error(typeof detail === "string" ? detail : "Failed to send notice");
    } finally {
      setSubmitting(false);
    }
  };

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <AlertCircle className="w-4 h-4" />;
      case "event":
        return <Calendar className="w-4 h-4" />;
      case "holiday":
        return <Clock className="w-4 h-4" />;
      default:
        return <Megaphone className="w-4 h-4" />;
    }
  };

  const getNoticeBadgeClass = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "event":
        return "bg-violet-500/15 text-violet-400 border-violet-500/30";
      case "holiday":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/25">
            <Bell className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              Communications
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Broadcast notices & events to staff, parents, and students
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Message
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
        </div>
      ) : notices.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm px-6 py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <Megaphone className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">No notices yet</h3>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            Send your first school announcement. Teachers and parents will see it on their apps.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="w-4 h-4" />
            Create Notice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="group flex flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/20 hover:border-indigo-500/40 hover:bg-slate-900 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getNoticeBadgeClass(
                    notice.notice_type
                  )}`}
                >
                  {getNoticeIcon(notice.notice_type)}
                  {notice.notice_type}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[11px] font-medium text-slate-300">
                  <Users className="w-3 h-3" />
                  {notice.audience}
                </span>
              </div>

              <h3 className="text-base font-bold text-white leading-snug line-clamp-2 mb-2 group-hover:text-indigo-200 transition-colors">
                {notice.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 flex-1 mb-5">
                {notice.content}
              </p>

              <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-500">
                <span className="font-medium text-slate-400">{notice.creator_name || "Admin"}</span>
                <span>
                  {notice.publish_date
                    ? new Date(notice.publish_date).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !submitting && setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/50">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-transparent px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                  <Send className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Broadcast Message</h2>
                  <p className="text-xs text-slate-400">Send to school audience</p>
                </div>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNotice}>
              <div className="space-y-4 px-5 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Message Type
                    </label>
                    <select
                      value={noticeType}
                      onChange={(e) => setNoticeType(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="general">General Info</option>
                      <option value="urgent">Urgent Alert</option>
                      <option value="event">Event / Program</option>
                      <option value="holiday">Holiday Notice</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Send To
                    </label>
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="all">Everyone</option>
                      <option value="staff">Only Staff & Teachers</option>
                      <option value="parents">Only Parents</option>
                      <option value="students">Only Students</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Title / Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Staff meeting tomorrow at 9 AM"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Detailed Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write the full announcement..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-slate-900/50 px-5 py-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Broadcast
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}