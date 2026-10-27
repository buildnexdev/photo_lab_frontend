import type { RootState } from '../root-reducer';

export const selectStaff = (state: RootState) => state.staff;
export const selectStaffItems = (state: RootState) => state.staff.items;
export const selectStaffStatus = (state: RootState) => state.staff.status;
