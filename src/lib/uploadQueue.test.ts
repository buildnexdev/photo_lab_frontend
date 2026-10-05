import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const upload = vi.fn();
vi.mock('./api', async (orig) => {
    const real = await orig<typeof import('./api')>();
    return { ...real, uploadWithProgress: (...args: unknown[]) => upload(...args) };
});

const { ApiError } = await import('./api');
const { useUploadQueue, MAX_FILE_BYTES } = await import('./uploadQueue');

const jpeg = (name: string, size = 1024) => new File([new Uint8Array(size)], name, { type: 'image/jpeg' });

afterEach(() => upload.mockReset());

describe('useUploadQueue', () => {
    it('skips unsupported and oversized files without uploading them', () => {
        const { result } = renderHook(() => useUploadQueue({ eventId: null, cameraLabel: '' }));
        const big = jpeg('big.jpg');
        Object.defineProperty(big, 'size', { value: MAX_FILE_BYTES + 1 });
        act(() => result.current.add([new File(['x'], 'notes.txt', { type: 'text/plain' }), big]));
        expect(result.current.items.map((i) => i.status)).toEqual(['invalid', 'invalid']);
        expect(upload).not.toHaveBeenCalled();
    });

    it('uploads in a batch with one client upload id per file and maps duplicates', async () => {
        upload.mockImplementation(async (_path: string, form: FormData) => {
            const ids = JSON.parse(String(form.get('clientUploadIds'))) as string[];
            expect(form.get('eventId')).toBe('7');
            expect(form.get('cameraLabel')).toBe('Cam A');
            expect(form.getAll('files')).toHaveLength(2);
            return { results: [{ fileName: 'a.jpg', ok: true, photoId: 1, clientUploadId: ids[0] }, { fileName: 'b.jpg', ok: true, photoId: 2, duplicate: true, clientUploadId: ids[1] }] };
        });
        const onUploaded = vi.fn();
        const { result } = renderHook(() => useUploadQueue({ eventId: 7, cameraLabel: 'Cam A', onUploaded }));
        act(() => result.current.add([jpeg('a.jpg'), jpeg('b.jpg')]));
        await waitFor(() => expect(result.current.stats.done + result.current.stats.duplicate).toBe(2));
        expect(result.current.items.map((i) => i.status)).toEqual(['done', 'duplicate']);
        expect(upload).toHaveBeenCalledTimes(1);
        expect(onUploaded).toHaveBeenCalled();
    });

    it('re-queues with backoff after a network error and reuses the same ids', async () => {
        upload.mockRejectedValueOnce(new ApiError('Network error', 0));
        const { result } = renderHook(() => useUploadQueue({ eventId: 3, cameraLabel: '' }));
        act(() => result.current.add([jpeg('a.jpg')]));
        await waitFor(() => expect(result.current.items[0].attempts).toBe(1));
        const item = result.current.items[0];
        expect(item.status).toBe('queued');
        expect(item.retryAt).toBeGreaterThan(Date.now());
    });

    it('stops the queue on a client error such as an event that is not live', async () => {
        upload.mockRejectedValueOnce(new ApiError('Start the event before uploading.', 409));
        const { result } = renderHook(() => useUploadQueue({ eventId: 3, cameraLabel: '' }));
        act(() => result.current.add([jpeg('a.jpg')]));
        await waitFor(() => expect(result.current.blocked).toBe('Start the event before uploading.'));
        expect(result.current.items[0].status).toBe('queued');
        expect(upload).toHaveBeenCalledTimes(1);
    });
});
