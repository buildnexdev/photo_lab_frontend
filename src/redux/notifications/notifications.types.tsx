export const NOTIFICATION_FETCH = 'notification/FETCH';
export const NOTIFICATION_SUCCESS = 'notification/SUCCESS';
export const NOTIFICATION_FAILURE = 'notification/FAILURE';
export const NOTIFICATION_RESET = 'notification/RESET';

export interface NotificationRecord {
    id: number | string;
}

export interface NotificationState {
    items: NotificationRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
