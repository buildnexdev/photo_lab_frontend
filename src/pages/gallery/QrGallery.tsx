// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { QrCode } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { BrandMark } from '../../components/brand';
import { Loading } from '../../components/ui/Data';
import { Button, ButtonLink } from '../../components/ui';
import { api, ApiError, errorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { GalleryViewer } from './GalleryViewer';
import './QrGallery.scss';

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
    phoneProof?: string;
    /** Scanned QR — photos open without phone. */
    openAsQr?: boolean;
    title?: string | null;
    coverUrl?: string | null;
}

const storageKey = (token: string) => `pl_gs_${token.slice(0, 24)}`;

function readStored(token: string): Access | null {
    try {
        const v = JSON.parse(sessionStorage.getItem(storageKey(token)) ?? 'null') as Access | null;
        if (!v || v.expiresAt <= Date.now() + 60_000) return null;
        // Older sessions never stored cover metadata at all.
        if (!('coverUrl' in v)) {
            sessionStorage.removeItem(storageKey(token));
            return null;
        }
        // Always ask for the customer phone again on a fresh open of the link.
        return {
            session: v.session,
            galleryId: v.galleryId,
            expiresAt: v.expiresAt,
            openAsQr: !!v.openAsQr,
            phoneProof: v.openAsQr ? v.phoneProof : undefined,
            title: v.title,
            coverUrl: v.coverUrl,
        };
    } catch {
        return null;
    }
}

/** Gallery opened from a QR code or shared link. The token is exchanged for a short-lived gallery session kept in this tab only. */
export default function QrGallery() {
    const { token: raw = '' } = useParams();
    const token = extractToken(raw);
    const [search] = useSearchParams();
    const fromQr = useMemo(() => search.get('src') === 'qr', [search]);
    const { status } = useAuth();
    const [access, setAccess] = useState<Access | null>(() => (token ? readStored(token) : null));
    const [error, setError] = useState(token ? '' : 'This gallery link is not valid.');
    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [checkingPhone, setCheckingPhone] = useState(false);
    const attempts = useRef(0);

    const exchange = useCallback(async () => {
        if (!token) return;
        attempts.current += 1;
        setError('');
        try {
            const r = await api.post<{
                session: string;
                expiresInHours: number;
                galleryId: number;
                title?: string | null;
                coverUrl?: string | null;
                openAsQr?: boolean;
            }>('/api/gallery/access', { token, openMode: fromQr ? 'qr' : 'link' });
            const a: Access = {
                session: r.session,
                galleryId: r.galleryId,
                expiresAt: Date.now() + r.expiresInHours * 3600_000,
                openAsQr: !!r.openAsQr || fromQr,
                title: r.title ?? null,
                coverUrl: r.coverUrl ?? null,
            };
            sessionStorage.setItem(storageKey(token), JSON.stringify(a));
            setAccess(a);
        } catch (e) {
            sessionStorage.removeItem(storageKey(token));
            setAccess(null);
            setError(errorMessage(e));
        }
    }, [token, fromQr]);

    // Link sessions must not keep QR bypass (and vice versa) when the same token is opened again with a different URL.
    useEffect(() => {
        if (!access || !token) return;
        if (fromQr === !!access.openAsQr) return;
        sessionStorage.removeItem(storageKey(token));
        setAccess(null);
    }, [access, fromQr, token]);

    useEffect(() => {
        if (status === 'loading' || access || !token || error) return;
        void exchange();
    }, [status, access, token, error, exchange]);

    // Until the unlock API returns coverUrl, try event cover / first published photo (works when a studio account is signed in).
    useEffect(() => {
        if (!access || access.coverUrl || access.phoneProof || access.openAsQr) return;
        let cancelled = false;
        void (async () => {
            try {
                let url: string | null = null;
                let title: string | null = access.title ?? null;
                try {
                    const g = await api.get<{ title?: string; event_id?: number; event_title?: string }>(`/api/galleries/${access.galleryId}`);
                    title = g.title ?? g.event_title ?? title;
                    if (g.event_id) {
                        const ev = await api.get<{ cover_url?: string | null; title?: string }>(`/api/events/${g.event_id}`);
                        url = ev.cover_url ?? null;
                        title = title ?? ev.title ?? null;
                    }
                } catch {
                    // not staff / no gallery access
                }
                if (!url) {
                    const photos = await api.get<{ items: { thumb_url?: string | null }[] }>('/api/photos', {
                        galleryId: access.galleryId,
                        published: 'true',
                        rejected: 'false',
                        page: 1,
                        pageSize: 1,
                    });
                    url = photos.items[0]?.thumb_url ?? null;
                }
                if (cancelled || (!url && title == null)) return;
                setAccess((prev) => {
                    if (!prev) return prev;
                    if (prev.coverUrl && (prev.title || title == null)) return prev;
                    const next = {
                        ...prev,
                        coverUrl: prev.coverUrl || url || null,
                        title: prev.title || title || null,
                    };
                    if (token) sessionStorage.setItem(storageKey(token), JSON.stringify(next));
                    return next;
                });
            } catch {
                // Guests cannot load covers until the phone gate is passed; ignore.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [access, token]);

    const submitPhone = async (event: FormEvent) => {
        event.preventDefault();
        if (!access) return;
        const digits = phone.replace(/\D/g, '').slice(-10);
        if (digits.length !== 10) {
            setPhoneError('Enter the 10-digit phone number saved for this event.');
            return;
        }
        setCheckingPhone(true);
        setPhoneError('');
        try {
            const claimed = await api.post<{ proof: string; session: string }>(
                `/api/gallery/${access.galleryId}/phone/claim`,
                { phone: digits },
                { 'X-Gallery-Session': access.session },
            );
            if (!claimed?.proof || !claimed?.session) {
                setPhoneError('Phone was accepted but gallery access could not be opened. Please try again.');
                return;
            }
            const next = { ...access, session: claimed.session, phoneProof: claimed.proof };
            if (token) sessionStorage.setItem(storageKey(token), JSON.stringify(next));
            setAccess(next);
        } catch (e) {
            setPhoneError(errorMessage(e, 'Only the customer phone for this event can open the photos.'));
        } finally {
            setCheckingPhone(false);
        }
    };

    const onAccessLost = useCallback(
        (reason?: unknown) => {
            if (!token) return;
            const needPhone =
                reason instanceof ApiError &&
                reason.status === 403 &&
                (reason.code === 'PHONE_REQUIRED' || /phone/i.test(reason.message));
            if (needPhone) {
                setAccess((prev) => {
                    if (!prev) return prev;
                    const next = {
                        session: prev.session,
                        galleryId: prev.galleryId,
                        expiresAt: prev.expiresAt,
                        openAsQr: prev.openAsQr,
                        title: prev.title,
                        coverUrl: prev.coverUrl,
                    };
                    sessionStorage.setItem(storageKey(token), JSON.stringify(next));
                    return next;
                });
                setPhoneError(errorMessage(reason, 'Enter the customer phone number for this event.'));
                setError('');
                return;
            }
            sessionStorage.removeItem(storageKey(token));
            setAccess(null);
            if (attempts.current > 2) setError('Your access to this gallery has ended.');
        },
        [token],
    );

    const coverUrl = access?.coverUrl ?? null;
    const needsPhone = !!access && !access.openAsQr && !access.phoneProof;
    const galleryReady = !!access && (access.openAsQr || !!access.phoneProof);

    return (
        <div className="relative min-h-dvh overflow-hidden bg-ink-900">
            {coverUrl && needsPhone && (
                <>
                    <img src={coverUrl} alt="" className="pointer-events-none absolute inset-0 size-full object-cover" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80" />
                </>
            )}
            <div className="relative z-10 flex min-h-dvh flex-col">
                <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-900/50 backdrop-blur">
                    <div className="container-page flex h-14 items-center">
                        <Link to="/" className="flex items-center gap-2 font-display font-semibold text-white">
                            <BrandMark className="h-10 w-auto" alt="Nammaqr" /> Nammaqr
                        </Link>
                    </div>
                </header>
                <main className="container-page flex flex-1 flex-col py-6 sm:py-8">
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
                    ) : needsPhone ? (
                        <form onSubmit={submitPhone} className="mx-auto w-full max-w-md rounded-2xl border border-white/15 bg-black/45 p-6 text-white shadow-2xl backdrop-blur-md sm:p-8">
                            {access?.title && <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-300">{access.title}</p>}
                            <h1 className="font-display text-2xl font-semibold">Enter your phone number</h1>
                            <p className="mt-2 text-sm text-white/70">This event link opens only for the customer phone number saved on the booking.</p>
                            <label className="mt-6 block text-sm font-medium text-white/80" htmlFor="event-phone">
                                Phone number
                            </label>
                            <input
                                id="event-phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                inputMode="numeric"
                                autoComplete="tel"
                                maxLength={10}
                                placeholder="10-digit mobile number"
                                className="mt-2 h-12 w-full rounded-lg border border-white/15 bg-white px-3 text-base text-stone-900"
                            />
                            {phoneError && <p className="mt-3 text-sm text-red-300">{phoneError}</p>}
                            <Button type="submit" className="mt-5 w-full" loading={checkingPhone} disabled={phone.replace(/\D/g, '').length !== 10}>
                                Open photos
                            </Button>
                        </form>
                    ) : galleryReady ? (
                        <GalleryViewer
                            galleryId={access!.galleryId}
                            session={access!.session}
                            eventPhone={access!.phoneProof}
                            allowWithoutPhone={!!access!.openAsQr}
                            onAccessLost={onAccessLost}
                            dark
                        />
                    ) : (
                        <Loading className="min-h-[60vh] text-white/60" label="Unlocking gallery…" />
                    )}
                </main>
            </div>
        </div>
    );
}
