// Developer by: Buildnexdev.in
// Developer   : Nandhakumar@gmail.com
// Last Edited : 14-10-2026
//
// useFolderWatcher
// ────────────────────────────────────────────────────────────────────────────
// Uses the browser File System Access API (showDirectoryPicker) to watch a
// folder on the local machine.  After the photographer grants access, we do
// an initial "baseline" scan so pre-existing shots are NOT re-queued, then
// poll every `interval` ms and call `onNewFiles` with any brand-new File
// objects we find.
//
// Browser support: Chrome 86+, Edge 86+.
// On Firefox/Safari `supported` is false - UI falls back to manual picker.
// ────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

// ── types ────────────────────────────────────────────────────────────────────

export interface FolderWatcherState {
    /** Whether a folder is currently being watched. */
    active: boolean;
    /** Display name of the watched folder, e.g. "DCIM". */
    folderName: string | null;
    /** Cumulative count of new photos discovered since the watcher started. */
    newCount: number;
    /** Last error message, if any. */
    error: string | null;
}

export interface UseFolderWatcherOptions {
    /** Called with every batch of newly discovered File objects. */
    onNewFiles: (files: File[]) => void;
    /** Polling interval in ms.  Default: 2000. */
    interval?: number;
}

export interface FolderWatcherControls extends FolderWatcherState {
    start: () => Promise<void>;
    stop: () => void;
    /** True when the browser supports the File System Access API. */
    supported: boolean;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const IMAGE_RE = /\.(jpe?g|png|webp|heic|heif|tiff?)$/i;

/** Dedup key: name + lastModified so we catch same-name overwrites. */
const fileKey = (name: string, lastModified: number) => `${name}::${lastModified}`;

// ── hook ─────────────────────────────────────────────────────────────────────

export function useFolderWatcher({
    onNewFiles,
    interval = 2000,
}: UseFolderWatcherOptions): FolderWatcherControls {
    const [state, setState] = useState<FolderWatcherState>({
        active: false,
        folderName: null,
        newCount: 0,
        error: null,
    });

    const dirRef  = useRef<FileSystemDirectoryHandle | null>(null);
    const seenRef = useRef<Set<string>>(new Set());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cbRef   = useRef(onNewFiles);
    cbRef.current = onNewFiles;

    // ── scan ─────────────────────────────────────────────────────────────────

    const scan = useCallback(async (isBaseline = false) => {
        const dir = dirRef.current;
        if (!dir) return;
        try {
            const fresh: File[] = [];
            for await (const entry of (dir as any).values()) {
                if (entry.kind !== 'file') continue;
                if (!IMAGE_RE.test(entry.name)) continue;
                const file: File = await (entry as FileSystemFileHandle).getFile();
                const key = fileKey(file.name, file.lastModified);
                if (!seenRef.current.has(key)) {
                    seenRef.current.add(key);
                    if (!isBaseline) fresh.push(file);
                }
            }
            if (fresh.length > 0) {
                setState((s) => ({ ...s, newCount: s.newCount + fresh.length }));
                cbRef.current(fresh);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setState((s) => ({ ...s, active: false, error: msg }));
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // ── start ─────────────────────────────────────────────────────────────────

    const start = useCallback(async () => {
        try {
            const dir: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
            dirRef.current  = dir;
            seenRef.current = new Set();

            // Baseline: mark existing files as seen - never re-queue old shots.
            await scan(true);

            setState({ active: true, folderName: dir.name, newCount: 0, error: null });
            timerRef.current = setInterval(() => void scan(false), interval);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return; // user cancelled
            setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err) }));
        }
    }, [scan, interval]);

    // ── stop ──────────────────────────────────────────────────────────────────

    const stop = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current  = null;
        dirRef.current    = null;
        seenRef.current   = new Set();
        setState({ active: false, folderName: null, newCount: 0, error: null });
    }, []);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    const supported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

    return { ...state, start, stop, supported };
}
