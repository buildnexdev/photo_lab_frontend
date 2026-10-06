// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE, getAccessToken } from './api';

interface Shared {
    socket: Socket;
    refs: number;
    rooms: Map<string, number>;
}

/** One connection per auth context (user token and/or gallery session), shared by all subscribers. */
const pool = new Map<string, Shared>();

function acquire(gallerySession: string | null | undefined): Shared {
    const key = gallerySession ?? 'user';
    let s = pool.get(key);
    if (!s) {
        const socket = io(API_BASE || undefined, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            withCredentials: true,
            auth: (cb) => cb({ token: getAccessToken() ?? undefined, gallerySession: gallerySession ?? undefined }),
            reconnectionDelayMax: 10_000,
        });
        const shared: Shared = { socket, refs: 0, rooms: new Map() };
        // Re-join rooms after every reconnect
        socket.on('connect', () => {
            for (const room of shared.rooms.keys()) {
                const [kind, id] = room.split(':');
                socket.emit(kind === 'gallery' ? 'gallery:join' : 'event:join', Number(id));
            }
        });
        s = shared;
        pool.set(key, s);
    }
    s.refs += 1;
    return s;
}

function release(gallerySession: string | null | undefined) {
    const key = gallerySession ?? 'user';
    const s = pool.get(key);
    if (!s) return;
    s.refs -= 1;
    if (s.refs <= 0) {
        s.socket.disconnect();
        pool.delete(key);
    }
}

function joinRoom(s: Shared, room: string) {
    s.rooms.set(room, (s.rooms.get(room) ?? 0) + 1);
    if (s.socket.connected) {
        const [kind, id] = room.split(':');
        s.socket.emit(kind === 'gallery' ? 'gallery:join' : 'event:join', Number(id));
    }
}

function leaveRoom(s: Shared, room: string) {
    const n = (s.rooms.get(room) ?? 1) - 1;
    if (n <= 0) s.rooms.delete(room);
    else s.rooms.set(room, n);
}

type Handlers = Record<string, (payload: never) => void>;

/** Subscribe to realtime events for the lifetime of the component. */
export function useRealtime(opts: { enabled?: boolean; gallerySession?: string | null; galleryId?: number | null; eventId?: number | null }, handlers: Handlers) {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;
    const { enabled = true, gallerySession, galleryId, eventId } = opts;
    const names = Object.keys(handlers).sort().join(',');

    useEffect(() => {
        if (!enabled) return;
        const shared = acquire(gallerySession);
        const rooms = [galleryId ? `gallery:${galleryId}` : null, eventId ? `event:${eventId}` : null].filter((r): r is string => !!r);
        rooms.forEach((r) => joinRoom(shared, r));
        const bound = names
            .split(',')
            .filter(Boolean)
            .map((name) => {
                const fn = (payload: unknown) => handlersRef.current[name]?.(payload as never);
                shared.socket.on(name, fn);
                return [name, fn] as const;
            });
        return () => {
            bound.forEach(([name, fn]) => shared.socket.off(name, fn));
            rooms.forEach((r) => leaveRoom(shared, r));
            release(gallerySession);
        };
    }, [enabled, gallerySession, galleryId, eventId, names]);
}
