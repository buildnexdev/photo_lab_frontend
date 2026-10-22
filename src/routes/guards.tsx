import { Navigate, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { Loading } from '../components/ui/Data';
import { homeFor, useAuth } from '../hooks/useAuth';

export function RequireAuth({ children, anyOf }: { children: ReactNode; anyOf?: string[] }) {
    const { user, status, can } = useAuth();
    const location = useLocation();
    if (status === 'loading') return <Loading />;
    if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    if (anyOf?.length && !can(...anyOf)) return <Navigate to={homeFor(user)} replace />;
    return children;
}

export function GuestOnly({ children }: { children: ReactNode }) {
    const { user, status } = useAuth();
    if (status === 'loading') return <Loading />;
    if (user) return <Navigate to={homeFor(user)} replace />;
    return children;
}
