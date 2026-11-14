import type { SessionPayload, SessionUser } from '../../services/api';

export type Role =
    | 'SUPER_ADMIN'
    | 'STUDIO_OWNER'
    | 'COMPANY_ADMIN'
    | 'MANAGER'
    | 'FINANCE'
    | 'PHOTOGRAPHER'
    | 'VIDEOGRAPHER'
    | 'EDITOR_DESIGNER'
    | 'STAFF'
    | 'PRINTER_DELIVERY_STAFF'
    | 'REPORT_MANAGER'
    | 'CUSTOMER'
    | string;

export const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    STUDIO_OWNER: 'Admin / Owner',
    COMPANY_ADMIN: 'Company Admin',
    MANAGER: 'Manager',
    FINANCE: 'Finance',
    PHOTOGRAPHER: 'Photographer',
    VIDEOGRAPHER: 'Videographer',
    EDITOR_DESIGNER: 'Editor',
    STAFF: 'Studio Staff',
    PRINTER_DELIVERY_STAFF: 'Print & Delivery Staff',
    REPORT_MANAGER: 'Report Manager',
    CUSTOMER: 'Customer',
};

export const ROLE_LEVEL: Record<string, number> = {
    SUPER_ADMIN: 100,
    STUDIO_OWNER: 1,
    COMPANY_ADMIN: 1,
    MANAGER: 2,
    FINANCE: 3,
    PHOTOGRAPHER: 4,
    VIDEOGRAPHER: 4,
    EDITOR_DESIGNER: 5,
    STAFF: 6,
    PRINTER_DELIVERY_STAFF: 6,
    REPORT_MANAGER: 7,
    CUSTOMER: 0,
};

const ROLE_HOME: Record<string, string> = {
    SUPER_ADMIN: '/admin/companies',
    STUDIO_OWNER: '/admin/dashboard',
    COMPANY_ADMIN: '/admin/dashboard',
    MANAGER: '/admin/dashboard',
    FINANCE: '/admin/expenses',
    PHOTOGRAPHER: '/photographer/dashboard',
    VIDEOGRAPHER: '/photographer/dashboard',
    EDITOR_DESIGNER: '/editor/dashboard',
    STAFF: '/delivery/dashboard',
    PRINTER_DELIVERY_STAFF: '/delivery/dashboard',
    REPORT_MANAGER: '/admin/reports',
    CUSTOMER: '/customer/dashboard',
};

const rank = (role: Role) => (ROLE_LEVEL[role] === 100 ? 0 : ROLE_LEVEL[role] === 0 ? 1000 : ROLE_LEVEL[role]);

export const homeFor = (user: SessionUser | null) => {
    if (!user) return '/login';
    const known = user.roles.filter((role): role is Role => role in ROLE_HOME);
    known.sort((a, b) => rank(a) - rank(b));
    return known[0] ? ROLE_HOME[known[0]] : '/';
};

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthState {
    user: SessionUser | null;
    status: AuthStatus;
}

export const AUTH_LOGIN = 'auth/LOGIN';
export const AUTH_REGISTER = 'auth/REGISTER';
export const AUTH_LOGOUT = 'auth/LOGOUT';
export const AUTH_RESTORE = 'auth/RESTORE';
export const AUTH_SESSION = 'auth/SESSION';
export const AUTH_CLEAR = 'auth/CLEAR';
export const AUTH_RESTORE_TIMEOUT = 'auth/RESTORE_TIMEOUT';

export interface AuthLoginPayload {
    id: number;
    identifier: string;
    password: string;
    studio?: string;
}

export interface AuthRegisterPayload {
    id: number;
    name: string;
    email: string;
    phone?: string;
    password: string;
}

export const authLogin = (payload: AuthLoginPayload) => ({ type: AUTH_LOGIN, payload }) as const;
export const authRegister = (payload: AuthRegisterPayload) => ({ type: AUTH_REGISTER, payload }) as const;
export const authLogout = (id: number) => ({ type: AUTH_LOGOUT, id }) as const;
export const authRestore = () => ({ type: AUTH_RESTORE }) as const;
export const authSession = (user: SessionUser) => ({ type: AUTH_SESSION, user }) as const;
export const authClear = () => ({ type: AUTH_CLEAR }) as const;
export const authRestoreTimeout = () => ({ type: AUTH_RESTORE_TIMEOUT }) as const;

export type AuthAction =
    | ReturnType<typeof authLogin>
    | ReturnType<typeof authRegister>
    | ReturnType<typeof authLogout>
    | ReturnType<typeof authRestore>
    | ReturnType<typeof authSession>
    | ReturnType<typeof authClear>
    | ReturnType<typeof authRestoreTimeout>;

export type { SessionPayload, SessionUser };
