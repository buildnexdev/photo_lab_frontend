// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
import { encryptPayload, decryptPayload } from '../utils/crypto';

const DEFAULT_PROD_API = 'https://flash-studio-backend-84en.onrender.com';

const rawApiUrl = (import.meta.env.VITE_API_URL ?? '').trim();
const normalizedApiUrl = rawApiUrl.replace(
    /^https?:\/\/flash-studio\.onrender\.com\/?$/,
    DEFAULT_PROD_API,
);

export const API_BASE = (
    normalizedApiUrl || (import.meta.env.PROD ? DEFAULT_PROD_API : '')
).replace(/\/$/, '');

const REFRESH_TIMEOUT_MS = 12_000;

export interface FieldError {
    field: string;
    message: string;
}

export interface Paged<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public errors: FieldError[] = [],
        public code?: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export const errorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.') =>
    err instanceof ApiError || err instanceof Error ? err.message || fallback : fallback;

/* ---------------- Access token (cached in sessionStorage across refresh; refresh token is httpOnly cookie) ---------------- */

const ACCESS_TOKEN_KEY = 'pl_access_token';
const STUDIO_SLUG_KEY = 'pl_studio_slug';
let accessToken: string | null = typeof window !== 'undefined' ? sessionStorage.getItem(ACCESS_TOKEN_KEY) : null;
let studioSlug: string | null = typeof window !== 'undefined' ? sessionStorage.getItem(STUDIO_SLUG_KEY) : null;
let refreshing: Promise<boolean> | null = null;
let onSessionLost: (() => void) | null = null;

export const setAccessToken = (t: string | null, slug?: string | null) => {
    accessToken = t;
    if (typeof window !== 'undefined') {
        if (t) sessionStorage.setItem(ACCESS_TOKEN_KEY, t);
        else sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        if (slug !== undefined) {
            if (slug) {
                sessionStorage.setItem(STUDIO_SLUG_KEY, slug);
                localStorage.setItem(STUDIO_SLUG_KEY, slug);
                studioSlug = slug;
            } else {
                sessionStorage.removeItem(STUDIO_SLUG_KEY);
                localStorage.removeItem(STUDIO_SLUG_KEY);
                studioSlug = null;
            }
        }
    }
};
export const getAccessToken = () => accessToken;
export const getStudioSlug = () => studioSlug;
export const setSessionLostHandler = (fn: (() => void) | null) => {
    onSessionLost = fn;
};

export interface SessionPayload {
    user: SessionUser;
    accessToken: string;
    refreshExpiresAt: string;
    home: string;
    studioSlug?: string;
}

export interface SessionUser {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    companyId: number | null;
    companyName?: string | null;
    companySlug?: string | null;
    companyLogoUrl?: string | null;
    roles: string[];
    /** tblUser.is_admin = 1 or Super Admin; can manage page access. */
    isAdmin?: boolean;
    roleLevel: number | null;
    permissions: string[];
    customerId: number | null;
}

type RefreshListener = (s: SessionPayload | null) => void;
const refreshListeners = new Set<RefreshListener>();
export const onRefresh = (fn: RefreshListener) => {
    refreshListeners.add(fn);
    return () => refreshListeners.delete(fn);
};

/** Single-flight refresh: concurrent 401s share one /refresh call. */
export function refreshSession(): Promise<boolean> {
    if (!refreshing) {
        refreshing = (async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
            try {
                const res = await fetch(`${API_BASE}/api/auth/refresh`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-Encrypted': 'true', Accept: 'application/json' },
                    signal: controller.signal,
                });
                const type = res.headers.get('content-type') ?? '';
                if (!res.ok || !type.includes('application/json')) {
                    accessToken = null;
                    refreshListeners.forEach((l) => l(null));
                    return false;
                }
                const rawJson = (await res.json()) as any;
                const body = (rawJson && typeof rawJson.payload === 'string'
                    ? await decryptPayload(rawJson.payload)
                    : rawJson) as { success?: boolean; data?: SessionPayload };
                if (body.success === false || !body.data?.accessToken || !body.data.user) {
                    accessToken = null;
                    refreshListeners.forEach((l) => l(null));
                    return false;
                }
                accessToken = body.data.accessToken;
                refreshListeners.forEach((l) => l(body.data!));
                return true;
            } catch {
                accessToken = null;
                refreshListeners.forEach((l) => l(null));
                return false;
            } finally {
                clearTimeout(timer);
                refreshing = null;
            }
        })();
    }
    return refreshing;
}

/* ---------------- Requests ---------------- */

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    query?: Record<string, string | number | boolean | null | undefined>;
    headers?: Record<string, string>;
    signal?: AbortSignal;
    /** Skip the automatic refresh-and-retry on 401 */
    noRetry?: boolean;
}

export function buildQuery(query?: RequestOptions['query']): string {
    if (!query) return '';
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    const s = params.toString();
    return s ? `?${s}` : '';
}

export interface ApiResult<T> {
    data: T;
    message: string;
}

async function parse<T>(res: Response): Promise<ApiResult<T>> {
    const type = res.headers.get('content-type') ?? '';
    let body: any = null;
    if (type.includes('application/json')) {
        const rawJson = await res.json();
        if (rawJson && typeof rawJson === 'object' && typeof rawJson.payload === 'string') {
            body = await decryptPayload(rawJson.payload);
        } else {
            body = rawJson;
        }
    }
    if (!res.ok || (body && body.success === false)) {
        const msg = body?.message ?? (res.status === 429 ? 'Too many requests. Please wait a moment.' : `Request failed (${res.status})`);
        throw new ApiError(msg, res.status, body?.errors ?? [], body?.code);
    }
    return { data: (body ? body.data : undefined) as T, message: body?.message ?? '' };
}

/** Full response (data + server message). */
export async function apiSend<T>(path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
    const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
    const headers: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Encrypted': 'true',
        ...(opts.headers ?? {}),
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const activeStudio = typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('studio') || studioSlug || sessionStorage.getItem(STUDIO_SLUG_KEY) || localStorage.getItem(STUDIO_SLUG_KEY))
        : null;
    if (activeStudio && !headers['X-Studio-Slug']) {
        headers['X-Studio-Slug'] = activeStudio;
    }

    let requestBody: BodyInit | undefined = undefined;
    if (opts.body !== undefined) {
        if (isForm) {
            requestBody = opts.body as FormData;
        } else {
            headers['Content-Type'] = 'application/json';
            const encryptedHex = await encryptPayload(opts.body);
            requestBody = JSON.stringify({ payload: encryptedHex });
        }
    }

    const res = await fetch(`${API_BASE}${path}${buildQuery(opts.query)}`, {
        method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
        credentials: 'include',
        headers,
        body: requestBody,
        signal: opts.signal,
    });
    if (res.status === 401 && !opts.noRetry && accessToken !== null) {
        if (await refreshSession()) return apiSend<T>(path, { ...opts, noRetry: true });
        onSessionLost?.();
    }
    return parse<T>(res);
}

export const apiRequest = async <T>(path: string, opts: RequestOptions = {}): Promise<T> => (await apiSend<T>(path, opts)).data;

export const api = {
    get: <T>(path: string, query?: RequestOptions['query'], headers?: Record<string, string>) => apiRequest<T>(path, { query, headers }),
    post: <T>(path: string, body?: unknown, headers?: Record<string, string>) => apiRequest<T>(path, { method: 'POST', body: body ?? {}, headers }),
    put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body: body ?? {} }),
    del: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
    /** Mutations that surface the server's message in a toast */
    send: <T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, headers?: Record<string, string>) =>
        apiSend<T>(path, { method, body: method === 'DELETE' ? undefined : (body ?? {}), headers }),
};

/** Upload with progress (fetch cannot report upload progress). Retries once after refreshing an expired token. */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress?: (fraction: number) => void, signal?: AbortSignal, retried = false): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}${path}`);
        xhr.withCredentials = true;
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('X-Encrypted', 'true');
        if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress?.(e.loaded / e.total);
        };
        xhr.onload = async () => {
            let body: { success?: boolean; message?: string; data?: T; errors?: FieldError[] } | null = null;
            try {
                const parsed = JSON.parse(xhr.responseText);
                if (parsed && typeof parsed.payload === 'string') {
                    body = await decryptPayload(parsed.payload);
                } else {
                    body = parsed;
                }
            } catch {
                body = null;
            }
            if (xhr.status === 401 && !retried) {
                if (await refreshSession()) return uploadWithProgress<T>(path, form, onProgress, signal, true).then(resolve, reject);
            }
            if (xhr.status >= 200 && xhr.status < 300 && body?.success !== false) resolve(body?.data as T);
            else reject(new ApiError(body?.message ?? `Upload failed (${xhr.status || 'network error'})`, xhr.status, body?.errors ?? []));
        };
        xhr.onerror = () => reject(new ApiError('Network error. Check your connection and try again.', 0));
        xhr.ontimeout = () => reject(new ApiError('The upload timed out.', 0));
        signal?.addEventListener('abort', () => {
            xhr.abort();
            reject(new ApiError('Upload cancelled', 0, [], 'ABORTED'));
        });
        xhr.send(form);
    });
}

/** Download a protected binary (CSV, QR PNG) using the bearer token, then save it. */
export async function downloadAuthed(path: string, fallbackName: string, query?: RequestOptions['query']): Promise<void> {
    const doFetch = () =>
        fetch(`${API_BASE}${path}${buildQuery(query)}`, {
            credentials: 'include',
            headers: { 'X-Requested-With': 'XMLHttpRequest', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        });
    let res = await doFetch();
    if (res.status === 401 && (await refreshSession())) res = await doFetch();
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(body?.message ?? 'Download failed', res.status);
    }
    const disposition = res.headers.get('content-disposition') ?? '';
    const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName;
    const blob = await res.blob();
    saveBlob(blob, name);
}

export function saveBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Map server field errors onto react-hook-form. */
export function applyFieldErrors(err: unknown, setError: (name: never, e: { type: string; message: string }) => void): boolean {
    if (!(err instanceof ApiError) || !err.errors.length) return false;
    for (const fe of err.errors) setError(fe.field as never, { type: 'server', message: fe.message });
    return true;
}
