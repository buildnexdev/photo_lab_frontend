// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Loading } from '../components/data';
import { homeFor, useAuth } from '../lib/auth';

/** Requires a signed-in user holding ANY of the listed permissions. */
export function RequireAuth({ anyOf, children }: { anyOf?: string[]; children: ReactNode }) {
    const { status, user, can } = useAuth();
    const location = useLocation();
    if (status === 'loading') return <Loading label="Checking your session…" className="min-h-dvh" />;
    if (status === 'anonymous' || !user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    if (anyOf?.length && !can(...anyOf)) return <Forbidden home={homeFor(user)} />;
    return <>{children}</>;
}

/** Auth pages: send signed-in users to their home. */
export function GuestOnly({ children }: { children: ReactNode }) {
    const { status, user } = useAuth();
    const location = useLocation();
    if (status === 'loading') return <Loading className="min-h-dvh" />;
    if (status === 'authenticated' && user) {
        const next = new URLSearchParams(location.search).get('next');
        return <Navigate to={next && next.startsWith('/') && !next.startsWith('//') ? next : homeFor(user)} replace />;
    }
    return <>{children}</>;
}

function Forbidden({ home }: { home: string }) {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-5xl font-semibold text-stone-300">403</p>
            <h1 className="text-xl font-semibold">You don't have access to this area</h1>
            <p className="max-w-md text-sm text-stone-500">Your role does not include the permission needed for this page. Contact the studio owner if you think this is a mistake.</p>
            <a href={home} className="link">
                Go to my dashboard
            </a>
        </div>
    );
}
