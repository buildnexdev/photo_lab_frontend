export const ASSET_FETCH = 'asset/FETCH';
export const ASSET_SUCCESS = 'asset/SUCCESS';
export const ASSET_FAILURE = 'asset/FAILURE';
export const ASSET_RESET = 'asset/RESET';

export interface AssetRecord {
    id: number | string;
}

export interface AssetState {
    items: AssetRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
