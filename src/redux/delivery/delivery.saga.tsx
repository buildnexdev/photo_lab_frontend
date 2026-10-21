import { takeLatest } from 'redux-saga/effects';
import { DELIVERY_FETCH } from './delivery.types';

function* onDeliveryFetch() {
    return;
}

export function* deliverySaga() {
    yield takeLatest(DELIVERY_FETCH, onDeliveryFetch);
}
