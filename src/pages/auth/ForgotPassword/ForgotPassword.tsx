// Developer by: Buildnexdev.in
// Last Edited : 21-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, KeyRound, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { api, errorMessage } from '../../../services/api';
import { emailRule, passwordRule } from '../../../helpers/validation';
import logo from '../../../assets/NammaqrLogo.png';

const emailSchema = z.object({ email: emailRule });
const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6 digit code') });
const passwordSchema = z
    .object({ password: passwordRule, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [devCode, setDevCode] = useState('');
    const [error, setError] = useState('');

    const emailForm = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });
    const codeForm = useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema) });
    const passwordForm = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

    const sendCode = emailForm.handleSubmit(async (v) => {
        setError('');
        try {
            const { data } = await api.send<{ sent: boolean; devCode?: string }>('POST', '/api/auth/forgot-password', v);
            setEmail(v.email);
            setDevCode(data.devCode ?? '');
            setStep('otp');
        } catch (e) {
            setError(errorMessage(e));
        }
    });

    const verifyCode = codeForm.handleSubmit(async (v) => {
        setError('');
        try {
            const data = await api.post<{ resetToken: string }>('/api/auth/forgot-password/verify', { email, code: v.code });
            setResetToken(data.resetToken);
            setStep('password');
        } catch (e) {
            setError(errorMessage(e));
        }
    });

    const savePassword = passwordForm.handleSubmit(async (v) => {
        setError('');
        try {
            await api.post('/api/auth/reset-password', { email, token: resetToken, password: v.password });
            setStep('done');
        } catch (e) {
            setError(errorMessage(e));
        }
    });

    return (
        <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-black/70 p-8 text-white shadow-2xl">
            <img src={logo} alt="Nammaqr" className="mx-auto mb-4 h-20 w-auto object-contain" />
            <div className="mb-6 flex items-center gap-3">
                <KeyRound className="size-5 text-amber-400" />
                <div>
                    <h1 className="text-xl font-semibold">Reset password</h1>
                    <p className="text-xs text-stone-400">
                        {step === 'email' && 'Enter the email on your account. We will send a code.'}
                        {step === 'otp' && `Enter the code sent to ${email}.`}
                        {step === 'password' && 'Code verified. Choose a new password.'}
                        {step === 'done' && 'Your password has been updated.'}
                    </p>
                </div>
            </div>
            {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}
            {devCode && step === 'otp' && (
                <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                    Development code: <span className="font-semibold tracking-widest">{devCode}</span>
                </div>
            )}

            {step === 'email' && (
                <form onSubmit={sendCode} className="space-y-4" noValidate>
                    <label className="block text-xs uppercase tracking-[0.14em] text-stone-300">Email</label>
                    <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-3 size-4 text-stone-400" />
                        <input {...emailForm.register('email')} type="email" autoFocus className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm outline-none focus:border-amber-400" placeholder="name@studio.com" />
                    </div>
                    {emailForm.formState.errors.email && <p className="text-xs text-red-400">{emailForm.formState.errors.email.message}</p>}
                    <button disabled={emailForm.formState.isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-950 disabled:opacity-60">
                        {emailForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />} Send code
                    </button>
                </form>
            )}

            {step === 'otp' && (
                <form onSubmit={verifyCode} className="space-y-4" noValidate>
                    <label className="block text-xs uppercase tracking-[0.14em] text-stone-300">6 digit code</label>
                    <input {...codeForm.register('code')} inputMode="numeric" maxLength={6} autoFocus className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-amber-400" placeholder="000000" />
                    {codeForm.formState.errors.code && <p className="text-xs text-red-400">{codeForm.formState.errors.code.message}</p>}
                    <button disabled={codeForm.formState.isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-950 disabled:opacity-60">
                        {codeForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />} Verify code
                    </button>
                </form>
            )}

            {step === 'password' && (
                <form onSubmit={savePassword} className="space-y-4" noValidate>
                    <label className="block text-xs uppercase tracking-[0.14em] text-stone-300">New password</label>
                    <input {...passwordForm.register('password')} type="password" autoFocus className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none focus:border-amber-400" />
                    {passwordForm.formState.errors.password && <p className="text-xs text-red-400">{passwordForm.formState.errors.password.message}</p>}
                    <label className="block text-xs uppercase tracking-[0.14em] text-stone-300">Confirm password</label>
                    <input {...passwordForm.register('confirm')} type="password" className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none focus:border-amber-400" />
                    {passwordForm.formState.errors.confirm && <p className="text-xs text-red-400">{passwordForm.formState.errors.confirm.message}</p>}
                    <button disabled={passwordForm.formState.isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-950 disabled:opacity-60">
                        {passwordForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />} Update password
                    </button>
                </form>
            )}

            {step === 'done' && (
                <button type="button" onClick={() => navigate('/login')} className="w-full rounded-xl bg-amber-400 py-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-950">
                    Back to sign in
                </button>
            )}

            {step !== 'done' && (
                <Link to="/login" className="mt-5 inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-200">
                    <ArrowLeft className="size-3.5" /> Back to sign in
                </Link>
            )}
        </div>
    );
}
