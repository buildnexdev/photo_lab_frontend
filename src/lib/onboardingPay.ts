import { api, ApiError } from '../services/api';
import type { CheckoutIntent, CompanyCreated, OnboardingForm } from './onboardingModules';

interface GatewayResult {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill: Record<string, string | undefined>;
    theme: { color: string };
    handler: (r: GatewayResult) => void;
    modal: { ondismiss: () => void };
}

declare global {
    interface Window {
        Razorpay?: new (opts: RazorpayOptions) => { open: () => void; on: (ev: string, cb: (e: { error?: { description?: string } }) => void) => void };
    }
}

function loadRazorpay(): Promise<void> {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new ApiError('Could not load Razorpay.', 0));
        document.body.appendChild(s);
    });
}

async function razorpayCheckout(intent: CheckoutIntent, form: OnboardingForm): Promise<GatewayResult> {
    await loadRazorpay();
    return new Promise((resolve, reject) => {
        const rzp = new window.Razorpay!({
            key: intent.keyId ?? '',
            amount: intent.amount,
            currency: intent.currency,
            name: 'Nammaqr',
            description: `Studio setup — ${form.companyName}`,
            order_id: intent.providerOrderId,
            prefill: { name: form.ownerName, email: form.email, contact: form.phone },
            theme: { color: '#c9a24b' },
            handler: resolve,
            modal: { ondismiss: () => reject(new ApiError('Payment cancelled.', 0, [], 'CANCELLED')) },
        });
        rzp.on('payment.failed', (e) => reject(new ApiError(e.error?.description ?? 'Payment failed.', 0, [], 'FAILED')));
        rzp.open();
    });
}

export async function checkSignupPhone(phone: string): Promise<{ available: boolean; phone: string }> {
    return api.post<{ available: boolean; phone: string }>('/api/onboarding/check-phone', {
        phone: phone.replace(/\s/g, ''),
    });
}

export async function startOnboardingCheckout(form: OnboardingForm): Promise<CheckoutIntent> {
    return api.post<CheckoutIntent>('/api/onboarding/start', {
        phone: form.phone.replace(/\s/g, ''),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        companyEmail: form.companyEmail.trim().toLowerCase(),
        companyName: form.companyName.trim(),
        ownerName: form.ownerName.trim(),
        about: form.about.trim(),
        modules: form.modules,
        logoBase64: form.logoBase64,
    });
}

export async function payAndCreateCompany(
    form: OnboardingForm,
    intent: CheckoutIntent,
    devOutcome?: () => Promise<'success' | 'failure' | null>,
): Promise<CompanyCreated> {
    if (intent.provider === 'devpay') {
        const outcome = devOutcome ? await devOutcome() : 'success';
        if (!outcome) throw new ApiError('Payment cancelled.', 0, [], 'CANCELLED');
        if (outcome === 'failure') throw new ApiError('Payment failed.', 0, [], 'FAILED');
        return api.post<CompanyCreated>('/api/onboarding/devpay-complete', {
            token: intent.token,
            providerOrderId: intent.providerOrderId,
            outcome: 'success',
        });
    }

    const gateway = await razorpayCheckout(intent, form);
    return api.post<CompanyCreated>('/api/onboarding/complete', {
        token: intent.token,
        providerOrderId: gateway.razorpay_order_id,
        providerPaymentId: gateway.razorpay_payment_id,
        signature: gateway.razorpay_signature,
    });
}
