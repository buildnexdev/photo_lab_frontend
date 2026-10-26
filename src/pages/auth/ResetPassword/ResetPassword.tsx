// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, KeyRound, Lock, Mail } from 'lucide-react';
import { NqLoader } from '../../../components/brand';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Alert } from '../../../components/ui';
import { api, errorMessage } from '../../../services/api';
import { emailRule, passwordRule } from '../../../helpers/validation';
import './ResetPassword.scss';

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
            <div className="reset-password auth-card">
                <h1>Invalid reset link</h1>
                <div className="alert alert-danger">
                    This password reset link is incomplete or has expired.
                </div>
                <Link to="/forgot-password" className="btn btn-primary w-full">
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
        <div className="reset-password auth-card">
            <div className="reset-password__head">
                <div className="reset-password__mark">
                    <KeyRound size={24} />
                </div>
                <div>
                    <h1>Set new password</h1>
                    <p>Choose a secure password for your account</p>
                </div>
            </div>

            {done ? (
                <div className="reset-password__done">
                    <Alert tone="success">{done}</Alert>
                    <Link to="/login" className="btn btn-primary w-full">
                        Sign in with new password <ArrowRight size={16} />
                    </Link>
                </div>
            ) : (
                <form onSubmit={onSubmit} noValidate className="reset-password__form">
                    {error && (
                        <div className="alert alert-danger">
                            {error}{' '}
                            <Link to="/forgot-password" className="reset-password__link">
                                Request a new link
                            </Link>
                        </div>
                    )}

                    <div>
                        <label className="form-label">Email</label>
                        <div className="reset-password__field">
                            <Mail size={16} />
                            <input {...register('email')} type="email" autoComplete="email" className="form-control" />
                        </div>
                        {errors.email && <p className="reset-password__error">{errors.email.message}</p>}
                    </div>

                    <div>
                        <label className="form-label">New Password</label>
                        <div className="reset-password__field">
                            <Lock size={16} />
                            <input {...register('password')} type="password" autoComplete="new-password" placeholder="••••••••" className="form-control" />
                        </div>
                        {errors.password && <p className="reset-password__error">{errors.password.message}</p>}
                    </div>

                    <div>
                        <label className="form-label">Confirm Password</label>
                        <div className="reset-password__field">
                            <Lock size={16} />
                            <input {...register('confirm')} type="password" autoComplete="new-password" placeholder="••••••••" className="form-control" />
                        </div>
                        {errors.confirm && <p className="reset-password__error">{errors.confirm.message}</p>}
                    </div>

                    <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
                        {isSubmitting ? (
                            <>
                                <NqLoader size="xs" label="" aria-hidden />
                                Updating...
                            </>
                        ) : (
                            'Update password'
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
