import type { SessionPayload, SessionUser } from '../../services/api';

export type Role = 'SUPER_ADMIN' | 'STUDIO_OWNER' | 'COMPANY_ADMIN' | 'MANAGER' | 'PHOTOGRAPHER' | 'EDITOR_DESIGNER' | 'STAFF' | 'PRINTER_DELIVERY_STAFF' | 'REPORT_MANAGER' | 'FINANCE' | 'CUSTOMER';

export const ROLE_LABELS: Record<Role, string> = {
    SUPER_ADMIN: 'Super Admin',
    STUDIO_OWNER: 'Company Owner',
    COMPANY_ADMIN: 'Company Admin',
    MANAGER: 'Manager',
    PHOTOGRAPHER: 'Photographer',
    EDITOR_DESIGNER: 'Editor',
    STAFF: 'Staff',
    PRINTER_DELIVERY_STAFF: 'Print & Delivery Staff',
    REPORT_MANAGER: 'Report Manager',
    FINANCE: 'Finance Team',
    CUSTOMER: 'Customer',
};

export const ROLE_LEVEL: Record<Role, number> = {
    SUPER_ADMIN: 100,
    STUDIO_OWNER: 1,
    COMPANY_ADMIN: 1,
    MANAGER: 2,
    PHOTOGRAPHER: 3,
    EDITOR_DESIGNER: 4,
    STAFF: 5,
    PRINTER_DELIVERY_STAFF: 5,
    REPORT_MANAGER: 6,
    FINANCE: 7,
    CUSTOMER: 0,
};

const ROLE_HOME: Record<Role, string> = {
    SUPER_ADMIN: '/admin/dashboard',
    STUDIO_OWNER: '/admin/dashboard',
    COMPANY_ADMIN: '/admin/dashboard',
    MANAGER: '/admin/dashboard',
    PHOTOGRAPHER: '/photographer/dashboard',
    EDITOR_DESIGNER: '/editor/dashboard',
    STAFF: '/delivery/dashboard',
    PRINTER_DELIVERY_STAFF: '/delivery/dashboard',
    REPORT_MANAGER: '/admin/reports',
    FINANCE: '/admin/payments',
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
