export const AUDIT_FETCH = 'audit/FETCH';
export const AUDIT_SUCCESS = 'audit/SUCCESS';
export const AUDIT_FAILURE = 'audit/FAILURE';
export const AUDIT_RESET = 'audit/RESET';

export interface AuditRow {
    id: number;
    user_id: number | null;
    user_name: string | null;
    user_email: string | null;
    action: string;
    module: string;
    record_id: string | null;
    ip: string | null;
    user_agent: string | null;
    metadata: unknown;
    created_at: string;
}

export type AuditRecord = AuditRow;

export interface AuditState {
    items: AuditRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
