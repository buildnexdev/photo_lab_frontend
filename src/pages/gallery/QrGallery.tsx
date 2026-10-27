// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { QrCode } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { BrandMark } from '../../components/brand';
import { Loading } from '../../components/ui/Data';
import { Button, ButtonLink } from '../../components/ui';
import { api, ApiError, errorMessage } from '../../services/api';
import { homeFor, useAuth } from '../../hooks/useAuth';
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
}

const storageKey = (token: string) => `pl_gs_${token.slice(0, 24)}`;

function readStored(token: string): Access | null {
    try {
        const v = JSON.parse(sessionStorage.getItem(storageKey(token)) ?? 'null') as Access | null;
        if (!v || v.expiresAt <= Date.now() + 60_000) return null;
        // Always ask for the customer phone again on a fresh open of the link.
        return { session: v.session, galleryId: v.galleryId, expiresAt: v.expiresAt };
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
    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [checkingPhone, setCheckingPhone] = useState(false);
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
            const claimed = await api.post<{ proof: string }>(`/api/gallery/${access.galleryId}/phone/claim`, { phone: digits }, { 'X-Gallery-Session': access.session });
            const next = { ...access, phoneProof: claimed.proof };
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
                    const next = { session: prev.session, galleryId: prev.galleryId, expiresAt: prev.expiresAt };
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

    return (
        <div className="min-h-dvh bg-ink-900">
            <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-900/90 backdrop-blur">
                <div className="container-page flex h-14 items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 font-display font-semibold text-white">
                        <BrandMark className="h-10 w-auto" alt="Nammaqr" /> Nammaqr
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
                ) : access && !access.phoneProof ? (
                    <form onSubmit={submitPhone} className="mx-auto max-w-md py-16 text-white">
                        <h1 className="font-display text-2xl font-semibold">Enter your phone number</h1>
                        <p className="mt-2 text-sm text-white/60">This event link opens only for the customer phone number saved on the booking.</p>
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
                ) : access?.phoneProof ? (
                    <GalleryViewer galleryId={access.galleryId} session={access.session} eventPhone={access.phoneProof} onAccessLost={onAccessLost} dark />
                ) : (
                    <Loading className="min-h-[60vh] text-white/60" label="Unlocking gallery…" />
                )}
            </main>
        </div>
    );
}
