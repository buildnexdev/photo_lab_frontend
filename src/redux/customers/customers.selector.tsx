import type { RootState } from '../root-reducer';

export const selectCustomer = (state: RootState) => state.customer;
export const selectCustomerItems = (state: RootState) => state.customer.items;
export const selectCustomerStatus = (state: RootState) => state.customer.status;
