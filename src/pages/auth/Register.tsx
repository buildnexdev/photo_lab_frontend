import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, Lock, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { applyFieldErrors, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { emailRule, optionalPhone, passwordRule } from '../../lib/validation';
import { safeNext } from './Login';

const schema = z
    .object({
        name: z.string().trim().min(2, 'Enter your full name').max(120),
        email: emailRule,
        phone: optionalPhone.optional(),
        password: passwordRule,
        confirm: z.string(),
        terms: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms to continue' }) }),
    })
    .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export default function Register() {
    const { register: signUp } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = safeNext(params.get('next'));
    const [error, setError] = useState('');
    const {
        register,
        handleSubmit,
        setError: setFieldError,
        formState: { errors, isSubmitting },
    } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

    const onSubmit = handleSubmit(async (v) => {
        setError('');
        try {
            const s = await signUp({ name: v.name, email: v.email, phone: v.phone || undefined, password: v.password });
            navigate(next ?? s.home, { replace: true });
        } catch (e) {
            if (!applyFieldErrors(e, setFieldError as never)) setError(errorMessage(e));
        }
    });

    return (
        <div className="relative w-full max-w-[480px] mx-auto rounded-3xl border border-white/10 bg-[#0d1728]/85 backdrop-blur-2xl p-6 sm:p-9 shadow-2xl shadow-black/60 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/60 before:to-transparent text-white">
            <div className="flex items-center gap-3.5 mb-6">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
                    <ShieldCheck className="size-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Create your account</h1>
                    <p className="text-xs text-slate-400">Track bookings & interactive galleries</p>
                </div>
            </div>

            {error && (
                <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
                    {error}
                </div>
            )}

            <form onSubmit={onSubmit} noValidate className="space-y-4">
                <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Full Name <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                            <User className="size-4" />
                        </span>
                        <input
                            {...register('name')}
                            type="text"
                            autoComplete="name"
                            placeholder="John Doe"
                            className="w-full rounded-xl border border-slate-700/70 bg-[#091120]/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                        />
                    </div>
                    {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
                </div>

                <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Email Address <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                            <Mail className="size-4" />
                        </span>
                        <input
                            {...register('email')}
                            type="email"
                            autoComplete="email"
                            placeholder="name@example.com"
                            className="w-full rounded-xl border border-slate-700/70 bg-[#091120]/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                        />
                    </div>
                    {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                </div>

                <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Phone (Optional)
                    </label>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                            <Phone className="size-4" />
                        </span>
                        <input
                            {...register('phone')}
                            type="tel"
                            autoComplete="tel"
                            placeholder="+1 234 567 8900"
                            className="w-full rounded-xl border border-slate-700/70 bg-[#091120]/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                        />
                    </div>
                    {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Password <span className="text-blue-400">*</span>
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                                <Lock className="size-4" />
                            </span>
                            <input
                                {...register('password')}
                                type="password"
                                autoComplete="new-password"
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-slate-700/70 bg-[#091120]/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                            />
                        </div>
                        {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Confirm <span className="text-blue-400">*</span>
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                                <Lock className="size-4" />
                            </span>
                            <input
                                {...register('confirm')}
                                type="password"
                                autoComplete="new-password"
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-slate-700/70 bg-[#091120]/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                            />
                        </div>
                        {errors.confirm && <p className="mt-1 text-xs text-red-400">{errors.confirm.message}</p>}
                    </div>
                </div>

                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                    <input
                        type="checkbox"
                        {...register('terms')}
                        className="mt-0.5 size-4 rounded border-slate-700 bg-[#091120] text-blue-600 focus:ring-blue-500/30"
                    />
                    <span className="text-xs text-slate-300 leading-snug">
                        I agree to BuildNexDev Studio terms & client policies
                    </span>
                </label>
                {errors.terms && <p className="text-xs text-red-400">{errors.terms.message}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 cursor-pointer"
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin" />
                            Creating account...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <span>Create account</span>
                            <ArrowRight className="size-4" />
                        </span>
                    )}
                </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/5 text-center text-xs text-slate-400">
                Already have an account?{' '}
                <Link
                    to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}
                    className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                    Sign in
                </Link>
            </div>
        </div>
    );
}
