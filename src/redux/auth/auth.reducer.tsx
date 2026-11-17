import type { SessionUser } from '../../services/api';
import { AUTH_CLEAR, AUTH_RESTORE_TIMEOUT, AUTH_SESSION, type AuthState } from './auth.types';

const USER_STORAGE_KEY = 'pl_auth_user';

const getStoredUser = (): SessionUser | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(USER_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
        return null;
    }
};

const savedUser = getStoredUser();
const initialState: AuthState = {
    user: savedUser,
    status: savedUser ? 'authenticated' : 'loading',
};

export function authReducer(state: AuthState = initialState, action: { type: string; user?: SessionUser }): AuthState {
    switch (action.type) {
        case AUTH_SESSION:
            if (typeof window !== 'undefined' && action.user) {
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(action.user));
            }
            return { user: action.user ?? null, status: 'authenticated' };
        case AUTH_CLEAR:
            if (typeof window !== 'undefined') {
                localStorage.removeItem(USER_STORAGE_KEY);
            }
            return { user: null, status: 'anonymous' };
        case AUTH_RESTORE_TIMEOUT:
            return state.status === 'loading' ? { user: null, status: 'anonymous' } : state;
        default:
            return state;
    }
}
