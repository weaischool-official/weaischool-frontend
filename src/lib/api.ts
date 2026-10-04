// ============================================================
// WEAISCHOOL TEC — API Client (PRODUCTION READY)
// This file talks to the backend
// Every request automatically gets the token attached
// ============================================================

import axios, { AxiosInstance, AxiosError } from "axios";

// ─── BASE URL ───────────────────────────────────────────────
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

// ─── AXIOS INSTANCE ─────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// ═══════════════════════════════════════════════════════════
// REQUEST INTERCEPTOR — Auto-attach token
// ═══════════════════════════════════════════════════════════
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      // Auto-attach token
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Auto-attach tenant context (from URL /school/[slug]/...)
      const path = window.location.pathname;
      const schoolMatch = path.match(/^\/school\/([^\/]+)/);
      if (schoolMatch && schoolMatch[1]) {
        const tenantSlug = schoolMatch[1];
        const tenantId = localStorage.getItem(`tenant_id_${tenantSlug}`);
        if (tenantId) {
          config.headers["X-Tenant-ID"] = tenantId;
        }
        config.headers["X-Tenant-Slug"] = tenantSlug;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ═══════════════════════════════════════════════════════════
// RESPONSE INTERCEPTOR — Auto token refresh on 401
// ═══════════════════════════════════════════════════════════
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");

        if (!refreshToken) {
          localStorage.clear();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;
        localStorage.setItem("access_token", access_token);

        originalRequest.headers!.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch {
        localStorage.clear();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION APIs
// ═══════════════════════════════════════════════════════════
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  logout: () => api.post("/auth/logout"),

  me: () => api.get("/auth/me"),

  refresh: (refresh_token: string) =>
    api.post("/auth/refresh", { refresh_token }),

  sendOtp: (phone: string, tenant_slug?: string) =>
    api.post("/auth/send-otp", { phone, tenant_slug }),

  verifyOtp: (phone: string, otp: string, tenant_slug?: string) =>
    api.post("/auth/verify-otp", { phone, otp, tenant_slug }),
};

// ═══════════════════════════════════════════════════════════
// TENANTS (SCHOOLS) APIs
// ═══════════════════════════════════════════════════════════
export const tenantApi = {
  list: (page = 1, perPage = 10, search?: string) =>
    api.get("/tenants", {
      params: { page, per_page: perPage, search },
    }),

  get: (id: string) => api.get(`/tenants/${id}`),

  create: (data: Record<string, unknown>) => api.post("/tenants", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/tenants/${id}`, data),

  updateStatus: (id: string, status: string) =>
    api.patch(`/tenants/${id}/status`, { status }),

  delete: (id: string) => api.delete(`/tenants/${id}`),

  getBySlug: (slug: string) => api.get(`/tenants/slug/${slug}`),
};

// ═══════════════════════════════════════════════════════════
// ADMIN DASHBOARD APIs
// ═══════════════════════════════════════════════════════════
export const adminApi = {
  stats: () => api.get("/admin/stats"),
  dashboard: () => api.get("/admin/dashboard"),
};

// ═══════════════════════════════════════════════════════════
// GOD MODE APIs (Super Admin Tools)
// ═══════════════════════════════════════════════════════════
export const godModeApi = {
  dashboard: () => api.get("/god-mode/dashboard"),
  tenantStats: () => api.get("/god-mode/tenants/stats"),
  systemHealth: () => api.get("/god-mode/system/health"),
  systemVersion: () => api.get("/god-mode/system/version"),
  dbTables: () => api.get("/god-mode/db/tables"),
  browseTable: (tableName: string, page = 1, perPage = 50) =>
    api.get(`/god-mode/db/table/${tableName}`, {
      params: { page, per_page: perPage },
    }),
  runSqlQuery: (query: string) =>
    api.post("/god-mode/db/query", { query }),
  redisKeys: (pattern = "*") =>
    api.get("/god-mode/redis/keys", { params: { pattern } }),
  getRedisValue: (key: string) =>
    api.get(`/god-mode/redis/key/${encodeURIComponent(key)}`),
  deleteRedisKey: (key: string) =>
    api.delete(`/god-mode/redis/key/${encodeURIComponent(key)}`),
  flushRedis: () => api.post("/god-mode/redis/flush"),
  listFiles: (path = "") =>
    api.get("/god-mode/files", { params: { path } }),
  deleteFile: (filePath: string) =>
    api.delete(`/god-mode/files/${encodeURIComponent(filePath)}`),
  listMigrations: () => api.get("/god-mode/migrations"),
  runMigrations: () => api.post("/god-mode/migrations/run"),
  suspendTenant: (tenantId: string) =>
    api.post(`/god-mode/tenant/${tenantId}/suspend`),
  activateTenant: (tenantId: string) =>
    api.post(`/god-mode/tenant/${tenantId}/activate`),
  clearTenantCache: (tenantId: string) =>
    api.post(`/god-mode/cache/clear/${tenantId}`),
  auditLogs: (page = 1, perPage = 50) =>
    api.get("/god-mode/audit-logs", {
      params: { page, per_page: perPage },
    }),
};

// ═══════════════════════════════════════════════════════════
// ACADEMIC YEARS APIs
// ═══════════════════════════════════════════════════════════
export const academicYearApi = {
  list: () => api.get("/academic-years"),
  get: (id: string) => api.get(`/academic-years/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post("/academic-years", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/academic-years/${id}`, data),
  delete: (id: string) => api.delete(`/academic-years/${id}`),
  setCurrent: (id: string) => api.post(`/academic-years/${id}/set-current`),
};

// ═══════════════════════════════════════════════════════════
// CLASSES APIs
// ═══════════════════════════════════════════════════════════
export const classApi = {
  list: (academicYearId?: string) =>
    api.get("/classes", { params: { academic_year_id: academicYearId } }),
  get: (id: string) => api.get(`/classes/${id}`),
  create: (data: Record<string, unknown>) => api.post("/classes", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/classes/${id}`, data),
  delete: (id: string) => api.delete(`/classes/${id}`),
};

// ═══════════════════════════════════════════════════════════
// SECTIONS APIs
// ═══════════════════════════════════════════════════════════
export const sectionApi = {
  listByClass: (classId: string) =>
    api.get(`/classes/${classId}/sections`),
  create: (classId: string, data: {
    name: string;
    max_students: number;
    medium?: string;
  }) =>
    api.post(`/classes/${classId}/sections`, {
      class_id: classId,
      medium: data.medium || "english",
      ...data,
    }),
  delete: (sectionId: string) => api.delete(`/sections/${sectionId}`),
};

// ═══════════════════════════════════════════════════════════
// STUDENTS APIs (Production Ready — All Endpoints)
// ═══════════════════════════════════════════════════════════
export const studentApi = {
  // ── LIST STUDENTS (with all filters) ──
  list: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    class_id?: string;
    section_id?: string;
    status?: string;
  }) =>
    api.get("/students/", {
      params: {
        page: params?.page || 1,
        per_page: params?.per_page || 50,
        search: params?.search || undefined,
        class_id: params?.class_id || undefined,
        section_id: params?.section_id || undefined,
        status: params?.status || undefined,
      },
    }),

  // ── SINGLE STUDENT CRUD ──
  get: (id: string) => api.get(`/students/${id}`),

  create: (data: Record<string, unknown>) => api.post("/students/", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/students/${id}`, data),

  delete: (id: string) => api.delete(`/students/${id}`),

  // ── PHOTO UPLOAD ──
  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/students/${id}/photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // ── PHOTO DELETE ✅ NEW ──
  deletePhoto: (id: string) => {
    return api.delete(`/students/${id}/photo`);
  },

  // ── TRANSFER TO ANOTHER SECTION ──
  transfer: (
    id: string,
    data: {
      new_section_id: string;
      reason?: string;
      transfer_date?: string;
    }
  ) => api.post(`/students/${id}/transfer`, data),

  // ── BULK IMPORT (2-Step Flow) ──
  downloadTemplate: () =>
    api.get("/students/template", { responseType: "blob" }),

  bulkPreview: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/students/bulk-preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  bulkConfirm: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/students/bulk-confirm", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // ── EXPORT AS CSV ──
  exportCsv: (params?: { section_id?: string; status?: string }) =>
    api.get("/students/export", {
      params: {
        section_id: params?.section_id || undefined,
        status: params?.status || undefined,
      },
      responseType: "blob",
    }),

  // ── PARENTS MANAGEMENT ──
  linkParent: (
    studentId: string,
    data: {
      parent_id: string;
      relation: string;
      is_primary_contact?: boolean;
      receives_notifications?: boolean;
      is_fee_payer?: boolean;
    }
  ) => api.post(`/students/${studentId}/parents`, data),

  getParents: (studentId: string) =>
    api.get(`/students/${studentId}/parents`),

  // ── DOCUMENTS ──
  addDocument: (
    studentId: string,
    data: {
      document_type: string;
      file_name: string;
      file_url: string;
      file_size_kb?: number;
      mime_type?: string;
      notes?: string;
    }
  ) => api.post(`/students/${studentId}/documents`, data),

  listDocuments: (studentId: string) =>
    api.get(`/students/${studentId}/documents`),

  deleteDocument: (studentId: string, documentId: string) =>
    api.delete(`/students/${studentId}/documents/${documentId}`),

  verifyDocument: (studentId: string, documentId: string) =>
    api.patch(`/students/${studentId}/documents/${documentId}/verify`),
};

// ═══════════════════════════════════════════════════════════
// PARENTS APIs
// ═══════════════════════════════════════════════════════════
export const parentApi = {
  list: (params?: { page?: number; per_page?: number; search?: string }) =>
    api.get("/parents/", {
      params: {
        page: params?.page || 1,
        per_page: params?.per_page || 50,
        search: params?.search || undefined,
      },
    }),

  get: (id: string) => api.get(`/parents/${id}`),

  create: (data: Record<string, unknown>) => api.post("/parents/", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/parents/${id}`, data),

  delete: (id: string) => api.delete(`/parents/${id}`),

  findByPhone: (phone: string) =>
    api.get(`/parents/search`, { params: { phone } }),
};

// ═══════════════════════════════════════════════════════════
// STAFF APIs
// ═══════════════════════════════════════════════════════════
export const staffApi = {
  list: (page = 1, perPage = 20, search?: string) =>
    api.get("/staff", {
      params: { page, per_page: perPage, search },
    }),
  get: (id: string) => api.get(`/staff/${id}`),
  create: (data: Record<string, unknown>) => api.post("/staff", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/staff/${id}`, data),
  delete: (id: string) => api.delete(`/staff/${id}`),
};

// ═══════════════════════════════════════════════════════════
// FEES APIs
// ═══════════════════════════════════════════════════════════
export const feesApi = {
  listHeads: () => api.get("/fees/heads"),
  createHead: (data: Record<string, unknown>) =>
    api.post("/fees/heads", data),
  listStructures: () => api.get("/fees/structures"),
  createStructure: (data: Record<string, unknown>) =>
    api.post("/fees/structures", data),
  listPayments: (page = 1, perPage = 20) =>
    api.get("/fees/payments", {
      params: { page, per_page: perPage },
    }),
  collectPayment: (data: Record<string, unknown>) =>
    api.post("/fees/payments", data),
};

// ═══════════════════════════════════════════════════════════
// COMMUNICATIONS APIs
// ═══════════════════════════════════════════════════════════
export const communicationsApi = {
  getConfig: () => api.get("/communications/config"),
  updateConfig: (data: Record<string, unknown>) =>
    api.put("/communications/config", data),
  sendSms: (data: { phone: string; message: string }) =>
    api.post("/communications/sms/send", data),
  sendWhatsapp: (data: { phone: string; message: string }) =>
    api.post("/communications/whatsapp/send", data),
  sendEmail: (data: { to: string; subject: string; body: string }) =>
    api.post("/communications/email/send", data),
  getLogs: (page = 1, perPage = 20) =>
    api.get("/communications/logs", {
      params: { page, per_page: perPage },
    }),
  getStats: () => api.get("/communications/stats"),
};

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK APIs
// ═══════════════════════════════════════════════════════════
export const healthApi = {
  check: () => axios.get(`${API_BASE_URL.replace("/api/v1", "")}/health`),
  detailed: () =>
    axios.get(`${API_BASE_URL.replace("/api/v1", "")}/health/detailed`),
};

// ═══════════════════════════════════════════════════════════
// EXPORT DEFAULT
// ═══════════════════════════════════════════════════════════
export default api;