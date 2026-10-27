export const EVENT_FETCH = 'event/FETCH';
export const EVENT_SUCCESS = 'event/SUCCESS';
export const EVENT_FAILURE = 'event/FAILURE';
export const EVENT_RESET = 'event/RESET';

export interface EventRecord {
    id: number | string;
}

export interface EventState {
    items: EventRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
