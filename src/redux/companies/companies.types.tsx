export const COMPANY_FETCH = 'company/FETCH';
export const COMPANY_SUCCESS = 'company/SUCCESS';
export const COMPANY_FAILURE = 'company/FAILURE';
export const COMPANY_RESET = 'company/RESET';

export interface CompanyRecord {
    id: number | string;
}

export interface CompanyState {
    items: CompanyRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
