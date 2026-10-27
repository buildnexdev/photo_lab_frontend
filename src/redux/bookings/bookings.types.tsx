export const BOOKING_FETCH = 'booking/FETCH';
export const BOOKING_SUCCESS = 'booking/SUCCESS';
export const BOOKING_FAILURE = 'booking/FAILURE';
export const BOOKING_RESET = 'booking/RESET';

export interface BookingRecord {
    id: number | string;
}

export interface BookingState {
    items: BookingRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
