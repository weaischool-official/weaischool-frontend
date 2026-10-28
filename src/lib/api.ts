// ============================================================
// WEAISCHOOL TEC — Web Frontend API Client (PRODUCTION READY)
// Persistent Auth (30-Day JWT) + Non-Destructive Interceptors
// ============================================================

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";

// ─── BASE URL ───────────────────────────────────────────────
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://weaischool-backend.onrender.com/api/v1";

// ─── AXIOS INSTANCE ─────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// ─── HELPERS ────────────────────────────────────────────────
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("userToken")
  );
}

// ═══════════════════════════════════════════════════════════
// REQUEST INTERCEPTOR — Auto-attach token + tenant
// ═══════════════════════════════════════════════════════════
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = getAccessToken();
      if (token && token !== "undefined" && token !== "null") {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Auto-attach tenant context (from URL /school/[slug]/...)
      const path = window.location.pathname;
      const schoolMatch = path.match(/^\/school\/([^/]+)/);
      if (schoolMatch && schoolMatch[1]) {
        const tenantSlug = schoolMatch[1];
        config.headers["X-Tenant-Slug"] = tenantSlug;

        const tenantId =
          localStorage.getItem(`tenant_id_${tenantSlug}`) ||
          localStorage.getItem("tenant_id") ||
          localStorage.getItem("tenantId");

        if (tenantId && tenantId !== "undefined" && tenantId !== "null") {
          config.headers["X-Tenant-ID"] = tenantId;
        }
      } else {
        // Global / Super Admin Context
        const tenantId =
          localStorage.getItem("tenant_id") ||
          localStorage.getItem("tenantId");
        if (tenantId && tenantId !== "undefined" && tenantId !== "null") {
          config.headers["X-Tenant-ID"] = tenantId;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ═══════════════════════════════════════════════════════════
// RESPONSE INTERCEPTOR — SAFE ERROR HANDLING (NO DESTRUCTIVE LOGOUTS)
// ═══════════════════════════════════════════════════════════
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn(
        `[API Client] 401 Warning on ${error.config?.url} — Session preserved in storage.`
      );
    }
    // NEVER wipe localStorage or call window.location.href here!
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION APIs
// ═══════════════════════════════════════════════════════════
export const authApi = {
  login: (email: string, password: string, tenant_slug?: string) =>
    api.post("/auth/login", {
      email,
      password,
      ...(tenant_slug ? { tenant_slug } : {}),
    }),

  logout: () => api.post("/auth/logout").catch(() => null),

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
    api.get(`/sections`, { params: { class_id: classId } }),

  create: (
    classId: string,
    data: {
      name: string;
      max_students: number;
      medium?: string;
      class_id?: string;
      academic_year_id?: string;
    }
  ) =>
    api.post(`/sections`, {
      class_id: classId,
      name: data.name,
      max_students: data.max_students,
      max_capacity: data.max_students,
      capacity: data.max_students,
      academic_year_id: data.academic_year_id || null, // FIX: Added Academic Year ID
    }),

  delete: (sectionId: string) => api.delete(`/sections/${sectionId}`),
};

// ═══════════════════════════════════════════════════════════
// SUBJECTS APIs (Required for Timetable Builder)
// ═══════════════════════════════════════════════════════════
export const subjectApi = {
  list: () => api.get("/subjects"),
  create: (data: { name: string; code?: string; type?: string }) =>
    api.post("/subjects", data),
};

// ═══════════════════════════════════════════════════════════
// TIMETABLE APIs (Required for Smart Timetable Builder)
// ═══════════════════════════════════════════════════════════
export const timetableApi = {
  get: (classId: string, sectionId?: string | null) =>
    api.get("/timetables", {
      params: { class_id: classId, section_id: sectionId || undefined },
    }),
  save: (data: Record<string, unknown>) => api.post("/timetables", data),
};

// ═══════════════════════════════════════════════════════════
// STUDENTS APIs
// ═══════════════════════════════════════════════════════════
export const studentApi = {
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

  get: (id: string) => api.get(`/students/${id}`),

  create: (data: Record<string, unknown>) => api.post("/students/", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/students/${id}`, data),

  delete: (id: string) => api.delete(`/students/${id}`),

  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/students/${id}/photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deletePhoto: (id: string) => api.delete(`/students/${id}/photo`),

  transfer: (
    id: string,
    data: {
      new_section_id: string;
      reason?: string;
      transfer_date?: string;
    }
  ) => api.post(`/students/${id}/transfer`, data),

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

  exportCsv: (params?: { section_id?: string; status?: string }) =>
    api.get("/students/export", {
      params: {
        section_id: params?.section_id || undefined,
        status: params?.status || undefined,
      },
      responseType: "blob",
    }),

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

export default api;