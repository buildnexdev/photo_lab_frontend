import { resourceReducer } from '../_common/listModule';
import type { BookingRecord } from './bookings.types';

export const bookingReducer = resourceReducer<BookingRecord>('booking');
