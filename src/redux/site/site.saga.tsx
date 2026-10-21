import { takeLatest } from 'redux-saga/effects';
import { SITE_FETCH } from './site.types';

function* onSiteFetch() {
    return;
}

export function* siteSaga() {
    yield takeLatest(SITE_FETCH, onSiteFetch);
}
