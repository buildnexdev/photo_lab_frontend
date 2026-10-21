import { takeLatest } from 'redux-saga/effects';
import { NOTIFICATION_FETCH } from './notifications.types';

function* onNotificationFetch() {
    return;
}

export function* notificationSaga() {
    yield takeLatest(NOTIFICATION_FETCH, onNotificationFetch);
}
