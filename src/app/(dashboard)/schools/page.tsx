// ============================================================
// WEAISCHOOL TEC — Schools List Page (PRODUCTION READY v2)
// Full CRUD with beautiful UI, search, pagination, actions
// ============================================================

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Pause,
  Play,
  MoreVertical,
  Filter,
  Download,
  RefreshCw,
  Users,
  GraduationCap,
  MapPin,
  Loader2,
} from "lucide-react";
import { tenantApi, godModeApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, getPlanColor, getStatusColor } from "@/lib/utils";
import { Tenant } from "@/types";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface TenantsListResponse {
  items: Tenant[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next?: boolean;
  has_prev?: boolean;
}

type StatusFilter = "ALL" | "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED";

// ═══════════════════════════════════════════════════════════
// SCHOOLS PAGE
// ═══════════════════════════════════════════════════════════

export default function SchoolsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const PER_PAGE = 10;

  // ─── Fetch schools ───
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["schools", page, search, statusFilter],
    queryFn: () =>
      tenantApi
        .list(page, PER_PAGE, search || undefined)
        .then((r) => r.data as TenantsListResponse),
  });

  // ─── Filter by status (client-side) ───
  const filteredItems =
    statusFilter === "ALL"
      ? data?.items || []
      : (data?.items || []).filter(
          (s) => String(s.status).toUpperCase() === statusFilter
        );

  // ─── Suspend mutation ───
  const suspendMutation = useMutation({
    mutationFn: (id: string) => godModeApi.suspendTenant(id),
    onSuccess: () => {
      toast.success("School suspended successfully");
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      queryClient.invalidateQueries({ queryKey: ["god-mode-dashboard"] });
    },
    onError: (err: unknown) => {
      const axErr = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(
        axErr?.response?.data?.error?.message || "Failed to suspend school"
      );
    },
  });

  // ─── Activate mutation ───
  const activateMutation = useMutation({
    mutationFn: (id: string) => godModeApi.activateTenant(id),
    onSuccess: () => {
      toast.success("School activated successfully");
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      queryClient.invalidateQueries({ queryKey: ["god-mode-dashboard"] });
    },
    onError: (err: unknown) => {
      const axErr = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(
        axErr?.response?.data?.error?.message || "Failed to activate school"
      );
    },
  });

  // ─── Search handler ───
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  // ─── Status change handler ───
  const handleStatusChange = (
    school: Tenant,
    action: "suspend" | "activate"
  ) => {
    if (action === "suspend") {
      if (confirm(`Suspend "${school.school_name}"? School users won't be able to login.`)) {
        suspendMutation.mutate(school.id);
      }
    } else {
      if (confirm(`Activate "${school.school_name}"?`)) {
        activateMutation.mutate(school.id);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Schools
            {isFetching && (
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {data?.total ?? 0} total school{(data?.total ?? 0) !== 1 ? "s" : ""}{" "}
            registered
            {statusFilter !== "ALL" &&
              ` • ${filteredItems.length} ${statusFilter.toLowerCase()}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => refetch()}
            disabled={isFetching}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link href="/schools/new">
            <Button className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20">
              <Plus className="w-4 h-4 mr-2" />
              Add School
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Search & Filters ─── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by school name or slug..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
          >
            Search
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearSearch}
              className="text-slate-400 hover:text-white"
            >
              Clear
            </Button>
          )}
        </form>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 h-9 px-3 rounded-lg border border-slate-700 text-sm transition-colors">
            <Filter className="w-4 h-4" />
            Status: {statusFilter}
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-slate-800 border-slate-700">
            {(["ALL", "ACTIVE", "TRIAL", "SUSPENDED", "EXPIRED"] as StatusFilter[]).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer"
              >
                {s === statusFilter && "✓ "}
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ─── Schools Table ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <LoadingSpinner fullPage message="Loading schools..." />
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="text-red-400 font-medium">Error loading schools</p>
            <p className="text-slate-500 text-sm mt-1">
              Backend running hai? Check karo.
            </p>
            <Button
              onClick={() => refetch()}
              className="mt-4 bg-blue-600 hover:bg-blue-500"
            >
              Retry
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={search ? "No results found" : "No schools yet"}
            description={
              search
                ? `"${search}" se koi school nahi mila`
                : "Get started by adding your first school"
            }
            action={
              !search ? (
                <Link href="/schools/new">
                  <Button className="bg-blue-600 hover:bg-blue-500">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First School
                  </Button>
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-800/50 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-medium">
              <div className="col-span-4">School</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-1">Board</div>
              <div className="col-span-1">Plan</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">Students</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-800">
              {filteredItems.map((school: Tenant) => {
                const status = String(school.status).toUpperCase();
                const isActive = status === "ACTIVE";
                const isSuspended = status === "SUSPENDED";

                return (
                  <div
                    key={school.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors items-center"
                  >
                    {/* School Info */}
                    <div className="md:col-span-4">
                      <Link
                        href={`/schools/${school.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors truncate">
                            {school.school_name}
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5 truncate">
                            {school.slug} • {formatDate(school.created_at)}
                          </p>
                        </div>
                      </Link>
                    </div>

                    {/* Location */}
                    <div className="md:col-span-2 flex items-center gap-1 text-slate-300 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">
                        {school.city || "—"}
                      </span>
                    </div>

                    {/* Board */}
                    <div className="md:col-span-1">
                      <span className="text-slate-300 text-sm">
                        {school.board_type}
                      </span>
                    </div>

                    {/* Plan */}
                    <div className="md:col-span-1">
                      <Badge
                        className={getPlanColor(
                          String(school.plan).toUpperCase() as never
                        )}
                      >
                        {String(school.plan).toUpperCase()}
                      </Badge>
                    </div>

                    {/* Status */}
                    <div className="md:col-span-2">
                      <Badge className={getStatusColor(status as never)}>
                        {status}
                      </Badge>
                    </div>

                    {/* Students */}
                    <div className="md:col-span-1 text-right">
                      <span className="text-slate-300 text-sm">
                        {school.student_count ?? 0}
                      </span>
                      <span className="text-slate-600 text-xs">
                        /{school.max_students ?? "∞"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-1 flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-slate-800 border-slate-700 w-48"
                        >
                          <Link href={`/schools/${school.id}`}>
                            <DropdownMenuItem className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </Link>

                          <a
                            href={`http://${school.slug}.weaischool.com`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <DropdownMenuItem className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Visit School
                            </DropdownMenuItem>
                          </a>

                          <DropdownMenuSeparator className="bg-slate-700" />

                          {isActive && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(school, "suspend")}
                              className="text-yellow-400 focus:bg-yellow-900/30 focus:text-yellow-300 cursor-pointer"
                              disabled={suspendMutation.isPending}
                            >
                              {suspendMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Pause className="w-4 h-4 mr-2" />
                              )}
                              Suspend
                            </DropdownMenuItem>
                          )}

                          {isSuspended && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(school, "activate")}
                              className="text-green-400 focus:bg-green-900/30 focus:text-green-300 cursor-pointer"
                              disabled={activateMutation.isPending}
                            >
                              {activateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4 mr-2" />
                              )}
                              Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 flex-wrap gap-3">
                <p className="text-slate-400 text-sm">
                  Showing {(page - 1) * PER_PAGE + 1}–
                  {Math.min(page * PER_PAGE, data.total)} of {data.total} schools
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="text-slate-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Prev
                  </Button>
                  <div className="flex items-center gap-1 px-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-500 text-sm">Page</span>
                    <span className="text-white text-sm font-medium">
                      {page}
                    </span>
                    <span className="text-slate-500 text-sm">of</span>
                    <span className="text-white text-sm font-medium">
                      {data.total_pages}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.total_pages}
                    className="text-slate-400 hover:text-white disabled:opacity-30"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Info Footer ─── */}
      <div className="text-center text-slate-600 text-xs">
        Click any school to view full details, edit, or manage
      </div>
    </div>
  );
}