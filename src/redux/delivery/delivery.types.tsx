export const DELIVERY_FETCH = 'delivery/FETCH';
export const DELIVERY_SUCCESS = 'delivery/SUCCESS';
export const DELIVERY_FAILURE = 'delivery/FAILURE';
export const DELIVERY_RESET = 'delivery/RESET';

export interface DeliveryRecord {
    id: number | string;
}

export interface DeliveryState {
    items: DeliveryRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
