// ============================================================
// WEAISCHOOL TEC — TypeScript Types
// Backend ke saath match karne chahiye ye types
// ============================================================

// ─── AUTH TYPES ─────────────────────────────────────────────

export interface LoginRequest {
    email: string;
    password: string;
    slug?: string;
  }
  
  export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: UserProfile;
  }
  
  export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    tenant_id: string | null;
    is_active: boolean;
  }
  
  export type UserRole =
    | "SUPER_ADMIN"
    | "SCHOOL_ADMIN"
    | "TEACHER"
    | "NON_TEACHING_STAFF"
    | "PARENT"
    | "STUDENT";
  
  // ─── TENANT (SCHOOL) TYPES ──────────────────────────────────
  
  export type PlanType = "TRIAL" | "STARTER" | "GROWTH" | "ENTERPRISE";
  export type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL" | "EXPIRED";
  export type BoardType = "CBSE" | "ICSE" | "STATE" | "IB" | "IGCSE";
  
  export interface Tenant {
    id: string;
    school_name: string;
    school_code: string;
    slug: string;
    board_type: BoardType;
    plan: PlanType;
    status: TenantStatus;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    student_count: number;
    max_students: number;
    trial_ends_at: string | null;
    plan_expires_at: string | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateTenantRequest {
    school_name: string;
    school_code: string;
    slug: string;
    board_type: BoardType;
    plan: PlanType;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    admin_name: string;
    admin_email: string;
    admin_password: string;
  }
  
  // ─── PAGINATION ─────────────────────────────────────────────
  
  export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }
  
  // ─── API RESPONSE ───────────────────────────────────────────
  
  export interface ApiError {
    detail: string;
    error_code?: string;
  }
  
  // ─── GOD MODE TYPES ─────────────────────────────────────────
  
  export interface PlatformStats {
    total_tenants: number;
    active_tenants: number;
    trial_tenants: number;
    suspended_tenants: number;
    total_students: number;
    total_staff: number;
    total_revenue: number;
  }
  
  export interface TenantSummary {
    id: string;
    school_name: string;
    slug: string;
    plan: PlanType;
    status: TenantStatus;
    student_count: number;
    created_at: string;
  }