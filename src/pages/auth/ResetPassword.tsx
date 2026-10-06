// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { emailRule, passwordRule } from '../../lib/validation';

const schema = z
    .object({ email: emailRule, password: passwordRule, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export default function ResetPassword() {
    const [params] = useSearchParams();
    const token = params.get('token') ?? '';
    const [done, setDone] = useState('');
    const [error, setError] = useState('');
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: params.get('email') ?? '' } });

    if (token.length < 10) {
        return (
            <div className="relative w-full max-w-[460px] mx-auto rounded-3xl border border-white/10 bg-[#0d1728]/85 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-black/60 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/60 before:to-transparent text-white space-y-4">
                <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Invalid reset link</h1>
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
                    This password reset link is incomplete or has expired.
                </div>
                <Link
                    to="/forgot-password"
                    className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 text-xs transition-colors"
                >
                    Request a new link
                </Link>
            </div>
        );
    }

    const onSubmit = handleSubmit(async (v) => {
        setError('');
        try {
            const { message } = await api.send('POST', '/api/auth/reset-password', { email: v.email, token, password: v.password });
            setDone(message);
        } catch (e) {
            setError(errorMessage(e));
        }
    });

    return (
        <div className="relative w-full max-w-[460px] mx-auto rounded-3xl border border-white/10 bg-[#0d1728]/85 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-black/60 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/60 before:to-transparent text-white">
            <div className="flex items-center gap-3.5 mb-6">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
                    <KeyRound className="size-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Set new password</h1>
                    <p className="text-xs text-slate-400">Choose a secure password for your account</p>
                </div>
            </div>

            {done ? (
                <div className="space-y-4">
                    <Alert tone="success">{done}</Alert>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 text-sm transition-colors"
                    >
                        <span>Sign in with new password</span>
                        <ArrowRight className="size-4" />
                    </Link>
                </div>
            ) : (
                <form onSubmit={onSubmit} noValidate className="space-y-4">
                    {error && (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                            {error}{' '}
                            <Link to="/forgot-password" className="text-blue-400 underline underline-offset-2 ml-1">
                                Request a new link
                            </Link>
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Email
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                                <Mail className="size-4" />
                            </span>
                            <input
                                {...register('email')}
                                type="email"
                                autoComplete="email"
                                className="w-full rounded-xl border border-slate-700/70 bg-[#091120]/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                            />
                        </div>
                        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            New Password
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
                            Confirm Password
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

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin" />
                                Updating...
                            </span>
                        ) : (
                            <span>Update password</span>
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
