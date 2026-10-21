// Developer by: Buildnexdev.in
// Last Edited : 21-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import logo from '../../../assets/NammaqrLogo.png';
import { ApiError, api, applyFieldErrors, errorMessage } from '../../../services/api';
import { emailRule, passwordRule, phoneRule } from '../../../helpers/validation';

const MODULES = [
    { code: 'asset', label: 'Asset management', price: 999, text: 'Cameras, lenses and studio equipment.' },
    { code: 'staff', label: 'Staff management', price: 999, text: 'Photographers, editors and assignments.' },
    { code: 'event', label: 'Event management', price: 1499, text: 'Bookings, events and QR galleries.' },
    { code: 'report', label: 'Report', price: 0, text: 'Studio reports. This module is free.' },
    { code: 'ecommerce', label: 'Ecommerce', price: 1999, text: 'Prints, products and online orders.' },
] as const;

type ModuleCode = (typeof MODULES)[number]['code'];

const detailsSchema = z.object({
    phone: phoneRule,
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
type Checkout = {
    signupId: number;
    amount: number;
    currency: string;
    provider: 'razorpay' | 'devpay' | 'free';
    keyId: string | null;
    providerOrderId: string;
};
type Done = { slug?: string; databaseName?: string; name?: string; emailSent?: boolean };

const fieldClass = 'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400';

function loadRazorpay(): Promise<void> {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Could not load Razorpay.'));
        document.body.appendChild(s);
    });
}

export default function Register() {
    const [step, setStep] = useState<'details' | 'modules' | 'pay' | 'done'>('details');
    const [logoData, setLogoData] = useState('');
    const [logoError, setLogoError] = useState('');
    const [modules, setModules] = useState<ModuleCode[]>(['report']);
    const [checkout, setCheckout] = useState<Checkout | null>(null);
    const [done, setDone] = useState<Done | null>(null);
    const [error, setError] = useState('');
    const [paying, setPaying] = useState(false);
    const form = useForm<Details>({ resolver: zodResolver(detailsSchema) });

    const total = MODULES.filter((m) => modules.includes(m.code)).reduce((sum, m) => sum + m.price, 0);

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

    const startPay = async () => {
        setError('');
        if (!modules.length) {
            setError('Select at least one module.');
            return;
        }
        setPaying(true);
        try {
            const intent = await api.post<Checkout>('/api/public/companies/checkout', payload(form.getValues()));
            setCheckout(intent);
            if (intent.provider === 'free' || intent.amount === 0) {
                setDone(await api.post<Done>('/api/public/companies/complete', { signupId: intent.signupId }));
                setStep('done');
                return;
            }
            setStep('pay');
        } catch (e) {
            if (!applyFieldErrors(e, form.setError as never)) setError(errorMessage(e));
            setStep('details');
        } finally {
            setPaying(false);
        }
    };

    const finishPaid = async (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        if (!checkout) return;
        const result = await api.post<Done>('/api/public/companies/complete', {
            signupId: checkout.signupId,
            providerOrderId: payment.razorpay_order_id,
            providerPaymentId: payment.razorpay_payment_id,
            signature: payment.razorpay_signature,
        });
        setDone(result);
        setStep('done');
    };

    const pay = async () => {
        if (!checkout) return;
        setError('');
        setPaying(true);
        try {
            if (checkout.provider === 'devpay') {
                const payment = await api.post<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }>(
                    '/api/public/companies/devpay',
                    { signupId: checkout.signupId, outcome: 'success' },
                );
                await finishPaid(payment);
                return;
            }
            await loadRazorpay();
            await new Promise<void>((resolve, reject) => {
                const rzp = new window.Razorpay!({
                    key: checkout.keyId ?? '',
                    amount: checkout.amount,
                    currency: checkout.currency,
                    name: 'Nammaqr',
                    description: 'Company registration',
                    order_id: checkout.providerOrderId,
                    prefill: { name: form.getValues('ownerName'), email: form.getValues('ownerEmail'), contact: form.getValues('phone') },
                    theme: { color: '#d4af37' },
                    handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                        finishPaid(response).then(resolve).catch(reject);
                    },
                    modal: { ondismiss: () => reject(new ApiError('Payment cancelled.', 0)) },
                });
                rzp.open();
            });
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="relative mx-auto w-full max-w-3xl rounded-2xl border border-white/15 bg-black/75 p-6 text-white shadow-2xl sm:p-8">
            <div className="mb-6 text-center">
                <img src={logo} alt="Nammaqr" className="mx-auto h-20 w-auto object-contain" />
                <h1 className="mt-2 text-2xl tracking-[0.16em]">Register your company</h1>
                <p className="text-xs uppercase tracking-[0.22em] text-amber-300">Nammaqr Photography</p>
            </div>
            <div className="mb-6 flex justify-center gap-2 text-[11px] uppercase tracking-[0.14em] text-stone-400">
                {(['details', 'modules', 'pay', 'done'] as const).map((item, i) => (
                    <span key={item} className={step === item ? 'text-amber-300' : ''}>{i + 1}. {item}</span>
                ))}
            </div>
            {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}

            {step === 'details' && (
                <form onSubmit={nextDetails} className="grid gap-4 sm:grid-cols-2" noValidate>
                    <Field label="Phone number" error={form.formState.errors.phone?.message}><input {...form.register('phone')} className={fieldClass} placeholder="9876543210" /></Field>
                    <Field label="Company name" error={form.formState.errors.name?.message}><input {...form.register('name')} className={fieldClass} placeholder="Wass Photo" /></Field>
                    <Field label="Owner name" error={form.formState.errors.ownerName?.message}><input {...form.register('ownerName')} className={fieldClass} /></Field>
                    <Field label="Owner email" error={form.formState.errors.ownerEmail?.message}><input {...form.register('ownerEmail')} type="email" className={fieldClass} /></Field>
                    <Field label="Password" error={form.formState.errors.password?.message}><input {...form.register('password')} type="password" className={fieldClass} /></Field>
                    <Field label="GST number" error={form.formState.errors.gstNumber?.message}><input {...form.register('gstNumber')} className={fieldClass} /></Field>
                    <Field label="Aadhaar number" error={form.formState.errors.aadhaarNumber?.message}><input {...form.register('aadhaarNumber')} className={fieldClass} maxLength={12} /></Field>
                    <Field label="PAN number" error={form.formState.errors.panNumber?.message}><input {...form.register('panNumber')} className={fieldClass} /></Field>
                    <div className="sm:col-span-2">
                        <Field label="Address" error={form.formState.errors.address?.message}><textarea {...form.register('address')} rows={2} className={fieldClass} /></Field>
                    </div>
                    <div className="sm:col-span-2">
                        <Field label="About us" error={form.formState.errors.aboutUs?.message}><textarea {...form.register('aboutUs')} rows={3} className={fieldClass} /></Field>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-stone-300">Company logo</label>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => readLogo(e.target.files?.[0])} className="text-xs text-stone-300" />
                        {logoData && <img src={logoData} alt="Logo preview" className="mt-3 h-16 w-auto rounded bg-white/10 object-contain p-1" />}
                        {logoError && <p className="mt-1 text-xs text-red-400">{logoError}</p>}
                    </div>
                    <button disabled={form.formState.isSubmitting} className="sm:col-span-2 flex items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-950 disabled:opacity-60">
                        {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />} Continue
                    </button>
                </form>
            )}

            {step === 'modules' && (
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {MODULES.map((item) => {
                            const on = modules.includes(item.code);
                            return (
                                <button
                                    key={item.code}
                                    type="button"
                                    onClick={() => setModules((current) => (on ? current.filter((code) => code !== item.code) : [...current, item.code]))}
                                    className={`rounded-2xl border p-4 text-left ${on ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/5'}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-semibold">{item.label}</span>
                                        <span className="text-xs text-amber-300">{item.price === 0 ? 'Free' : `₹${item.price.toLocaleString('en-IN')}`}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-stone-400">{item.text}</p>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm">
                        <span>Total</span>
                        <strong>{total === 0 ? 'Free' : `₹${total.toLocaleString('en-IN')}`}</strong>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setStep('details')} className="rounded-xl border border-white/15 px-4 py-3 text-xs uppercase tracking-[0.14em]">Back</button>
                        <button type="button" disabled={paying} onClick={startPay} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-950 disabled:opacity-60">
                            {paying && <Loader2 className="size-4 animate-spin" />} {total === 0 ? 'Register' : 'Continue to payment'}
                        </button>
                    </div>
                </div>
            )}

            {step === 'pay' && checkout && (
                <div className="space-y-4 text-center">
                    <Building2 className="mx-auto size-8 text-amber-300" />
                    <p>Pay ₹{(checkout.amount / 100).toLocaleString('en-IN')} with Razorpay. The company is created only after the payment succeeds.</p>
                    <button type="button" disabled={paying} onClick={pay} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-950 disabled:opacity-60">
                        {paying && <Loader2 className="size-4 animate-spin" />} Pay and register
                    </button>
                </div>
            )}

            {step === 'done' && done && (
                <div className="space-y-3 text-center">
                    <h2 className="text-xl text-amber-300">Congratulations</h2>
                    <p>{done.name} is registered on Nammaqr.</p>
                    <p className="text-sm text-stone-300">Studio code: <strong className="text-white">{done.slug}</strong></p>
                    <p className="text-sm text-stone-300">Database: <strong className="text-white">{done.databaseName}</strong></p>
                    <p className="text-xs text-stone-400">{done.emailSent ? 'A confirmation email has been sent.' : 'The studio is ready. The confirmation email could not be sent because mail is not configured.'}</p>
                    <Link to="/login" className="inline-flex rounded-xl bg-amber-400 px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-950">Sign in</Link>
                </div>
            )}

            {step !== 'done' && (
                <p className="mt-6 text-center text-xs text-stone-400">
                    Already registered? <Link to="/login" className="text-amber-300">Sign in</Link>
                </p>
            )}
        </div>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-stone-300">{label}</span>
            {children}
            {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
        </label>
    );
}
