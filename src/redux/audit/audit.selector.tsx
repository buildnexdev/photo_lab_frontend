import type { RootState } from '../root-reducer';

export const selectAudit = (state: RootState) => state.audit;
export const selectAuditItems = (state: RootState) => state.audit.items;
export const selectAuditStatus = (state: RootState) => state.audit.status;
