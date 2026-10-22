// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 22-10-2026
// AUTHOR: NANDHAKUMAR
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { useAuth } from '../../../hooks/useAuth';
import { errorMessage } from '../../../services/api';
import './Login.scss';

const slides = ['/images/hero-wedding-garlands.jpg', '/images/hero-couple-petals.jpg', '/images/hero-couple-outdoor.jpg'];

const pwSchema = z.object({
    identifier: z.string().trim().min(1, 'Enter your email or phone number'),
    password: z.string().min(1, 'Please enter your password'),
    studio: z.string().trim().max(80),
});

export const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null);

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [showStudio, setShowStudio] = useState(false);
    const [error, setError] = useState('');
    const [slide, setSlide] = useState(0);

    const { login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = safeNext(params.get('next'));

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const timer = window.setInterval(() => setSlide((current) => (current + 1) % slides.length), 7000);
        return () => window.clearInterval(timer);
    }, []);

    const pw = useForm<z.infer<typeof pwSchema>>({
        resolver: zodResolver(pwSchema),
        defaultValues: { identifier: '', password: '', studio: '' },
    });

    const submitPassword = pw.handleSubmit(async (v) => {
        setError('');
        try {
            const s = await login(v.identifier, v.password, v.studio);
            navigate(next ?? s.home, { replace: true });
        } catch (e) {
            setError(errorMessage(e));
        }
    });

    return (
        <div className="login-page">
            <div className="login-page__media" aria-hidden>
                {slides.map((src, index) => (
                    <img key={src} src={src} alt="" className={`login-page__photo${index === slide ? ' is-active' : ''}`} />
                ))}
                <div className="login-page__shade" />
            </div>

            <main className="login-page__content d-flex align-items-center justify-content-center">
                <div className="login-page__panel">
                    <img src="/nammaqr-logo.png" alt="Nammaqr Photography" className="login-page__logo" />
                    <div className="card login-page__card">
                        <div className="card-body p-4 p-sm-5">
                            <h1 className="h3 text-center mb-1">Sign in</h1>
                            <p className="text-center text-secondary mb-4">Use the email or phone number on your account.</p>

                            {error && (
                                <div className="alert alert-danger d-flex align-items-start gap-2" role="alert">
                                    <AlertCircle className="mt-1 flex-shrink-0" size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={submitPassword} noValidate>
                                <div className="mb-3">
                                    <label htmlFor="identifier" className="form-label">Email or phone</label>
                                    <input
                                        id="identifier"
                                        {...pw.register('identifier')}
                                        type="text"
                                        autoComplete="username"
                                        autoFocus
                                        placeholder="name@studio.com or 10-digit phone"
                                        className="form-control"
                                    />
                                    {pw.formState.errors.identifier && <div className="invalid-feedback d-block">{pw.formState.errors.identifier.message}</div>}
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="password" className="form-label">Password</label>
                                    <div className="login-page__password">
                                        <span className="login-page__icon"><Lock size={16} /></span>
                                        <input
                                            id="password"
                                            {...pw.register('password')}
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder="Enter your password"
                                            className="form-control"
                                        />
                                        <button type="button" onClick={() => setShowPassword((open) => !open)} className="login-page__toggle" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {pw.formState.errors.password && <div className="invalid-feedback d-block">{pw.formState.errors.password.message}</div>}
                                </div>

                                {showStudio && (
                                    <div className="mb-3">
                                        <label htmlFor="studio" className="form-label">Studio code</label>
                                        <input id="studio" {...pw.register('studio')} type="text" autoComplete="organization" placeholder="sunrise-studio" className="form-control" />
                                    </div>
                                )}

                                <button type="submit" disabled={pw.formState.isSubmitting} className="btn btn-primary w-100 mt-2">
                                    {pw.formState.isSubmitting ? <Loader2 className="me-2" size={16} /> : null}
                                    {pw.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
                                </button>

                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    <Link to="/forgot-password">Forgot password</Link>
                                    <button type="button" onClick={() => setShowStudio((open) => !open)} className="btn btn-link text-secondary p-0">
                                        {showStudio ? 'Hide studio code' : 'Another studio?'}
                                    </button>
                                </div>
                            </form>

                            <p className="text-center text-secondary mt-4 mb-0">
                                New studio? <Link to="/register">Register your company</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
