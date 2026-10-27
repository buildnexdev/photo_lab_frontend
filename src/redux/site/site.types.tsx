export const SITE_FETCH = 'site/FETCH';
export const SITE_SUCCESS = 'site/SUCCESS';
export const SITE_FAILURE = 'site/FAILURE';
export const SITE_RESET = 'site/RESET';

export interface SiteRecord {
    id: number | string;
}

export interface SiteState {
    items: SiteRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
