import type { RootState } from '../root-reducer';

export const selectOrder = (state: RootState) => state.order;
export const selectOrderItems = (state: RootState) => state.order.items;
export const selectOrderStatus = (state: RootState) => state.order.status;
