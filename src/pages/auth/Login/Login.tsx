// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 24-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Lock, Phone } from 'lucide-react';
import { NqLoader } from '../../../components/brand';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { useAuth } from '../../../hooks/useAuth';
import { BRAND_LOGO_SRC, BRAND_NAME, BRAND_TAGLINE } from '../../../lib/brand';
import { errorMessage } from '../../../services/api';
import './Login.scss';

const pwSchema = z.object({
    phone: z
        .string()
        .trim()
        .transform((v) => v.replace(/\D/g, ''))
        .pipe(z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit phone number')),
    password: z.string().min(1, 'Please enter your password'),
    studio: z.string().trim().max(80).optional(),
});

const REMEMBER_KEY = 'buildnex_remember_identifier';

export const safeNext = (next: string | null) =>
    next && next.startsWith('/') && !next.startsWith('//') ? next : null;

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [showStudio, setShowStudio] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = safeNext(params.get('next'));

    const pw = useForm<z.infer<typeof pwSchema>>({
        resolver: zodResolver(pwSchema),
        defaultValues: { phone: '', password: '', studio: '' },
    });

    useEffect(() => {
        try {
            const saved = localStorage.getItem(REMEMBER_KEY);
            if (saved) pw.setValue('phone', saved.replace(/\D/g, '').slice(0, 10));
        } catch {
            /* ignore */
        }
    }, [pw]);

    useEffect(() => {
        document.documentElement.classList.add('login-no-scroll');
        document.body.classList.add('login-no-scroll');
        return () => {
            document.documentElement.classList.remove('login-no-scroll');
            document.body.classList.remove('login-no-scroll');
        };
    }, []);

    const submitPassword = pw.handleSubmit(async (v) => {
        setError('');
        try {
            const s = await login(v.phone, v.password, v.studio || undefined);
            try {
                localStorage.setItem(REMEMBER_KEY, v.phone);
            } catch {
                /* ignore */
            }
            navigate(next ?? s.home, { replace: true });
        } catch (e) {
            setError(errorMessage(e));
        }
    });

    return (
        <div className="split-login">
            <aside className="split-login__visual" aria-hidden="true">
                <div className="split-login__scene">
                    <div className="orb orb--pink" />
                    <div className="orb orb--gold" />
                    <div className="orb orb--cyan" />
                    <div className="orb orb--violet" />

                    <div className="cam-rig">
                        <div className="cam-body">
                            <div className="cam-top">
                                <span className="cam-flash" />
                                <span className="cam-hotshoe" />
                            </div>
                            <div className="cam-face">
                                <div className="cam-lens">
                                    <span className="lens-ring lens-ring--outer" />
                                    <span className="lens-ring lens-ring--mid" />
                                    <span className="lens-core" />
                                </div>
                                <div className="cam-grip" />
                            </div>
                        </div>
                        <div className="cam-shadow" />
                    </div>

                    <div className="polaroid polaroid--a">
                        <div className="polaroid__photo" />
                        <div className="polaroid__caption" />
                    </div>
                    <div className="polaroid polaroid--b">
                        <div className="polaroid__photo polaroid__photo--alt" />
                        <div className="polaroid__caption" />
                    </div>
                </div>

                <div className="split-login__visual-copy">
                    <p className="split-login__eyebrow">Studio platform</p>
                    <h2 className="split-login__headline">
                        Capture. Share.
                        <br />
                        Deliver live.
                    </h2>
                    <p className="split-login__sub">
                        QR galleries, AI face match, and print orders — one login for your whole team.
                    </p>
                </div>
            </aside>

            <main className="split-login__form-side">
                <div className="split-login__form-card">
                    <header className="split-login__brand">
                        <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} className="split-login__logo" />
                        <div>
                            <h1 className="split-login__title">{BRAND_NAME}</h1>
                            <p className="split-login__tagline">{BRAND_TAGLINE}</p>
                        </div>
                    </header>

                    <h2 className="split-login__welcome">Welcome back</h2>
                    <p className="split-login__hint">Sign in with your studio phone number</p>

                    {error && (
                        <div className="split-login__error" role="alert">
                            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={submitPassword} noValidate className="split-login__form">
                        <div className="split-login__field">
                            <label htmlFor="phone" className="split-login__label">
                                Phone number
                            </label>
                            <div className="split-login__input-wrap">
                                <Phone className="split-login__icon size-4" aria-hidden />
                                <input
                                    id="phone"
                                    {...pw.register('phone')}
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    autoFocus
                                    maxLength={10}
                                    placeholder="e.g. 9000000001"
                                    className="split-login__input"
                                />
                            </div>
                            {pw.formState.errors.phone && (
                                <p className="split-login__field-error">{pw.formState.errors.phone.message}</p>
                            )}
                        </div>

                        <div className="split-login__field">
                            <label htmlFor="password" className="split-login__label">
                                Password
                            </label>
                            <div className="split-login__input-wrap">
                                <Lock className="split-login__icon size-4" aria-hidden />
                                <input
                                    id="password"
                                    {...pw.register('password')}
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="split-login__input split-login__input--password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((p) => !p)}
                                    className="split-login__toggle"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                            {pw.formState.errors.password && (
                                <p className="split-login__field-error">{pw.formState.errors.password.message}</p>
                            )}
                        </div>

                        {showStudio && (
                            <div className="split-login__field">
                                <label htmlFor="studio" className="split-login__label">
                                    Studio code
                                </label>
                                <input
                                    id="studio"
                                    {...pw.register('studio')}
                                    type="text"
                                    autoComplete="organization"
                                    placeholder="sunrise-studio"
                                    className="split-login__input split-login__input--plain"
                                />
                            </div>
                        )}

                        <button type="submit" disabled={pw.formState.isSubmitting} className="split-login__submit">
                            {pw.formState.isSubmitting ? (
                                <>
                                    <NqLoader size="xs" aria-hidden label="" />
                                    Please wait…
                                </>
                            ) : (
                                'Login'
                            )}
                        </button>
                    </form>

                    <footer className="split-login__footer">
                        <div className="split-login__links">
                            <Link to="/forgot-password" className="split-login__link">
                                Forgot password?
                            </Link>
                            <span className="split-login__dot" aria-hidden>
                                ·
                            </span>
                            <Link to="/register" className="split-login__link">
                                Register your company
                            </Link>
                        </div>
                        <button type="button" onClick={() => setShowStudio((s) => !s)} className="split-login__studio">
                            {showStudio ? 'Hide studio code' : 'Signing in to another studio?'}
                        </button>
                    </footer>
                </div>
            </main>
        </div>
    );
}
