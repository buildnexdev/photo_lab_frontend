// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, MessageSquareWarning, Wand2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { DataTable, EmptyState, QueryState, StatCard, StatusBadge } from '../../components/data';
import { Card, PageHeader } from '../../components/ui';
import { api, type Paged } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useEditorQueue } from '../../lib/editor';
import { date, num, relative } from '../../lib/format';
import type { Proof } from '../../lib/types';

const sumOf = (rows: { editing: number; edited: number; approved: number }[] | undefined, k: 'editing' | 'edited' | 'approved') => (rows ?? []).reduce((s, r) => s + Number(r[k]), 0);

export default function EditorDashboard() {
    const { user, can } = useAuth();
    const navigate = useNavigate();
    const canEdit = can('photos.edit');
    const canProofs = can('proofs.manage');
    const queue = useEditorQueue(canEdit);
    const revisions = useQuery({ queryKey: ['proofs', 'list', { status: 'REVISION_REQUESTED' }], queryFn: () => api.get<Paged<Proof & { customer_name: string }>>('/api/proofs', { status: 'REVISION_REQUESTED', pageSize: 10 }), enabled: canProofs });
    const drafts = useQuery({ queryKey: ['proofs', 'list', { status: 'DRAFT' }], queryFn: () => api.get<Paged<Proof>>('/api/proofs', { status: 'DRAFT', pageSize: 1 }), enabled: canProofs });

    return (
        <div>
            <PageHeader title={`Hello, ${user?.name.split(' ')[0] ?? ''}`} subtitle="Your editing queue and album proofs." />
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {canEdit && (
                        <>
                            <StatCard label="To edit" value={queue.isLoading ? '…' : num(sumOf(queue.data, 'editing'))} icon={<Wand2 className="size-5" />} tone="brand" onClick={() => navigate('/editor/photos?status=EDITING')} />
                            <StatCard label="Awaiting approval" value={queue.isLoading ? '…' : num(sumOf(queue.data, 'edited'))} icon={<CheckCircle2 className="size-5" />} tone="sky" onClick={() => navigate('/editor/photos?status=EDITED')} />
                        </>
                    )}
                    {canProofs && (
                        <>
                            <StatCard label="Revisions requested" value={revisions.isLoading ? '…' : num(revisions.data?.total)} icon={<MessageSquareWarning className="size-5" />} tone="rose" onClick={() => navigate('/editor/proofs?status=REVISION_REQUESTED')} />
                            <StatCard label="Draft proofs" value={drafts.isLoading ? '…' : num(drafts.data?.total)} icon={<BookOpen className="size-5" />} tone="violet" onClick={() => navigate('/editor/proofs?status=DRAFT')} />
                        </>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {canEdit && (
                        <Card
                            title="Editing queue"
                            className={canProofs ? 'lg:col-span-2' : 'lg:col-span-3'}
                            padded={false}
                            actions={
                                <Link to="/editor/tasks" className="text-sm text-brand-700 hover:underline">
                                    All tasks
                                </Link>
                            }
                        >
                            <QueryState query={queue}>
                                {(rows) => (
                                    <DataTable
                                        rows={rows.filter((r) => Number(r.editing) > 0).slice(0, 8)}
                                        rowKey={(r) => r.event_id}
                                        onRowClick={(r) => navigate(`/editor/photos?eventId=${r.event_id}&status=EDITING`)}
                                        empty={<EmptyState title="Queue is clear" description="Photos assigned to you for editing appear here." />}
                                        columns={[
                                            { key: 'event', header: 'Event', cell: (r) => <span><span className="font-medium">{r.event_title}</span><span className="block text-xs text-stone-500">{r.event_code} · {r.customer_name}</span></span> },
                                            { key: 'date', header: 'Date', cell: (r) => date(r.event_date), hideOnMobile: true },
                                            { key: 'todo', header: 'To edit', cell: (r) => <span className="font-semibold">{num(r.editing)}</span> },
                                            { key: 'done', header: 'Done', cell: (r) => `${num(Number(r.edited) + Number(r.approved))} / ${num(r.total)}`, hideOnMobile: true },
                                        ]}
                                    />
                                )}
                            </QueryState>
                        </Card>
                    )}
                    {canProofs && (
                        <Card
                            title="Album revisions"
                            className={canEdit ? '' : 'lg:col-span-3'}
                            padded={false}
                            actions={
                                <Link to="/editor/proofs" className="text-sm text-brand-700 hover:underline">
                                    All proofs
                                </Link>
                            }
                        >
                            <QueryState query={revisions}>
                                {(p) =>
                                    p.items.length ? (
                                        <ul className="divide-y divide-stone-100">
                                            {p.items.map((r) => (
                                                <li key={r.id}>
                                                    <Link to={`/editor/proofs?open=${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 sm:px-5">
                                                        <span className="min-w-0">
                                                            <span className="block truncate text-sm font-medium">
                                                                {r.title} v{r.version}
                                                            </span>
                                                            <span className="block truncate text-xs text-stone-500">
                                                                {r.event_title} · {r.customer_name} · {relative(r.created_at)}
                                                            </span>
                                                        </span>
                                                        <StatusBadge status={r.status} />
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <EmptyState title="No open revisions" description="Customer change requests on album proofs appear here." />
                                    )
                                }
                            </QueryState>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
