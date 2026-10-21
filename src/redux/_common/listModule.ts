export type ResourceStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ResourceState<T> {
    items: T[];
    status: ResourceStatus;
    error: string | null;
}

export const resourceInitial = <T>(): ResourceState<T> => ({ items: [], status: 'idle', error: null });

interface ResourceAction<T> {
    type: string;
    items?: T[];
    error?: string;
}

/** Shared list reducer. Each feature folder names its own actions and state key. */
export function resourceReducer<T>(name: string) {
    const fetchType = `${name}/FETCH`;
    const successType = `${name}/SUCCESS`;
    const failureType = `${name}/FAILURE`;
    const resetType = `${name}/RESET`;

    return function reducer(state: ResourceState<T> = resourceInitial<T>(), action: ResourceAction<T>): ResourceState<T> {
        switch (action.type) {
            case fetchType:
                return { ...state, status: 'loading', error: null };
            case successType:
                return { items: action.items ?? [], status: 'ready', error: null };
            case failureType:
                return { ...state, status: 'error', error: action.error ?? 'Request failed' };
            case resetType:
                return resourceInitial<T>();
            default:
                return state;
        }
    };
}

export const resourceActions = <T>(name: string) => ({
    fetch: () => ({ type: `${name}/FETCH` as const }),
    success: (items: T[]) => ({ type: `${name}/SUCCESS` as const, items }),
    failure: (error: string) => ({ type: `${name}/FAILURE` as const, error }),
    reset: () => ({ type: `${name}/RESET` as const }),
});
