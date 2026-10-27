export const STAFF_FETCH = 'staff/FETCH';
export const STAFF_SUCCESS = 'staff/SUCCESS';
export const STAFF_FAILURE = 'staff/FAILURE';
export const STAFF_RESET = 'staff/RESET';

export interface StaffRecord {
    id: number | string;
}

export interface StaffState {
    items: StaffRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
