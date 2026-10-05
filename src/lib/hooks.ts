import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { api, type Paged } from './api';

/** List state (page, search and filters) kept in the URL so it survives reloads and back navigation. */
export function useListParams<F extends string>(filterKeys: readonly F[] = [] as unknown as F[]) {
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
    const search = params.get('search') ?? '';
    const filters = useMemo(() => Object.fromEntries(filterKeys.map((k) => [k, params.get(k) ?? ''])) as Record<F, string>, [params, filterKeys]);
    const set = useCallback(
        (patch: Record<string, string | number | null | undefined>, resetPage = true) => {
            setParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    for (const [k, v] of Object.entries(patch)) {
                        if (v === null || v === undefined || v === '') next.delete(k);
                        else next.set(k, String(v));
                    }
                    if (resetPage && !('page' in patch)) next.delete('page');
                    return next;
                },
                { replace: true },
            );
        },
        [setParams],
    );
    return {
        page,
        search,
        filters,
        params,
        setPage: (p: number) => set({ page: p }, false),
        setSearch: (s: string) => set({ search: s }),
        setFilter: (k: F, v: string) => set({ [k]: v }),
        set,
    };
}

export function usePaged<T>(key: QueryKey, path: string, query: Record<string, string | number | boolean | undefined | null>, enabled = true) {
    return useQuery({
        queryKey: [...key, query],
        queryFn: () => api.get<Paged<T>>(path, query),
        placeholderData: (prev) => prev,
        enabled,
    });
}

/** A detail panel whose open record id lives in the URL (?open=ID), so notification deep links work. */
export function useOpenParam(name = 'open') {
    const [params, setParams] = useSearchParams();
    const raw = Number(params.get(name));
    const id = Number.isInteger(raw) && raw > 0 ? raw : null;
    const setId = useCallback(
        (next: number | null) =>
            setParams(
                (prev) => {
                    const p = new URLSearchParams(prev);
                    if (next) p.set(name, String(next));
                    else p.delete(name);
                    return p;
                },
                { replace: !next },
            ),
        [name, setParams],
    );
    return [id, setId] as const;
}

export function useInvalidate() {
    const qc = useQueryClient();
    return useCallback((...keys: QueryKey[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k }))), [qc]);
}

/** View mode ('table' | 'grid') sync with URL search params */
export function useViewMode() {
    const [params, setParams] = useSearchParams();
    const viewMode = (params.get('view') as 'table' | 'grid') || 'table';
    const setViewMode = useCallback(
        (mode: 'table' | 'grid') => {
            setParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    if (mode === 'table') next.delete('view');
                    else next.set('view', mode);
                    return next;
                },
                { replace: true },
            );
        },
        [setParams],
    );
    return [viewMode, setViewMode] as const;
}

