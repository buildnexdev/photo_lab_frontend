import type { SessionUser } from '../../services/api';
import { AUTH_CLEAR, AUTH_RESTORE_TIMEOUT, AUTH_SESSION, type AuthState } from './auth.types';

const initialState: AuthState = { user: null, status: 'loading' };

export function authReducer(state: AuthState = initialState, action: { type: string; user?: SessionUser }): AuthState {
    switch (action.type) {
        case AUTH_SESSION:
            return { user: action.user ?? null, status: 'authenticated' };
        case AUTH_CLEAR:
            return { user: null, status: 'anonymous' };
        case AUTH_RESTORE_TIMEOUT:
            return state.status === 'loading' ? { user: null, status: 'anonymous' } : state;
        default:
            return state;
    }
}
