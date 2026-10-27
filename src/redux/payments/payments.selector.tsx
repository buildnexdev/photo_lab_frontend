import type { RootState } from '../root-reducer';

export const selectPayment = (state: RootState) => state.payment;
export const selectPaymentItems = (state: RootState) => state.payment.items;
export const selectPaymentStatus = (state: RootState) => state.payment.status;
