import { call, put, takeLatest } from 'redux-saga/effects';
import { api, refreshSession, setAccessToken, type SessionPayload } from '../../services/api';
import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_REGISTER, AUTH_RESTORE, authClear, authSession, type AuthLoginPayload, type AuthRegisterPayload } from './auth.types';

interface Deferred {
    resolve: (value?: SessionPayload) => void;
    reject: (reason: unknown) => void;
}

const pending = new Map<number, Deferred>();
let nextId = 1;

export function enqueueAuth(start: (id: number) => void): Promise<SessionPayload> {
    const id = nextId++;
    return new Promise((resolve, reject) => {
        pending.set(id, { resolve: (value) => resolve(value as SessionPayload), reject });
        start(id);
    });
}

export function enqueueLogout(start: (id: number) => void): Promise<void> {
    const id = nextId++;
    return new Promise((resolve, reject) => {
        pending.set(id, { resolve: () => resolve(), reject });
        start(id);
    });
}

function finish(id: number, error: unknown, value?: SessionPayload) {
    const job = pending.get(id);
    pending.delete(id);
    if (!job) return;
    if (error) job.reject(error);
    else job.resolve(value);
}

function loginRequest(body: Pick<AuthLoginPayload, 'identifier' | 'password' | 'studio'>) {
    return api.post<SessionPayload>('/api/auth/login', body);
}

function registerRequest(body: Omit<AuthRegisterPayload, 'id'>) {
    return api.post<SessionPayload>('/api/auth/register', body);
}

function logoutRequest() {
    return api.post('/api/auth/logout', {});
}

function* loginWorker(action: { type: typeof AUTH_LOGIN; payload: AuthLoginPayload }) {
    try {
        const session: SessionPayload = yield call(loginRequest, {
            identifier: action.payload.identifier,
            password: action.payload.password,
            studio: action.payload.studio,
        });
        yield call(setAccessToken, session.accessToken, session.studioSlug);
        yield put(authSession(session.user));
        finish(action.payload.id, null, session);
    } catch (error) {
        finish(action.payload.id, error);
    }
}

function* registerWorker(action: { type: typeof AUTH_REGISTER; payload: AuthRegisterPayload }) {
    try {
        const { id, ...body } = action.payload;
        const session: SessionPayload = yield call(registerRequest, body);
        yield call(setAccessToken, session.accessToken, session.studioSlug);
        yield put(authSession(session.user));
        finish(id, null, session);
    } catch (error) {
        finish(action.payload.id, error);
    }
}

function* logoutWorker(action: { type: typeof AUTH_LOGOUT; id: number }) {
    try {
        yield call(logoutRequest);
        yield call(setAccessToken, null);
        yield put(authClear());
        finish(action.id, null);
    } catch (error) {
        yield call(setAccessToken, null);
        yield put(authClear());
        finish(action.id, error);
    }
}

function* restoreWorker() {
    const ok: boolean = yield call(refreshSession);
    if (!ok) yield put(authClear());
}

export function* authSaga() {
    yield takeLatest(AUTH_LOGIN, loginWorker);
    yield takeLatest(AUTH_REGISTER, registerWorker);
    yield takeLatest(AUTH_LOGOUT, logoutWorker);
    yield takeLatest(AUTH_RESTORE, restoreWorker);
}
