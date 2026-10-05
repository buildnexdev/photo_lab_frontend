import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onRefresh, refreshSession, setAccessToken, setSessionLostHandler, type SessionPayload, type SessionUser } from './api';

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
    const primary = ROLE_ORDER.find((r) => user.roles.includes(r));
    return primary ? ROLE_HOME[primary] : '/';
};

interface AuthState {
    user: SessionUser | null;
    status: 'loading' | 'authenticated' | 'anonymous';
    login: (identifier: string, password: string) => Promise<SessionPayload>;
    register: (input: { name: string; email: string; phone?: string; password: string }) => Promise<SessionPayload>;
    acceptSession: (s: SessionPayload) => void;
    logout: () => Promise<void>;
    reload: () => Promise<void>;
    can: (...perms: string[]) => boolean;
    hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [status, setStatus] = useState<AuthState['status']>('loading');
    const qc = useQueryClient();

    const acceptSession = useCallback((s: SessionPayload) => {
        setAccessToken(s.accessToken);
        setUser(s.user);
        setStatus('authenticated');
    }, []);

    const clear = useCallback(() => {
        setAccessToken(null);
        setUser(null);
        setStatus('anonymous');
        qc.clear();
    }, [qc]);

    useEffect(() => {
        const off = onRefresh((s) => {
            if (s) {
                setUser(s.user);
                setStatus('authenticated');
            } else clear();
        });
        setSessionLostHandler(clear);
        // Restore the session from the httpOnly refresh cookie on page load
        refreshSession().then((ok) => {
            if (!ok) setStatus('anonymous');
        });
        return () => {
            off();
            setSessionLostHandler(null);
        };
    }, [clear]);

    // Keep the short-lived access token fresh while the tab is open
    useEffect(() => {
        if (status !== 'authenticated') return;
        const t = setInterval(() => void refreshSession(), 12 * 60_000);
        return () => clearInterval(t);
    }, [status]);

    const value = useMemo<AuthState>(
        () => ({
            user,
            status,
            acceptSession,
            async login(identifier, password) {
                const s = await api.post<SessionPayload>('/api/auth/login', { identifier, password });
                acceptSession(s);
                return s;
            },
            async register(input) {
                const s = await api.post<SessionPayload>('/api/auth/register', input);
                acceptSession(s);
                return s;
            },
            async logout() {
                try {
                    await api.post('/api/auth/logout');
                } finally {
                    clear();
                }
            },
            async reload() {
                await refreshSession();
            },
            can: (...perms) => !!user && perms.some((p) => user.permissions.includes(p)),
            hasRole: (...roles) => !!user && roles.some((r) => user.roles.includes(r)),
        }),
        [user, status, acceptSession, clear],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
