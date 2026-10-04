// ============================================================
// WEAISCHOOL TEC — God Mode Page (PRODUCTION READY)
// Platform internals: DB, Redis, Files, Migrations, Audit Logs
// ============================================================

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Database,
  Shield,
  Activity,
  Server,
  Clock,
  AlertTriangle,
  RefreshCw,
  Play,
  Trash2,
  HardDrive,
  Cpu,
  Folder,
  FileText,
  Key,
  ChevronRight,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { godModeApi } from "@/lib/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, timeAgo, formatIndianNumber } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface DbTable {
  table_name: string;
  row_count: number;
  error?: string;
}

interface SystemHealth {
  status: string;
  database?: {
    status: string;
    latency_ms?: number;
  };
  redis?: {
    status: string;
    memory_used?: string;
  };
  disk?: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    used_pct: number;
  };
  uploads?: Record<string, { exists: boolean; file_count: number }>;
  checked_at?: string;
}

interface VersionInfo {
  app_name: string;
  app_version: string;
  python_version: string;
  platform: string;
  environment: string;
  db_revision: string;
}

type Tab = "overview" | "database" | "redis" | "files" | "audit";

// ═══════════════════════════════════════════════════════════
// GOD MODE PAGE
// ═══════════════════════════════════════════════════════════

export default function GodModePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // ─── Fetch data ───
  const { data: dashboard } = useQuery({
    queryKey: ["god-mode-dashboard"],
    queryFn: () => godModeApi.dashboard().then((r) => r.data),
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["god-mode-health"],
    queryFn: () =>
      godModeApi.systemHealth().then((r) => r.data as SystemHealth),
  });

  const { data: version } = useQuery({
    queryKey: ["god-mode-version"],
    queryFn: () =>
      godModeApi.systemVersion().then((r) => r.data as VersionInfo),
  });

  const { data: dbTables, isLoading: tablesLoading } = useQuery({
    queryKey: ["god-mode-db-tables"],
    queryFn: () =>
      godModeApi.dbTables().then((r) => r.data as DbTable[]),
    enabled: activeTab === "database",
  });

  const { data: redisKeys, isLoading: redisLoading } = useQuery({
    queryKey: ["god-mode-redis-keys"],
    queryFn: () => godModeApi.redisKeys("*").then((r) => r.data),
    enabled: activeTab === "redis",
  });

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ["god-mode-files"],
    queryFn: () => godModeApi.listFiles().then((r) => r.data),
    enabled: activeTab === "files",
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["god-mode-audit"],
    queryFn: () => godModeApi.auditLogs(1, 50).then((r) => r.data),
    enabled: activeTab === "audit",
  });

  // ─── Flush cache mutation ───
  const flushCacheMutation = useMutation({
    mutationFn: () => godModeApi.flushRedis(),
    onSuccess: (r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = r.data as any;
      toast.success(
        `Flushed ${data?.keys_deleted || 0} cache keys!`
      );
      queryClient.invalidateQueries({ queryKey: ["god-mode-redis-keys"] });
    },
    onError: () => toast.error("Failed to flush cache"),
  });

  // ═══════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">God Mode ⚡</h1>
          <p className="text-slate-400 text-sm">
            Platform internals — handle with care
          </p>
        </div>
      </div>

      {/* ─── Warning ─── */}
      <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
        <p className="text-yellow-300 text-sm">
          <strong>Caution:</strong> These tools directly affect the platform.
          Use in development/debugging only.
        </p>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "database", label: "Database", icon: Database },
          { id: "redis", label: "Redis", icon: Cpu },
          { id: "files", label: "Files", icon: Folder },
          { id: "audit", label: "Audit Logs", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                border-b-2 transition-all whitespace-nowrap
                ${
                  isActive
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-slate-400 hover:text-white hover:border-slate-700"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* System Health */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-400" />
              System Health
            </h2>

            {healthLoading ? (
              <LoadingSpinner message="Checking health..." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Database */}
                <HealthCard
                  title="Database"
                  status={health?.database?.status || "unknown"}
                  detail={
                    health?.database?.latency_ms
                      ? `${health.database.latency_ms}ms`
                      : "—"
                  }
                  icon={Database}
                />
                {/* Redis */}
                <HealthCard
                  title="Redis Cache"
                  status={health?.redis?.status || "unknown"}
                  detail={health?.redis?.memory_used || "—"}
                  icon={Cpu}
                />
                {/* Disk */}
                <HealthCard
                  title="Disk Space"
                  status={
                    (health?.disk?.used_pct ?? 0) < 80 ? "healthy" : "warning"
                  }
                  detail={
                    health?.disk
                      ? `${health.disk.used_gb}/${health.disk.total_gb} GB (${health.disk.used_pct}%)`
                      : "—"
                  }
                  icon={HardDrive}
                />
              </div>
            )}
          </div>

          {/* Version Info */}
          {version && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-green-400" />
                Version Info
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow label="App Name" value={version.app_name} />
                <InfoRow label="Version" value={version.app_version} />
                <InfoRow label="Environment" value={version.environment} />
                <InfoRow label="DB Revision" value={version.db_revision} />
                <InfoRow label="Platform" value={version.platform} />
                <InfoRow
                  label="Python"
                  value={version.python_version.split(" ")[0]}
                />
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-green-400" />
              Quick Debug Links
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                {
                  label: "API Docs",
                  url: "http://127.0.0.1:8000/docs",
                  color: "bg-blue-600 hover:bg-blue-500",
                },
                {
                  label: "ReDoc",
                  url: "http://127.0.0.1:8000/redoc",
                  color: "bg-purple-600 hover:bg-purple-500",
                },
                {
                  label: "Health Check",
                  url: "http://127.0.0.1:8000/health/detailed",
                  color: "bg-green-600 hover:bg-green-500",
                },
                {
                  label: "Supabase",
                  url: "https://app.supabase.com",
                  color: "bg-emerald-600 hover:bg-emerald-500",
                },
                {
                  label: "Upstash",
                  url: "https://console.upstash.com",
                  color: "bg-rose-600 hover:bg-rose-500",
                },
                {
                  label: "DB Test",
                  url: "http://127.0.0.1:8000/db-test",
                  color: "bg-orange-600 hover:bg-orange-500",
                },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`${link.color} text-white text-sm font-medium px-4 py-3 rounded-lg transition-all text-center flex items-center justify-center gap-2`}
                >
                  {link.label}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* DATABASE TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "database" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                Database Tables
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {dbTables?.length || 0} tables in database
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["god-mode-db-tables"],
                })
              }
              className="bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {tablesLoading ? (
            <div className="p-8">
              <LoadingSpinner message="Loading tables..." />
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {dbTables?.map((table) => (
                  <div
                    key={table.table_name}
                    className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg p-4 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-mono text-sm truncate">
                          {table.table_name}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          {formatIndianNumber(table.row_count)} row
                          {table.row_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* REDIS TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "redis" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                Redis Keys
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(redisKeys as any)?.total_keys || 0} total keys
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["god-mode-redis-keys"],
                  })
                }
                className="bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (confirm("Flush all cache keys? (cache:* pattern only)")) {
                    flushCacheMutation.mutate();
                  }
                }}
                disabled={flushCacheMutation.isPending}
                className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800"
              >
                {flushCacheMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Flush Cache
              </Button>
            </div>
          </div>

          {redisLoading ? (
            <div className="p-8">
              <LoadingSpinner message="Loading Redis keys..." />
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-800">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(redisKeys as any)?.keys?.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Key className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                  <p>No keys found</p>
                </div>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (redisKeys as any)?.keys?.map((key: any) => (
                  <div
                    key={key.key}
                    className="flex items-center justify-between px-6 py-3 hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Key className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white font-mono text-sm truncate">
                          {key.key}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Type: {key.type} • TTL:{" "}
                          {key.ttl === -1 ? "∞" : `${key.ttl}s`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* FILES TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "files" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-800">
            <Folder className="w-5 h-5 text-yellow-400" />
            <h2 className="text-white font-semibold">Uploaded Files</h2>
            <span className="text-slate-500 text-xs">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(files as any)?.total || 0} files
            </span>
          </div>

          {filesLoading ? (
            <div className="p-8">
              <LoadingSpinner message="Loading files..." />
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-800">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(files as any)?.files?.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Folder className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                  <p>No files uploaded yet</p>
                </div>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (files as any)?.files?.map((file: any) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between px-6 py-3 hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">
                          {file.name}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {file.path} • {file.size_kb} KB
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-500 text-xs">
                      {timeAgo(file.modified_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* AUDIT LOGS TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "audit" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-800">
            <FileText className="w-5 h-5 text-slate-400" />
            <h2 className="text-white font-semibold">Audit Logs</h2>
            <span className="text-slate-500 text-xs">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(auditData as any)?.total || 0} entries
            </span>
          </div>

          {auditLoading ? (
            <div className="p-8">
              <LoadingSpinner message="Loading audit logs..." />
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-800">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(auditData as any)?.logs?.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                  <p>No audit logs yet</p>
                </div>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (auditData as any)?.logs?.map((log: any, idx: number) => (
                  <div
                    key={log.id || idx}
                    className="flex items-center justify-between px-6 py-3 hover:bg-slate-800/30"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          log.action?.includes("DELETE")
                            ? "bg-red-900/30 text-red-400"
                            : log.action?.includes("CREATE")
                            ? "bg-green-900/30 text-green-400"
                            : log.action?.includes("UPDATE")
                            ? "bg-blue-900/30 text-blue-400"
                            : "bg-slate-800 text-slate-400"
                        }
                      >
                        {log.action || "ACTION"}
                      </Badge>
                      <span className="text-slate-300 text-sm">
                        {log.resource_type}{" "}
                        {log.resource_id ? `#${log.resource_id.slice(0, 8)}` : ""}
                      </span>
                    </div>
                    <span className="text-slate-500 text-xs">
                      {log.created_at ? timeAgo(log.created_at) : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════

function HealthCard({
  title,
  status,
  detail,
  icon: Icon,
}: {
  title: string;
  status: string;
  detail: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
}) {
  const isHealthy = status === "healthy";
  const isWarning = status === "warning";

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <p className="text-slate-400 text-xs uppercase tracking-wider">{title}</p>
      </div>
      <div className="flex items-center gap-2">
        {isHealthy ? (
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        ) : isWarning ? (
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400" />
        )}
        <span
          className={`text-sm font-medium capitalize ${
            isHealthy
              ? "text-green-400"
              : isWarning
              ? "text-yellow-400"
              : "text-red-400"
          }`}
        >
          {status}
        </span>
      </div>
      <p className="text-white text-lg font-semibold mt-1">{detail}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <p className="text-slate-500 text-xs">{label}</p>
      <p className="text-white font-mono text-sm mt-1 truncate">{value}</p>
    </div>
  );
}