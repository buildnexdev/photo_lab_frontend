export const SHOP_FETCH = 'shop/FETCH';
export const SHOP_SUCCESS = 'shop/SUCCESS';
export const SHOP_FAILURE = 'shop/FAILURE';
export const SHOP_RESET = 'shop/RESET';

export interface ShopRecord {
    id: number | string;
}

export interface ShopState {
    items: ShopRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
