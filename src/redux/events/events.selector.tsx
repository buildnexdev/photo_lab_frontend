import type { RootState } from '../root-reducer';

export const selectEvent = (state: RootState) => state.event;
export const selectEventItems = (state: RootState) => state.event.items;
export const selectEventStatus = (state: RootState) => state.event.status;
