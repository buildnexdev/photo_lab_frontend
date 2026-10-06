// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { Camera, QrCode } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { Loading } from '../../components/data';
import { ButtonLink } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import { GalleryViewer } from './GalleryViewer';

/** Accepts a full gallery link (…/g/<token>) or the bare code printed under the QR. */
export function extractToken(input: string): string | null {
    const v = input.trim();
    const m = /\/g\/([A-Za-z0-9_-]{16,128})/.exec(v);
    const token = m ? m[1] : v;
    return /^[A-Za-z0-9_-]{16,128}$/.test(token) ? token : null;
}

interface Access {
    session: string;
    galleryId: number;
    expiresAt: number;
}

const storageKey = (token: string) => `pl_gs_${token.slice(0, 24)}`;

function readStored(token: string): Access | null {
    try {
        const v = JSON.parse(sessionStorage.getItem(storageKey(token)) ?? 'null') as Access | null;
        return v && v.expiresAt > Date.now() + 60_000 ? v : null;
    } catch {
        return null;
    }
}

/** Gallery opened from a QR code or shared link. The token is exchanged for a short-lived gallery session kept in this tab only. */
export default function QrGallery() {
    const { token: raw = '' } = useParams();
    const token = extractToken(raw);
    const { user, status } = useAuth();
    const location = useLocation();
    const [access, setAccess] = useState<Access | null>(() => (token ? readStored(token) : null));
    const [error, setError] = useState(token ? '' : 'This gallery link is not valid.');
    const attempts = useRef(0);

    const exchange = useCallback(async () => {
        if (!token) return;
        attempts.current += 1;
        setError('');
        try {
            const r = await api.post<{ session: string; expiresInHours: number; galleryId: number }>('/api/gallery/access', { token });
            const a = { session: r.session, galleryId: r.galleryId, expiresAt: Date.now() + r.expiresInHours * 3600_000 };
            sessionStorage.setItem(storageKey(token), JSON.stringify(a));
            setAccess(a);
        } catch (e) {
            sessionStorage.removeItem(storageKey(token));
            setAccess(null);
            setError(errorMessage(e));
        }
    }, [token]);

    useEffect(() => {
        if (status === 'loading' || access || !token || error) return;
        void exchange();
    }, [status, access, token, error, exchange]);

    const onAccessLost = useCallback(() => {
        if (!token) return;
        sessionStorage.removeItem(storageKey(token));
        setAccess(null);
        if (attempts.current > 2) setError('Your access to this gallery has ended.');
    }, [token]);

    return (
        <div className="min-h-dvh bg-ink-900">
            <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-900/90 backdrop-blur">
                <div className="container-page flex h-14 items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 font-display font-semibold text-white">
                        <Camera className="size-5 text-brand-400" /> BuildNexDev
                    </Link>
                    {user ? (
                        <Link to={homeFor(user)} className="text-sm font-medium text-white/80 hover:text-white">
                            My account
                        </Link>
                    ) : (
                        <Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className="text-sm font-medium text-white/80 hover:text-white">
                            Sign in
                        </Link>
                    )}
                </div>
            </header>
            <main className="container-page py-6 sm:py-8">
                {error ? (
                    <div className="mx-auto max-w-md py-20 text-center text-white">
                        <QrCode className="mx-auto size-12 text-white/30" />
                        <h1 className="mt-4 text-xl font-semibold">Gallery unavailable</h1>
                        <p className="mt-2 text-sm text-white/60">{error}</p>
                        <p className="mt-1 text-sm text-white/60">Ask the studio for a fresh QR code or link.</p>
                        <div className="mt-6 flex justify-center gap-3">
                            {token && attempts.current <= 2 && (
                                <button type="button" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10" onClick={() => setError('')}>
                                    Try again
                                </button>
                            )}
                            <ButtonLink to="/contact">Contact the studio</ButtonLink>
                        </div>
                    </div>
                ) : access ? (
                    <GalleryViewer galleryId={access.galleryId} session={access.session} onAccessLost={onAccessLost} dark />
                ) : (
                    <Loading className="min-h-[60vh] text-white/60" label="Unlocking gallery…" />
                )}
            </main>
        </div>
    );
}
