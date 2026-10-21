import { takeLatest } from 'redux-saga/effects';
import { CUSTOMER_FETCH } from './customers.types';

function* onCustomerFetch() {
    return;
}

export function* customerSaga() {
    yield takeLatest(CUSTOMER_FETCH, onCustomerFetch);
}
