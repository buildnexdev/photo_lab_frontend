// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { BellOff, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { EmptyState, Pagination, QueryState } from '../../components/data';
import type { Notification } from '../../components/NotificationBell';
import { useToast } from '../../components/toast';
import { Button, Card, PageHeader, Tabs } from '../../components/ui';
import { api, type Paged } from '../../lib/api';
import { dateTime, relative } from '../../lib/format';
import { useInvalidate, useListParams } from '../../lib/hooks';

export default function NotificationsPage() {
    const { page, filters, setPage, setFilter } = useListParams(['show'] as const);
    const unreadOnly = filters.show === 'unread';
    const navigate = useNavigate();
    const toast = useToast();
    const invalidate = useInvalidate();
    const q = useQuery({
        queryKey: ['notifications', 'page', page, unreadOnly],
        queryFn: () => api.get<Paged<Notification> & { unread: number }>('/api/notifications', { page, pageSize: 20, unread: unreadOnly || undefined }),
        placeholderData: (p) => p,
    });

    const markRead = async (ids: number[] | 'all') => {
        try {
            await api.post('/api/notifications/read', { ids });
            await invalidate(['notifications']);
        } catch (e) {
            toast.error(e);
        }
    };
    const open = async (n: Notification) => {
        if (!n.read_at) await markRead([n.id]);
        if (n.link) navigate(n.link);
    };

    return (
        <div>
            <PageHeader
                title="Notifications"
                subtitle={q.data ? `${q.data.unread} unread` : undefined}
                actions={
                    <Button variant="secondary" icon={<CheckCheck className="size-4" />} disabled={!q.data?.unread} onClick={() => markRead('all')}>
                        Mark all read
                    </Button>
                }
            />
            <Card padded={false}>
                <div className="px-4 pt-2">
                    <Tabs
                        value={unreadOnly ? 'unread' : 'all'}
                        onChange={(v) => setFilter('show', v === 'unread' ? 'unread' : '')}
                        tabs={[
                            { value: 'all', label: 'All' },
                            { value: 'unread', label: 'Unread', count: q.data?.unread },
                        ]}
                    />
                </div>
                <QueryState query={q} isEmpty={(d) => !d.items.length} empty={<EmptyState icon={<BellOff className="size-10" />} title={unreadOnly ? 'No unread notifications' : 'No notifications yet'} />}>
                    {(d) => (
                        <>
                            <ul className="divide-y divide-stone-100">
                                {d.items.map((n) => (
                                    <li key={n.id} className={clsx('flex items-start gap-3 px-4 py-3 sm:px-5', !n.read_at && 'bg-brand-50/40')}>
                                        <span className={clsx('mt-1.5 size-2 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-brand-600')} />
                                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => open(n)}>
                                            <p className="text-sm font-medium text-stone-900">{n.title}</p>
                                            <p className="mt-0.5 text-sm text-stone-600">{n.body}</p>
                                            <p className="mt-1 text-xs text-stone-400" title={dateTime(n.created_at)}>
                                                {relative(n.created_at)}
                                            </p>
                                        </button>
                                        {!n.read_at && (
                                            <button type="button" className="shrink-0 text-xs font-medium text-brand-700 hover:underline" onClick={() => markRead([n.id])}>
                                                Mark read
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
        </div>
    );
}
