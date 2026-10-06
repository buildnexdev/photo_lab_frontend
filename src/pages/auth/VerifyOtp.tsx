// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { api, errorMessage, type SessionPayload } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import { safeNext } from './Login';

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
            <div className="relative w-full max-w-[460px] mx-auto rounded-3xl border border-white/10 bg-[#0d1728]/85 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-black/60 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/60 before:to-transparent text-white space-y-4">
                <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Verify your account</h1>
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-200">
                    Sign in first, then verify your email or phone from your profile.
                </div>
                <Link to="/login" className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 text-xs transition-colors">
                    Sign in
                </Link>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-[460px] mx-auto rounded-3xl border border-white/10 bg-[#0d1728]/85 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-black/60 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/60 before:to-transparent text-white">
            <div className="flex items-center gap-3.5 mb-6">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
                    <ShieldCheck className="size-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
                        {purpose === 'LOGIN' ? 'Enter sign-in code' : 'Verify contact'}
                    </h1>
                    <p className="text-xs text-slate-400">
                        {destination ? `Sent to ${destination}` : 'Enter destination to continue'}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                    {error}
                </div>
            )}
            {info && (
                <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                    {info}
                </div>
            )}
            {devCode && (
                <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200">
                    Development mode code: <span className="font-mono font-bold text-white tracking-widest">{devCode}</span>
                </div>
            )}

            <form onSubmit={verify} className="space-y-4" noValidate>
                {!params.get('destination') && (
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Email or phone
                        </label>
                        <input
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="w-full rounded-xl border border-slate-700/70 bg-[#091120]/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                        />
                    </div>
                )}

                <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        6-Digit Code
                    </label>
                    <input
                        ref={inputRef}
                        autoFocus
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="••••••"
                        className="w-full rounded-2xl border border-slate-700/70 bg-[#091120]/90 py-3.5 text-center font-mono text-2xl tracking-[0.5em] text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                        aria-label="6-digit code"
                    />
                </div>

                <button
                    type="submit"
                    disabled={busy || code.length !== 6}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all duration-200 cursor-pointer"
                >
                    {busy ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin" />
                            Verifying...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <span>Verify & Sign in</span>
                            <ArrowRight className="size-4" />
                        </span>
                    )}
                </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs pt-4 border-t border-white/5">
                <button
                    type="button"
                    onClick={send}
                    disabled={cooldown > 0 || !destination}
                    className="font-medium text-blue-400 hover:text-blue-300 disabled:text-slate-500 disabled:no-underline cursor-pointer"
                >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
                <Link to="/login" className="text-slate-400 hover:text-slate-200 transition-colors">
                    Use password instead
                </Link>
            </div>
        </div>
    );
}
