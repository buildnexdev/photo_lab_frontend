import { takeLatest } from 'redux-saga/effects';
import { COMPANY_FETCH } from './companies.types';

function* onCompanyFetch() {
    return;
}

export function* companySaga() {
    yield takeLatest(COMPANY_FETCH, onCompanyFetch);
}
