// Developer by: Buildnexdev.in
// Last Edited : 21-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { api, applyFieldErrors, errorMessage } from '../../../services/api';
import { emailRule, passwordRule } from '../../../helpers/validation';
import './Register.scss';

const MODULES = [
    { code: 'asset', label: 'Asset management', text: 'Cameras, lenses and studio equipment.' },
    { code: 'staff', label: 'Staff management', text: 'Photographers, editors and assignments.' },
    { code: 'event', label: 'Event management', text: 'Bookings, events and QR galleries.' },
    { code: 'report', label: 'Report', text: 'Studio reports.' },
    { code: 'ecommerce', label: 'Ecommerce', text: 'Prints, products and online orders.' },
] as const;

type ModuleCode = (typeof MODULES)[number]['code'];

const detailsSchema = z.object({
    phone: z.string().trim().regex(/^\d{10}$/, 'Enter a 10-digit phone number'),
    name: z.string().trim().min(2, 'Enter the company name').max(120),
    address: z.string().trim().min(5, 'Enter the address').max(300),
    ownerName: z.string().trim().min(2, 'Enter the owner name').max(120),
    ownerEmail: emailRule,
    password: passwordRule,
    gstNumber: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid GST number'),
    aboutUs: z.string().trim().min(10, 'Tell us a little about the studio').max(2000),
    aadhaarNumber: z.string().trim().regex(/^\d{12}$/, 'Aadhaar number must be 12 digits'),
    panNumber: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN number'),
});

type Details = z.infer<typeof detailsSchema>;
type Checkout = { signupId: number };
type Done = { slug?: string; databaseName?: string; name?: string; emailSent?: boolean };

export default function Register() {
    const [step, setStep] = useState<'phone' | 'details' | 'modules' | 'done'>('phone');
    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [checkingPhone, setCheckingPhone] = useState(false);
    const [logoData, setLogoData] = useState('');
    const [logoError, setLogoError] = useState('');
    const [modules, setModules] = useState<ModuleCode[]>(['report']);
    const [done, setDone] = useState<Done | null>(null);
    const [error, setError] = useState('');
    const [paying, setPaying] = useState(false);
    const form = useForm<Details>({ resolver: zodResolver(detailsSchema) });

    const readLogo = (file: File | undefined) => {
        setLogoError('');
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
            setLogoError('Use a PNG, JPG or WEBP logo.');
            return;
        }
        if (file.size > 1_200_000) {
            setLogoError('Logo must be smaller than 1.2 MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setLogoData(String(reader.result || ''));
        reader.readAsDataURL(file);
    };

    const payload = (values: Details) => ({
        ...values,
        phone: values.phone.replace(/[\s-]/g, ''),
        logo: logoData,
        modules,
    });

    const checkPhone = async (event: FormEvent) => {
        event.preventDefault();
        const digits = phone.replace(/\D/g, '');
        if (!/^\d{10}$/.test(digits)) {
            setPhoneError('Enter a 10-digit phone number.');
            return;
        }
        setPhoneError('');
        setError('');
        setCheckingPhone(true);
        try {
            await api.post('/api/public/companies/check-phone', { phone: digits });
            form.setValue('phone', digits, { shouldValidate: true });
            setStep('details');
        } catch (e) {
            setPhoneError(errorMessage(e, 'This phone number already exists. Enter a new number.'));
        } finally {
            setCheckingPhone(false);
        }
    };

    const nextDetails = form.handleSubmit(async (values) => {
        setError('');
        if (!logoData) {
            setLogoError('Upload the company logo.');
            return;
        }
        try {
            await api.post('/api/public/companies/check', payload(values));
            setStep('modules');
        } catch (e) {
            if (!applyFieldErrors(e, form.setError as never)) setError(errorMessage(e));
        }
    });

    const registerCompany = async () => {
        setError('');
        if (!modules.length) {
            setError('Select at least one module.');
            return;
        }
        setPaying(true);
        try {
            const intent = await api.post<Checkout>('/api/public/companies/checkout', payload(form.getValues()));
            setDone(await api.post<Done>('/api/public/companies/complete', { signupId: intent.signupId }));
            setStep('done');
        } catch (e) {
            if (!applyFieldErrors(e, form.setError as never)) setError(errorMessage(e));
        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="register-page auth-card auth-card--wide">
            <div className="register-page__brand">
                <img src="/nammaqr-logo.png" alt="Nammaqr" />
                <h1>Register your company</h1>
                <p>Nammaqr Photography</p>
            </div>
            <div className="register-page__steps">
                {(['phone', 'details', 'modules', 'done'] as const).map((item, i) => (
                    <span key={item} className={step === item ? 'is-active' : ''}>{i + 1}. {item}</span>
                ))}
            </div>
            {error && <div className="alert alert-danger">{error}</div>}

            {step === 'phone' && (
                <form onSubmit={checkPhone} className="register-page__form" noValidate>
                    <Field label="Phone number" error={phoneError}>
                        <input
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                                setPhoneError('');
                            }}
                            inputMode="numeric"
                            autoComplete="tel"
                            maxLength={10}
                            autoFocus
                            className="form-control"
                            placeholder="9876543210"
                        />
                    </Field>
                    <p className="register-page__hint">Enter 10 digits. We check this number before opening registration.</p>
                    <button disabled={checkingPhone || phone.length !== 10} className="btn btn-primary w-100">
                        {checkingPhone && <Loader2 className="auth-spin" size={16} />} Continue
                    </button>
                </form>
            )}

            {step === 'details' && (
                <form onSubmit={nextDetails} className="register-page__grid" noValidate>
                    <Field label="Phone number" error={form.formState.errors.phone?.message}>
                        <input {...form.register('phone')} readOnly className="form-control" />
                    </Field>
                    <Field label="Company name" error={form.formState.errors.name?.message}><input {...form.register('name')} className="form-control" placeholder="Wass Photo" /></Field>
                    <Field label="Owner name" error={form.formState.errors.ownerName?.message}><input {...form.register('ownerName')} className="form-control" /></Field>
                    <Field label="Owner email" error={form.formState.errors.ownerEmail?.message}><input {...form.register('ownerEmail')} type="email" className="form-control" /></Field>
                    <Field label="Password" error={form.formState.errors.password?.message}><input {...form.register('password')} type="password" className="form-control" /></Field>
                    <Field label="GST number" error={form.formState.errors.gstNumber?.message}><input {...form.register('gstNumber')} className="form-control" /></Field>
                    <Field label="Aadhaar number" error={form.formState.errors.aadhaarNumber?.message}><input {...form.register('aadhaarNumber')} className="form-control" maxLength={12} /></Field>
                    <Field label="PAN number" error={form.formState.errors.panNumber?.message}><input {...form.register('panNumber')} className="form-control" /></Field>
                    <div className="register-page__wide">
                        <Field label="Address" error={form.formState.errors.address?.message}><textarea {...form.register('address')} rows={2} className="form-control" /></Field>
                    </div>
                    <div className="register-page__wide">
                        <Field label="About us" error={form.formState.errors.aboutUs?.message}><textarea {...form.register('aboutUs')} rows={3} className="form-control" /></Field>
                    </div>
                    <div className="register-page__wide">
                        <label className="form-label">Company logo</label>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => readLogo(e.target.files?.[0])} className="register-page__file" />
                        {logoData && <img src={logoData} alt="Logo preview" className="register-page__logo" />}
                        {logoError && <p className="register-page__error">{logoError}</p>}
                    </div>
                    <div className="register-page__actions register-page__wide">
                        <button type="button" onClick={() => setStep('phone')} className="register-page__back">Back</button>
                        <button disabled={form.formState.isSubmitting} className="btn btn-primary flex-grow-1">
                            {form.formState.isSubmitting && <Loader2 className="auth-spin" size={16} />} Continue
                        </button>
                    </div>
                </form>
            )}

            {step === 'modules' && (
                <div className="register-page__stack">
                    <div className="register-page__modules">
                        {MODULES.map((item) => {
                            const on = modules.includes(item.code);
                            return (
                                <button
                                    key={item.code}
                                    type="button"
                                    onClick={() => setModules((current) => (on ? current.filter((code) => code !== item.code) : [...current, item.code]))}
                                    className={`register-page__module${on ? ' is-on' : ''}`}
                                >
                                    <span>{item.label}</span>
                                    <p>{item.text}</p>
                                </button>
                            );
                        })}
                    </div>
                    <div className="register-page__actions">
                        <button type="button" onClick={() => setStep('details')} className="register-page__back">Back</button>
                        <button type="button" disabled={paying} onClick={registerCompany} className="btn btn-primary flex-grow-1">
                            {paying && <Loader2 className="auth-spin" size={16} />} Register
                        </button>
                    </div>
                </div>
            )}

            {step === 'done' && done && (
                <div className="register-page__done">
                    <h2>Congratulations</h2>
                    <p>{done.name} is registered on Nammaqr.</p>
                    <p>Studio code: <strong>{done.slug}</strong></p>
                    <p>Database: <strong>{done.databaseName}</strong></p>
                    <p>{done.emailSent ? 'A confirmation email has been sent.' : 'The studio is ready. The confirmation email could not be sent because mail is not configured.'}</p>
                    <Link to="/login" className="btn btn-primary">Sign in</Link>
                </div>
            )}

            {step !== 'done' && (
                <p className="register-page__foot">
                    Already registered? <Link to="/login">Sign in</Link>
                </p>
            )}
        </div>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="d-block">
            <span className="form-label">{label}</span>
            {children}
            {error && <span className="register-page__error">{error}</span>}
        </label>
    );
}
