import { takeLatest } from 'redux-saga/effects';
import { PHOTOGRAPHER_FETCH } from './photographer.types';

function* onPhotographerFetch() {
    return;
}

export function* photographerSaga() {
    yield takeLatest(PHOTOGRAPHER_FETCH, onPhotographerFetch);
}
