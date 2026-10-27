import { takeLatest } from 'redux-saga/effects';
import { AUDIT_FETCH } from './audit.types';

function* onAuditFetch() {
    return;
}

export function* auditSaga() {
    yield takeLatest(AUDIT_FETCH, onAuditFetch);
}
