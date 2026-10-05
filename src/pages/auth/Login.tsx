// AUTHOR: NANDHAKUMAR
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Phone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';

const pwSchema = z.object({
    identifier: z.string().trim().min(1, 'Please enter your phone number'),
    password: z.string().min(1, 'Please enter your password'),
});

export const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null);

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = safeNext(params.get('next'));

    const pw = useForm<z.infer<typeof pwSchema>>({
        resolver: zodResolver(pwSchema),
        defaultValues: { identifier: '', password: '' },
    });

    const submitPassword = pw.handleSubmit(async (v) => {
        setError('');
        try {
            const s = await login(v.identifier, v.password);
            navigate(next ?? s.home, { replace: true });
        } catch (e) {
            setError(errorMessage(e));
        }
    });

    return (
        <div className="relative min-h-dvh w-full flex items-center justify-center p-4 overflow-hidden select-none bg-stone-950 font-sans selection:bg-amber-500 selection:text-stone-950">
            {/* Stable Single Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/images/hero-wedding-garlands.jpg"
                    alt="FlashLight Photography"
                    className="size-full object-cover object-[center_32%] filter brightness-[0.42] contrast-[1.05]"
                    draggable={false}
                />
                {/* Vignette and ambient dark overlays */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
            </div>

            {/* Centered Minimal Luxury Card */}
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/15 bg-black/65 backdrop-blur-xl p-8 sm:p-10 shadow-2xl">
                {/* Studio Logo & Header */}
                <div className="text-center mb-8">
                    <img
                        src="/images/flashlight-emblem.png"
                        alt="FlashLight Photography"
                        className="h-12 w-auto mx-auto mb-3 filter drop-shadow-[0_2px_12px_rgba(245,158,11,0.5)]"
                    />
                    <h1 className="font-serif text-2xl sm:text-3xl font-normal text-white tracking-wide">
                        Flash Light
                    </h1>
                    <p className="mt-1 text-[10px] font-sans font-light tracking-[0.35em] text-amber-400 uppercase">
                        Photography
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
                        <AlertCircle className="size-4 shrink-0 text-red-400 mt-0.5" />
                        <div className="flex-1">{error}</div>
                    </div>
                )}

                {/* Login Form: ONLY Phone Number, Password, and Login Button */}
                <form onSubmit={submitPassword} noValidate className="space-y-5">
                    {/* Phone Number */}
                    <div>
                        <label className="mb-2 block text-xs font-sans font-medium uppercase tracking-[0.15em] text-stone-300">
                            Phone Number
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-400">
                                <Phone className="size-4" />
                            </span>
                            <input
                                {...pw.register('identifier')}
                                type="text"
                                autoComplete="tel"
                                autoFocus
                                placeholder="Enter your phone number"
                                className="w-full rounded-xl border border-white/15 bg-white/[0.05] pl-10 pr-4 py-3 text-sm text-white placeholder-stone-500 focus:border-amber-400 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
                            />
                        </div>
                        {pw.formState.errors.identifier && (
                            <p className="mt-1.5 text-xs text-red-400">
                                {pw.formState.errors.identifier.message}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="mb-2 block text-xs font-sans font-medium uppercase tracking-[0.15em] text-stone-300">
                            Password
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-400">
                                <Lock className="size-4" />
                            </span>
                            <input
                                {...pw.register('password')}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                className="w-full rounded-xl border border-white/15 bg-white/[0.05] pl-10 pr-11 py-3 text-sm text-white placeholder-stone-500 focus:border-amber-400 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-3.5 flex items-center text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        {pw.formState.errors.password && (
                            <p className="mt-1.5 text-xs text-red-400">
                                {pw.formState.errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={pw.formState.isSubmitting}
                        className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold py-3.5 px-6 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 cursor-pointer text-xs uppercase tracking-[0.25em]"
                    >
                        {pw.formState.isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin" />
                                <span>Logging In...</span>
                            </span>
                        ) : (
                            <span>Login</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
