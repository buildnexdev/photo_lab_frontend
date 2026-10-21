export const SETTINGS_FETCH = 'settings/FETCH';
export const SETTINGS_SUCCESS = 'settings/SUCCESS';
export const SETTINGS_FAILURE = 'settings/FAILURE';
export const SETTINGS_RESET = 'settings/RESET';

export interface SettingsRecord {
    id: number | string;
}

export interface SettingsState {
    items: SettingsRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
