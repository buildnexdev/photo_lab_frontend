// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, uploadWithProgress } from './api';

export const MAX_FILE_BYTES = (Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 40) * 1024 * 1024;
const ACCEPTED = /\.(jpe?g|png|webp|heic|heif|tiff?)$/i;
const BATCH_FILES = 6;
const BATCH_BYTES = 60 * 1024 * 1024;
const CONCURRENCY = 2;
const MAX_ATTEMPTS = 4;

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'duplicate' | 'failed' | 'invalid';
export interface UploadItem {
    id: string;
    file: File;
    status: UploadStatus;
    progress: number;
    attempts: number;
    error?: string;
    photoId?: number;
    retryAt?: number;
}
interface UploadResponse {
    results: { fileName: string; ok: boolean; photoId?: number; duplicate?: boolean; error?: string; clientUploadId?: string | null }[];
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

function validate(file: File): string | null {
    if (!ACCEPTED.test(file.name) && !file.type.startsWith('image/')) return 'Not a supported image (JPEG, PNG, WebP, HEIC, TIFF)';
    if (file.size > MAX_FILE_BYTES) return `Larger than ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB`;
    if (file.size === 0) return 'Empty file';
    return null;
}

/**
 * Browser upload queue: batches files, reports progress, retries network/server failures with backoff,
 * pauses while offline and sends a client upload id per file so retries never create duplicates.
 */
export function useUploadQueue({ eventId, cameraLabel, onUploaded }: { eventId: number | null; cameraLabel: string; onUploaded?: () => void }) {
    const [items, setItems] = useState<UploadItem[]>([]);
    const [paused, setPaused] = useState(false);
    const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
    const [blocked, setBlocked] = useState<string | null>(null);
    const [tick, setTick] = useState(0);
    const inFlight = useRef(0);
    const itemsRef = useRef(items);
    itemsRef.current = items;
    const cameraRef = useRef(cameraLabel);
    cameraRef.current = cameraLabel;
    const onUploadedRef = useRef(onUploaded);
    onUploadedRef.current = onUploaded;

    const patch = useCallback((ids: string[], fn: (i: UploadItem) => Partial<UploadItem>) => {
        const set = new Set(ids);
        setItems((list) => list.map((i) => (set.has(i.id) ? { ...i, ...fn(i) } : i)));
    }, []);

    useEffect(() => {
        const up = () => setOnline(true);
        const down = () => setOnline(false);
        window.addEventListener('online', up);
        window.addEventListener('offline', down);
        return () => {
            window.removeEventListener('online', up);
            window.removeEventListener('offline', down);
        };
    }, []);

    const active = items.some((i) => i.status === 'queued' || i.status === 'uploading');
    useEffect(() => {
        if (!active) return;
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [active]);

    // Wake up for scheduled retries.
    useEffect(() => {
        const next = items.filter((i) => i.status === 'queued' && i.retryAt).map((i) => i.retryAt!);
        if (!next.length) return;
        const wait = Math.max(0, Math.min(...next) - Date.now());
        const t = setTimeout(() => setTick((n) => n + 1), wait + 50);
        return () => clearTimeout(t);
    }, [items]);

    const runBatch = useCallback(
        async (batch: UploadItem[]) => {
            if (!eventId) return;
            const ids = batch.map((b) => b.id);
            const total = batch.reduce((s, b) => s + b.file.size, 0) || 1;
            patch(ids, () => ({ status: 'uploading', progress: 0, error: undefined, retryAt: undefined }));
            const form = new FormData();
            form.append('eventId', String(eventId));
            if (cameraRef.current.trim()) form.append('cameraLabel', cameraRef.current.trim().slice(0, 40));
            form.append('clientUploadIds', JSON.stringify(ids));
            batch.forEach((b) => form.append('files', b.file, b.file.name));
            inFlight.current += 1;
            try {
                const res = await uploadWithProgress<UploadResponse>('/api/photos/upload', form, (f) => {
                    let sent = f * total;
                    const progress: Record<string, number> = {};
                    for (const b of batch) {
                        progress[b.id] = Math.max(0, Math.min(1, sent / b.file.size));
                        sent -= b.file.size;
                    }
                    patch(ids, (i) => ({ progress: progress[i.id] ?? i.progress }));
                });
                const byId = new Map(res.results.map((r, idx) => [r.clientUploadId ?? ids[idx], r]));
                setItems((list) =>
                    list.map((i) => {
                        if (!ids.includes(i.id)) return i;
                        const r = byId.get(i.id);
                        if (!r) return { ...i, status: 'failed', error: 'No response for this file' };
                        if (!r.ok) return { ...i, status: 'failed', progress: 0, error: r.error ?? 'Rejected by the server', attempts: MAX_ATTEMPTS };
                        return { ...i, status: r.duplicate ? 'duplicate' : 'done', progress: 1, photoId: r.photoId };
                    }),
                );
                onUploadedRef.current?.();
            } catch (err) {
                const e = err as ApiError;
                const retryable = !(e instanceof ApiError) || e.status === 0 || e.status === 408 || e.status === 429 || e.status >= 500;
                if (e instanceof ApiError && e.code === 'ABORTED') {
                    patch(ids, () => ({ status: 'queued', progress: 0 }));
                } else if (retryable) {
                    patch(ids, (i) => {
                        const attempts = i.attempts + 1;
                        return attempts >= MAX_ATTEMPTS ? { status: 'failed', progress: 0, attempts, error: e.message } : { status: 'queued', progress: 0, attempts, error: e.message, retryAt: Date.now() + 2000 * 2 ** (attempts - 1) };
                    });
                } else {
                    // 4xx such as "start the event first" or "no access": stop the queue until the user acts.
                    patch(ids, () => ({ status: 'queued', progress: 0, error: e.message }));
                    setBlocked(e.message);
                }
            } finally {
                inFlight.current -= 1;
                setTick((n) => n + 1);
            }
        },
        [eventId, patch],
    );

    useEffect(() => {
        if (!eventId || paused || !online || blocked) return;
        const now = Date.now();
        while (inFlight.current < CONCURRENCY) {
            const ready = itemsRef.current.filter((i) => i.status === 'queued' && (!i.retryAt || i.retryAt <= now));
            if (!ready.length) break;
            const batch: UploadItem[] = [];
            let bytes = 0;
            for (const i of ready) {
                if (batch.length >= BATCH_FILES || (batch.length && bytes + i.file.size > BATCH_BYTES)) break;
                batch.push(i);
                bytes += i.file.size;
            }
            // Mark synchronously so the next loop iteration does not pick the same files.
            itemsRef.current = itemsRef.current.map((i) => (batch.some((b) => b.id === i.id) ? { ...i, status: 'uploading' } : i));
            void runBatch(batch);
        }
    }, [items, tick, eventId, paused, online, blocked, runBatch]);

    const add = useCallback((files: FileList | File[]) => {
        const next: UploadItem[] = Array.from(files).map((file) => {
            const error = validate(file);
            return { id: newId(), file, status: error ? 'invalid' : 'queued', progress: 0, attempts: 0, error: error ?? undefined };
        });
        setItems((list) => [...list, ...next]);
        setBlocked(null);
    }, []);

    const retry = useCallback((id?: string) => {
        setBlocked(null);
        setItems((list) => list.map((i) => ((id ? i.id === id : i.status === 'failed') && i.status === 'failed' ? { ...i, status: 'queued', attempts: 0, error: undefined, retryAt: undefined } : i)));
    }, []);
    const remove = useCallback((id: string) => setItems((list) => list.filter((i) => i.id !== id || i.status === 'uploading')), []);
    const clearFinished = useCallback(() => setItems((list) => list.filter((i) => !['done', 'duplicate', 'invalid'].includes(i.status))), []);
    const resume = useCallback(() => {
        setBlocked(null);
        setPaused(false);
    }, []);

    const stats = useMemo(() => {
        const s = { total: items.length, queued: 0, uploading: 0, done: 0, duplicate: 0, failed: 0, invalid: 0, bytes: 0, sentBytes: 0 };
        for (const i of items) {
            s[i.status] += 1;
            if (i.status !== 'invalid') {
                s.bytes += i.file.size;
                s.sentBytes += i.file.size * (i.status === 'done' || i.status === 'duplicate' ? 1 : i.progress);
            }
        }
        return s;
    }, [items]);

    return { items, stats, add, retry, remove, clearFinished, paused, setPaused, resume, online, blocked, active };
}
