import { takeLatest } from 'redux-saga/effects';
import { EVENT_FETCH } from './events.types';

function* onEventFetch() {
    return;
}

export function* eventSaga() {
    yield takeLatest(EVENT_FETCH, onEventFetch);
}
