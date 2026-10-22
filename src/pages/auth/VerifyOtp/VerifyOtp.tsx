// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { api, errorMessage, type SessionPayload } from '../../../services/api';
import { homeFor, useAuth } from '../../../hooks/useAuth';
import { safeNext } from '../Login/Login';
import './VerifyOtp.scss';

/**
 * OTP entry. purpose=LOGIN signs the user in; purpose=VERIFY confirms the email/phone of a signed-in user.
 * A signed-in user can also start verification from here without a destination in the URL.
 */
export default function VerifyOtp() {
    const [params] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, acceptSession, status } = useAuth();
    const purpose = params.get('purpose') === 'VERIFY' ? 'VERIFY' : 'LOGIN';
    const [destination, setDestination] = useState(params.get('destination') ?? (purpose === 'VERIFY' ? (user?.email ?? user?.phone ?? '') : ''));
    const [code, setCode] = useState('');
    const [devCode, setDevCode] = useState<string | undefined>((location.state as { devCode?: string } | null)?.devCode);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [busy, setBusy] = useState(false);
    const [cooldown, setCooldown] = useState(params.get('destination') ? 30 : 0);
    const inputRef = useRef<HTMLInputElement>(null);
    const next = safeNext(params.get('next'));

    useEffect(() => {
        if (!cooldown) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    useEffect(() => {
        if (!destination && purpose === 'VERIFY' && user) setDestination(user.email ?? user.phone ?? '');
    }, [user, purpose, destination]);

    const send = async () => {
        setError('');
        setInfo('');
        try {
            const r = await api.post<{ sent: boolean; devCode?: string }>('/api/auth/otp/request', { destination, purpose });
            setDevCode(r.devCode);
            setInfo('A new code has been sent if the account exists.');
            setCooldown(30);
            inputRef.current?.focus();
        } catch (e) {
            setError(errorMessage(e));
        }
    };

    const verify = async (e: FormEvent) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code.');
        setBusy(true);
        setError('');
        try {
            const r = await api.post<SessionPayload | { verified: boolean }>('/api/auth/otp/verify', { destination, purpose, code });
            if ('accessToken' in r) {
                acceptSession(r);
                navigate(next ?? r.home, { replace: true });
            } else {
                setInfo('Verified successfully.');
                setTimeout(() => navigate(next ?? homeFor(user), { replace: true }), 900);
            }
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    if (purpose === 'VERIFY' && status === 'anonymous') {
        return (
            <div className="verify-otp auth-card">
                <h1>Verify your account</h1>
                <div className="alert alert-info">
                    Sign in first, then verify your email or phone from your profile.
                </div>
                <Link to="/login" className="btn btn-primary w-100">
                    Sign in
                </Link>
            </div>
        );
    }

    return (
        <div className="verify-otp auth-card">
            <div className="verify-otp__head">
                <div className="verify-otp__mark">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h1>{purpose === 'LOGIN' ? 'Enter sign-in code' : 'Verify contact'}</h1>
                    <p>{destination ? `Sent to ${destination}` : 'Enter destination to continue'}</p>
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {info && <div className="verify-otp__note verify-otp__note--info">{info}</div>}
            {devCode && (
                <div className="verify-otp__note verify-otp__note--code">
                    Development mode code: <strong>{devCode}</strong>
                </div>
            )}

            <form onSubmit={verify} className="verify-otp__form" noValidate>
                {!params.get('destination') && (
                    <div>
                        <label className="form-label">Email or phone</label>
                        <input value={destination} onChange={(e) => setDestination(e.target.value)} className="form-control" />
                    </div>
                )}

                <div>
                    <label className="form-label">6-Digit Code</label>
                    <input
                        ref={inputRef}
                        autoFocus
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="••••••"
                        className="form-control text-center fs-2"
                        aria-label="6-digit code"
                    />
                </div>

                <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary w-100">
                    {busy ? (
                        <>
                            <Loader2 className="auth-spin" size={16} />
                            Verifying...
                        </>
                    ) : (
                        <>
                            Verify & Sign in
                            <ArrowRight size={16} />
                        </>
                    )}
                </button>
            </form>

            <div className="verify-otp__actions">
                <button type="button" onClick={send} disabled={cooldown > 0 || !destination}>
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
                <Link to="/login">Use password instead</Link>
            </div>
        </div>
    );
}
