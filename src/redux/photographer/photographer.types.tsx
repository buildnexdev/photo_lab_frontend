export const PHOTOGRAPHER_FETCH = 'photographer/FETCH';
export const PHOTOGRAPHER_SUCCESS = 'photographer/SUCCESS';
export const PHOTOGRAPHER_FAILURE = 'photographer/FAILURE';
export const PHOTOGRAPHER_RESET = 'photographer/RESET';

export interface PhotographerRecord {
    id: number | string;
}

export interface PhotographerState {
    items: PhotographerRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
