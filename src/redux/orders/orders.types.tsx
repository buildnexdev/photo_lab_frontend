export const ORDER_FETCH = 'order/FETCH';
export const ORDER_SUCCESS = 'order/SUCCESS';
export const ORDER_FAILURE = 'order/FAILURE';
export const ORDER_RESET = 'order/RESET';

export interface OrderRecord {
    id: number | string;
}

export interface OrderState {
    items: OrderRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
