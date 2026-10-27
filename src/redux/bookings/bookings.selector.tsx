import type { RootState } from '../root-reducer';

export const selectBooking = (state: RootState) => state.booking;
export const selectBookingItems = (state: RootState) => state.booking.items;
export const selectBookingStatus = (state: RootState) => state.booking.status;
