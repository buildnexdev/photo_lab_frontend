import type { RootState } from '../root-reducer';

export const selectDelivery = (state: RootState) => state.delivery;
export const selectDeliveryItems = (state: RootState) => state.delivery.items;
export const selectDeliveryStatus = (state: RootState) => state.delivery.status;
