import type { RootState } from '../root-reducer';

export const selectCompany = (state: RootState) => state.company;
export const selectCompanyItems = (state: RootState) => state.company.items;
export const selectCompanyStatus = (state: RootState) => state.company.status;
