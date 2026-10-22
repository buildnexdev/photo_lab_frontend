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
import './ForgotPassword.scss';

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
        <div className="forgot-password auth-card">
            <img src="/nammaqr-logo.png" alt="Nammaqr" className="forgot-password__logo" />
            <div className="forgot-password__head">
                <KeyRound size={20} />
                <div>
                    <h1>Reset password</h1>
                    <p>
                        {step === 'email' && 'Enter the email on your account. We will send a code.'}
                        {step === 'otp' && `Enter the code sent to ${email}.`}
                        {step === 'password' && 'Code verified. Choose a new password.'}
                        {step === 'done' && 'Your password has been updated.'}
                    </p>
                </div>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            {devCode && step === 'otp' && (
                <div className="forgot-password__dev">
                    Development code: <strong>{devCode}</strong>
                </div>
            )}

            {step === 'email' && (
                <form onSubmit={sendCode} className="forgot-password__form" noValidate>
                    <label className="form-label">Email</label>
                    <div className="forgot-password__field">
                        <Mail size={16} />
                        <input {...emailForm.register('email')} type="email" autoFocus className="form-control" placeholder="name@studio.com" />
                    </div>
                    {emailForm.formState.errors.email && <p className="forgot-password__error">{emailForm.formState.errors.email.message}</p>}
                    <button disabled={emailForm.formState.isSubmitting} className="btn btn-primary w-100">
                        {emailForm.formState.isSubmitting && <Loader2 className="auth-spin" size={16} />} Send code
                    </button>
                </form>
            )}

            {step === 'otp' && (
                <form onSubmit={verifyCode} className="forgot-password__form" noValidate>
                    <label className="form-label">6 digit code</label>
                    <input {...codeForm.register('code')} inputMode="numeric" maxLength={6} autoFocus className="form-control text-center fs-5" placeholder="000000" />
                    {codeForm.formState.errors.code && <p className="forgot-password__error">{codeForm.formState.errors.code.message}</p>}
                    <button disabled={codeForm.formState.isSubmitting} className="btn btn-primary w-100">
                        {codeForm.formState.isSubmitting && <Loader2 className="auth-spin" size={16} />} Verify code
                    </button>
                </form>
            )}

            {step === 'password' && (
                <form onSubmit={savePassword} className="forgot-password__form" noValidate>
                    <label className="form-label">New password</label>
                    <input {...passwordForm.register('password')} type="password" autoFocus className="form-control" />
                    {passwordForm.formState.errors.password && <p className="forgot-password__error">{passwordForm.formState.errors.password.message}</p>}
                    <label className="form-label">Confirm password</label>
                    <input {...passwordForm.register('confirm')} type="password" className="form-control" />
                    {passwordForm.formState.errors.confirm && <p className="forgot-password__error">{passwordForm.formState.errors.confirm.message}</p>}
                    <button disabled={passwordForm.formState.isSubmitting} className="btn btn-primary w-100">
                        {passwordForm.formState.isSubmitting && <Loader2 className="auth-spin" size={16} />} Update password
                    </button>
                </form>
            )}

            {step === 'done' && (
                <button type="button" onClick={() => navigate('/login')} className="btn btn-primary w-100">
                    Back to sign in
                </button>
            )}

            {step !== 'done' && (
                <Link to="/login" className="forgot-password__back">
                    <ArrowLeft size={14} /> Back to sign in
                </Link>
            )}
        </div>
    );
}
