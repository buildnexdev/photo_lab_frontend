import type { SessionPayload, SessionUser } from '../../services/api';

export type Role = 'SUPER_ADMIN' | 'STUDIO_OWNER' | 'MANAGER' | 'PHOTOGRAPHER' | 'EDITOR_DESIGNER' | 'PRINTER_DELIVERY_STAFF' | 'CUSTOMER';

export const ROLE_LABELS: Record<Role, string> = {
    SUPER_ADMIN: 'Super Admin',
    STUDIO_OWNER: 'Studio Owner',
    MANAGER: 'Manager',
    PHOTOGRAPHER: 'Photographer',
    EDITOR_DESIGNER: 'Editor / Designer',
    PRINTER_DELIVERY_STAFF: 'Printer / Delivery',
    CUSTOMER: 'Customer',
};

const ROLE_ORDER: Role[] = ['SUPER_ADMIN', 'STUDIO_OWNER', 'MANAGER', 'PHOTOGRAPHER', 'EDITOR_DESIGNER', 'PRINTER_DELIVERY_STAFF', 'CUSTOMER'];

const ROLE_HOME: Record<Role, string> = {
    SUPER_ADMIN: '/admin/dashboard',
    STUDIO_OWNER: '/admin/dashboard',
    MANAGER: '/admin/dashboard',
    PHOTOGRAPHER: '/photographer/dashboard',
    EDITOR_DESIGNER: '/editor/dashboard',
    PRINTER_DELIVERY_STAFF: '/delivery/dashboard',
    CUSTOMER: '/customer/dashboard',
};

export const homeFor = (user: SessionUser | null) => {
    if (!user) return '/login';
    const primary = ROLE_ORDER.find((role) => user.roles.includes(role));
    return primary ? ROLE_HOME[primary] : '/';
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
