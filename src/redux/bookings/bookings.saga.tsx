import { takeLatest } from 'redux-saga/effects';
import { BOOKING_FETCH } from './bookings.types';

function* onBookingFetch() {
    return;
}

export function* bookingSaga() {
    yield takeLatest(BOOKING_FETCH, onBookingFetch);
}
