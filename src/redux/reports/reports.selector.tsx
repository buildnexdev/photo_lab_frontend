import type { RootState } from '../root-reducer';

export const selectReport = (state: RootState) => state.report;
export const selectReportItems = (state: RootState) => state.report.items;
export const selectReportStatus = (state: RootState) => state.report.status;
