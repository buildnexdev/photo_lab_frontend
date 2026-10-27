import { takeLatest } from 'redux-saga/effects';
import { STAFF_FETCH } from './staff.types';

function* onStaffFetch() {
    return;
}

export function* staffSaga() {
    yield takeLatest(STAFF_FETCH, onStaffFetch);
}
