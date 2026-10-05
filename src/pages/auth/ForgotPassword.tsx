import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, KeyRound, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { emailRule } from '../../lib/validation';

const schema = z.object({ email: emailRule });

export default function ForgotPassword() {
    const [sent, setSent] = useState<{ message: string; devResetLink?: string } | null>(null);
    const [error, setError] = useState('');
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

    const onSubmit = handleSubmit(async (v) => {
        setError('');
        try {
            const { data, message } = await api.send<{ sent: boolean; devResetLink?: string }>('POST', '/api/auth/forgot-password', v);
            setSent({ message, devResetLink: data.devResetLink });
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
                    <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Reset password</h1>
                    <p className="text-xs text-slate-400">Enter your email for a secure reset link</p>
                </div>
            </div>

            {sent ? (
                <div className="space-y-4">
                    <Alert tone="success">{sent.message}</Alert>
                    {sent.devResetLink && (
                        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-200">
                            <p className="font-semibold text-blue-300 mb-1">Development mode:</p>
                            <Link to={sent.devResetLink} className="text-blue-400 underline underline-offset-2 break-all hover:text-blue-300">
                                Open reset page
                            </Link>
                        </div>
                    )}
                    <Link
                        to="/login"
                        className="mt-4 inline-flex items-center justify-center gap-2 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="size-3.5" />
                        Back to sign in
                    </Link>
                </div>
            ) : (
                <form onSubmit={onSubmit} noValidate className="space-y-4">
                    {error && (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Account email
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                                <Mail className="size-4" />
                            </span>
                            <input
                                {...register('email')}
                                type="email"
                                autoComplete="email"
                                autoFocus
                                placeholder="name@photolab.test"
                                className="w-full rounded-xl border border-slate-700/70 bg-[#091120]/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                            />
                        </div>
                        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin" />
                                Sending reset link...
                            </span>
                        ) : (
                            <span>Send reset link</span>
                        )}
                    </button>

                    <div className="pt-2 text-center">
                        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                            <ArrowLeft className="size-3.5" />
                            Back to sign in
                        </Link>
                    </div>
                </form>
            )}
        </div>
    );
}
