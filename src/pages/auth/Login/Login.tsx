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
import { BRAND_LOGO_LIGHT_SRC, BRAND_NAME, BRAND_TAGLINE } from '../../../lib/brand';
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

const BG_SLIDES = [
    '/images/hero-couple-petals.jpg',
    '/images/hero-wedding-garlands.jpg',
    '/images/hero-couple-outdoor.jpg',
] as const;

const REMEMBER_KEY = 'nammaqr_remember_identifier';

export const safeNext = (next: string | null) =>
    next && next.startsWith('/') && !next.startsWith('//') ? next : null;

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [showStudio, setShowStudio] = useState(false);
    const [error, setError] = useState('');
    const [bgSlide, setBgSlide] = useState(0);

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
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const id = window.setInterval(() => setBgSlide((i) => (i + 1) % BG_SLIDES.length), 8000);
        return () => window.clearInterval(id);
    }, []);

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
        <div className="cinematic-login-root">
            <div className="cinematic-bg-layer" aria-hidden="true">
                {BG_SLIDES.map((src, index) => (
                    <img key={src} src={src} alt="" className={`bg-photo${index === bgSlide ? ' is-active' : ''}`} />
                ))}
                <div className="blur-scrim" />
            </div>

            <div className="login-center-stage">
                <div className="login-glass-card">
                    <header className="login-brand">
                        <img src={BRAND_LOGO_LIGHT_SRC} alt={BRAND_NAME} className="login-brand__logo" />
                        <h1 className="login-brand__title">{BRAND_NAME}</h1>
                        <p className="login-brand__subtitle">{BRAND_TAGLINE}</p>
                    </header>

                    {error && (
                        <div className="login-error" role="alert">
                            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={submitPassword} noValidate className="login-form">
                        <div className="login-field">
                            <label htmlFor="phone" className="login-label">
                                Phone number
                            </label>
                            <div className="login-input-wrap">
                                <Phone className="login-input-icon size-4" aria-hidden />
                                <input
                                    id="phone"
                                    {...pw.register('phone')}
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    autoFocus
                                    maxLength={10}
                                    placeholder="e.g. 9000000001"
                                    className="login-input login-input--gold"
                                />
                            </div>
                            {pw.formState.errors.phone && (
                                <p className="login-field-error">{pw.formState.errors.phone.message}</p>
                            )}
                        </div>

                        <div className="login-field">
                            <label htmlFor="password" className="login-label">
                                Password
                            </label>
                            <div className="login-input-wrap">
                                <Lock className="login-input-icon size-4" aria-hidden />
                                <input
                                    id="password"
                                    {...pw.register('password')}
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="login-input login-input--password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((p) => !p)}
                                    className="login-password-toggle"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                            {pw.formState.errors.password && (
                                <p className="login-field-error">{pw.formState.errors.password.message}</p>
                            )}
                        </div>

                        {showStudio && (
                            <div className="login-field login-field--studio">
                                <label htmlFor="studio" className="login-label">
                                    Studio code
                                </label>
                                <input
                                    id="studio"
                                    {...pw.register('studio')}
                                    type="text"
                                    autoComplete="organization"
                                    placeholder="sunrise-studio"
                                    className="login-input login-input--plain !pl-3"
                                />
                            </div>
                        )}

                        <button type="submit" disabled={pw.formState.isSubmitting} className="login-submit">
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

                    <footer className="login-footer">
                        <div className="login-footer-links">
                            <Link to="/forgot-password" className="login-footer-link">
                                Forgot password?
                            </Link>
                            <span className="login-footer-dot" aria-hidden>
                                ·
                            </span>
                            <Link to="/register" className="login-footer-link">
                                Register your company
                            </Link>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowStudio((s) => !s)}
                            className="login-footer-studio"
                        >
                            {showStudio ? 'Hide studio code' : 'Signing in to another studio?'}
                        </button>
                    </footer>
                </div>
            </div>
        </div>
    );
}
