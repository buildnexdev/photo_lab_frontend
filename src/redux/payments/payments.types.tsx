export const PAYMENT_FETCH = 'payment/FETCH';
export const PAYMENT_SUCCESS = 'payment/SUCCESS';
export const PAYMENT_FAILURE = 'payment/FAILURE';
export const PAYMENT_RESET = 'payment/RESET';

export interface PaymentRecord {
    id: number | string;
}

export interface PaymentState {
    items: PaymentRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
