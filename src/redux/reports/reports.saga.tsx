import { takeLatest } from 'redux-saga/effects';
import { REPORT_FETCH } from './reports.types';

function* onReportFetch() {
    return;
}

export function* reportSaga() {
    yield takeLatest(REPORT_FETCH, onReportFetch);
}
