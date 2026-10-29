// Developer by: Buildnexdev.in
// Last Edited : 29-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Building2, CheckCircle2, FileText, Mail, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { BrandMark, NqLoader } from '../../../components/brand';
import { BRAND_NAME, BRAND_TAGLINE } from '../../../lib/brand';
import { api, errorMessage } from '../../../services/api';
import './Register.scss';

const requestSchema = z.object({
    companyName: z.string().trim().min(2, 'Enter your studio or company name').max(120),
    phone: z
        .string()
        .trim()
        .transform((v) => v.replace(/\D/g, ''))
        .pipe(z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number')),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    notes: z.string().trim().max(1000).optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

export default function Register() {
    const [done, setDone] = useState<{ companyName: string; phone: string; email: string } | null>(null);
    const [error, setError] = useState('');

    const form = useForm<RequestForm>({
        resolver: zodResolver(requestSchema),
        defaultValues: { companyName: '', phone: '', email: '', notes: '' },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        setError('');
        try {
            await api.post('/api/public/companies/request', values);
            setDone({
                companyName: values.companyName,
                phone: values.phone,
                email: values.email,
            });
        } catch (e) {
            setError(errorMessage(e, 'Failed to submit registration request. Please try again.'));
        }
    });

    return (
        <div className="register-page-wrapper">
            <div className="register-card">
                <div className="register-header">
                    <BrandMark className="register-logo" />
                    <h1 className="register-title">Register your studio</h1>
                    <p className="register-subtitle">
                        Get started with {BRAND_NAME} — {BRAND_TAGLINE}
                    </p>
                </div>

                {done ? (
                    <div className="register-success-view">
                        <div className="register-success-icon">
                            <CheckCircle2 className="size-12 text-emerald-500" />
                        </div>
                        <h2>Request Received!</h2>
                        <p className="register-success-text">
                            Thank you, <strong className="text-stone-900">{done.companyName}</strong>. Your registration request has been submitted to our platform team.
                        </p>
                        <div className="register-success-details">
                            <div className="detail-row">
                                <Phone className="size-4 text-stone-400" />
                                <span>{done.phone}</span>
                            </div>
                            <div className="detail-row">
                                <Mail className="size-4 text-stone-400" />
                                <span>{done.email}</span>
                            </div>
                        </div>
                        <p className="register-success-hint">
                            We will contact you shortly to configure your services and hand over your studio credentials.
                        </p>
                        <Link to="/login" className="register-btn register-btn--primary">
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={onSubmit} className="register-form" noValidate>
                        {error && (
                            <div className="register-alert register-alert--error" role="alert">
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="register-field">
                            <label htmlFor="companyName" className="register-label">
                                Company / Studio Name <span className="req">*</span>
                            </label>
                            <div className="register-input-wrap">
                                <Building2 className="register-input-icon size-4" />
                                <input
                                    id="companyName"
                                    type="text"
                                    autoFocus
                                    placeholder="e.g. Sunrise Wedding Photography"
                                    className="register-input"
                                    {...form.register('companyName')}
                                />
                            </div>
                            {form.formState.errors.companyName && (
                                <p className="register-field-error">{form.formState.errors.companyName.message}</p>
                            )}
                        </div>

                        <div className="register-field">
                            <label htmlFor="phone" className="register-label">
                                Phone Number <span className="req">*</span>
                            </label>
                            <div className="register-input-wrap">
                                <Phone className="register-input-icon size-4" />
                                <input
                                    id="phone"
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    placeholder="e.g. 9876543210"
                                    className="register-input"
                                    {...form.register('phone')}
                                />
                            </div>
                            {form.formState.errors.phone && (
                                <p className="register-field-error">{form.formState.errors.phone.message}</p>
                            )}
                        </div>

                        <div className="register-field">
                            <label htmlFor="email" className="register-label">
                                Mail ID <span className="req">*</span>
                            </label>
                            <div className="register-input-wrap">
                                <Mail className="register-input-icon size-4" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="e.g. studio@example.com"
                                    className="register-input"
                                    {...form.register('email')}
                                />
                            </div>
                            {form.formState.errors.email && (
                                <p className="register-field-error">{form.formState.errors.email.message}</p>
                            )}
                        </div>

                        <div className="register-field">
                            <label htmlFor="notes" className="register-label">
                                Notes 📝 <span className="opt">(Optional)</span>
                            </label>
                            <div className="register-input-wrap">
                                <textarea
                                    id="notes"
                                    rows={3}
                                    placeholder="Tell us about your studio, required services, or any specific requirements..."
                                    className="register-textarea"
                                    {...form.register('notes')}
                                />
                            </div>
                            {form.formState.errors.notes && (
                                <p className="register-field-error">{form.formState.errors.notes.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            className="register-btn register-btn--primary"
                        >
                            {form.formState.isSubmitting ? (
                                <>
                                    <NqLoader size="xs" aria-hidden label="" />
                                    Submitting request…
                                </>
                            ) : (
                                <>
                                    <Send className="size-4" />
                                    Submit Registration Request
                                </>
                            )}
                        </button>

                        <div className="register-footer">
                            <Link to="/login" className="register-login-link">
                                <ArrowLeft className="size-3.5" /> Already registered? Sign in
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
