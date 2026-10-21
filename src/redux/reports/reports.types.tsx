export const REPORT_FETCH = 'report/FETCH';
export const REPORT_SUCCESS = 'report/SUCCESS';
export const REPORT_FAILURE = 'report/FAILURE';
export const REPORT_RESET = 'report/RESET';

export interface ReportRecord {
    id: number | string;
}

export interface ReportState {
    items: ReportRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
