import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, type ReactNode } from 'react';
import { onRefresh, refreshSession, setAccessToken, setSessionLostHandler, type SessionPayload } from '../services/api';
import { enqueueAuth, enqueueLogout } from '../redux/auth/auth.saga';
import { selectAuthStatus, selectAuthUser } from '../redux/auth/auth.selector';
import { authClear, authLogin, authLogout, authRegister, authRestore, authRestoreTimeout, authSession, homeFor, ROLE_LABELS, ROLE_LEVEL, type Role } from '../redux/auth/auth.types';
import { useAppDispatch, useAppSelector } from '../store';

export { homeFor, ROLE_LABELS, ROLE_LEVEL, type Role };

interface AuthState {
    user: ReturnType<typeof selectAuthUser>;
    status: ReturnType<typeof selectAuthStatus>;
    login: (identifier: string, password: string, studio?: string) => Promise<SessionPayload>;
    register: (input: { name: string; email: string; phone?: string; password: string }) => Promise<SessionPayload>;
    acceptSession: (session: SessionPayload) => void;
    logout: () => Promise<void>;
    reload: () => Promise<void>;
    can: (...perms: string[]) => boolean;
    hasRole: (...roles: Role[]) => boolean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const dispatch = useAppDispatch();
    const status = useAppSelector(selectAuthStatus);

    useEffect(() => {
        const off = onRefresh((session) => {
            if (session) dispatch(authSession(session.user));
            else dispatch(authClear());
        });
        setSessionLostHandler(() => {
            setAccessToken(null);
            dispatch(authClear());
        });
        dispatch(authRestore());
        const safety = window.setTimeout(() => dispatch(authRestoreTimeout()), 15_000);
        return () => {
            window.clearTimeout(safety);
            off();
            setSessionLostHandler(null);
        };
    }, [dispatch]);

    useEffect(() => {
        if (status !== 'authenticated') return;
        const timer = window.setInterval(() => dispatch(authRestore()), 12 * 60_000);
        return () => window.clearInterval(timer);
    }, [dispatch, status]);

    return children;
}

export function useAuth(): AuthState {
    const user = useAppSelector(selectAuthUser);
    const status = useAppSelector(selectAuthStatus);
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();

    return useMemo<AuthState>(
        () => ({
            user,
            status,
            acceptSession(session) {
                setAccessToken(session.accessToken);
                dispatch(authSession(session.user));
            },
            login(identifier, password, studio) {
                return enqueueAuth((id) => dispatch(authLogin({ id, identifier, password, studio: studio?.trim() || undefined })));
            },
            register(input) {
                return enqueueAuth((id) => dispatch(authRegister({ id, ...input })));
            },
            async logout() {
                try {
                    await enqueueLogout((id) => dispatch(authLogout(id)));
                } finally {
                    queryClient.clear();
                }
            },
            async reload() {
                await refreshSession();
            },
            can: (...perms) => !!user && perms.some((permission) => user.permissions.includes(permission)),
            hasRole: (...roles) => !!user && roles.some((role) => user.roles.includes(role)),
        }),
        [dispatch, queryClient, status, user],
    );
}
