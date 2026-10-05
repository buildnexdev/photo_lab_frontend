import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, type Paged } from '../lib/api';
import { useAuth } from '../lib/auth';
import { relative } from '../lib/format';
import { useInvalidate } from '../lib/hooks';
import { useRealtime } from '../lib/socket';
import { useToast } from './toast';

export interface Notification {
    id: number;
    type: string;
    title: string;
    body: string;
    link: string | null;
    read_at: string | null;
    created_at: string;
}

export function NotificationBell({ allLink }: { allLink?: string }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { status } = useAuth();
    const q = useQuery({
        queryKey: ['notifications', 'bell'],
        queryFn: () => api.get<Paged<Notification> & { unread: number }>('/api/notifications', { pageSize: 8 }),
        refetchInterval: 60_000,
        enabled: status === 'authenticated',
    });

    useRealtime({ enabled: status === 'authenticated' }, {
        notification: (n: { title: string }) => {
            toast.info(n.title);
            void invalidate(['notifications']);
        },
    });

    useEffect(() => {
        const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const openItem = async (n: Notification) => {
        setOpen(false);
        if (!n.read_at) await api.post('/api/notifications/read', { ids: [n.id] }).catch(() => undefined);
        void invalidate(['notifications']);
        if (n.link) navigate(n.link);
    };
    const markAll = async () => {
        try {
            await api.post('/api/notifications/read', { ids: 'all' });
            void invalidate(['notifications']);
        } catch (e) {
            toast.error(e);
        }
    };
    const unread = q.data?.unread ?? 0;

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="relative flex size-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-xs hover:bg-stone-50 hover:border-stone-300 transition-colors"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            >
                <Bell className="size-4" />
                {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-xs">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
                        <p className="text-sm font-semibold">Notifications</p>
                        {unread > 0 && (
                            <button type="button" className="text-xs font-medium text-brand-700 hover:underline" onClick={markAll}>
                                Mark all read
                            </button>
                        )}
                    </div>
                    <ul className="max-h-96 divide-y divide-stone-100 overflow-y-auto">
                        {q.isLoading && <li className="px-4 py-6 text-center text-sm text-stone-500">Loading…</li>}
                        {q.isError && <li className="px-4 py-6 text-center text-sm text-red-600">Could not load notifications.</li>}
                        {q.data && !q.data.items.length && <li className="px-4 py-6 text-center text-sm text-stone-500">You're all caught up.</li>}
                        {q.data?.items.map((n) => (
                            <li key={n.id}>
                                <button type="button" onClick={() => openItem(n)} className={clsx('block w-full px-4 py-3 text-left hover:bg-stone-50', !n.read_at && 'bg-brand-50/50')}>
                                    <p className="flex items-center gap-2 text-sm font-medium text-stone-900">
                                        {!n.read_at && <span className="size-2 shrink-0 rounded-full bg-brand-600" />}
                                        {n.title}
                                    </p>
                                    <p className="mt-0.5 line-clamp-2 text-xs text-stone-600">{n.body}</p>
                                    <p className="mt-1 text-[11px] text-stone-400">{relative(n.created_at)}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {allLink && (
                        <button type="button" onClick={() => { setOpen(false); navigate(allLink); }} className="block w-full border-t border-stone-100 px-4 py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-stone-50">
                            View all
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
