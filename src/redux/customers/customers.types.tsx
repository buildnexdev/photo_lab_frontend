export const CUSTOMER_FETCH = 'customer/FETCH';
export const CUSTOMER_SUCCESS = 'customer/SUCCESS';
export const CUSTOMER_FAILURE = 'customer/FAILURE';
export const CUSTOMER_RESET = 'customer/RESET';

export interface CustomerRecord {
    id: number | string;
}

export interface CustomerState {
    items: CustomerRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
