import { takeLatest } from 'redux-saga/effects';
import { ORDER_FETCH } from './orders.types';

function* onOrderFetch() {
    return;
}

export function* orderSaga() {
    yield takeLatest(ORDER_FETCH, onOrderFetch);
}
