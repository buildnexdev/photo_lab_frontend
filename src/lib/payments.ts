import { api, ApiError } from './api';

interface PaymentIntent {
    paymentId: number;
    paymentNo: string;
    provider: 'razorpay' | 'devpay';
    keyId: string | null;
    providerOrderId: string;
    amount: number;
    currency: string;
    description: string;
    studioName: string;
    prefill: { name?: string; email?: string | null; contact?: string | null };
}

interface GatewayResult {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

export type PayTarget = { bookingId: number; purpose?: 'ADVANCE' | 'BALANCE' } | { orderId: number };

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
        s.onerror = () => reject(new ApiError('Could not load the payment gateway. Check your connection.', 0));
        document.body.appendChild(s);
    });
}

async function razorpayCheckout(intent: PaymentIntent): Promise<GatewayResult> {
    await loadRazorpay();
    return new Promise((resolve, reject) => {
        const rzp = new window.Razorpay!({
            key: intent.keyId ?? '',
            amount: intent.amount,
            currency: intent.currency,
            name: intent.studioName,
            description: intent.description,
            order_id: intent.providerOrderId,
            prefill: { name: intent.prefill.name, email: intent.prefill.email ?? undefined, contact: intent.prefill.contact ?? undefined },
            theme: { color: '#b45309' },
            handler: resolve,
            modal: { ondismiss: () => reject(new ApiError('Payment cancelled.', 0, [], 'CANCELLED')) },
        });
        rzp.on('payment.failed', (e) => reject(new ApiError(e.error?.description ?? 'Payment failed.', 0, [], 'FAILED')));
        rzp.open();
    });
}

/**
 * Full checkout: create the payment on the server (amount is computed server-side),
 * collect it through the gateway, then have the server verify the signature.
 * The UI never decides that a payment succeeded.
 */
export async function payNow(target: PayTarget, devOutcome?: () => Promise<'success' | 'failure' | null>): Promise<{ id: number; payment_no: string; status: string }> {
    const intent = await api.post<PaymentIntent>('/api/payments/create', target);
    let result: GatewayResult;
    if (intent.provider === 'devpay') {
        const outcome = devOutcome ? await devOutcome() : 'success';
        if (!outcome) throw new ApiError('Payment cancelled.', 0, [], 'CANCELLED');
        result = await api.post<GatewayResult>('/api/payments/devpay/checkout', { paymentId: intent.paymentId, outcome });
    } else {
        result = await razorpayCheckout(intent);
    }
    return api.post<{ id: number; payment_no: string; status: string }>('/api/payments/verify', {
        paymentId: intent.paymentId,
        providerOrderId: result.razorpay_order_id,
        providerPaymentId: result.razorpay_payment_id,
        signature: result.razorpay_signature,
    });
}
