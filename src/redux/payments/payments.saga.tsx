import { takeLatest } from 'redux-saga/effects';
import { PAYMENT_FETCH } from './payments.types';

function* onPaymentFetch() {
    return;
}

export function* paymentSaga() {
    yield takeLatest(PAYMENT_FETCH, onPaymentFetch);
}
