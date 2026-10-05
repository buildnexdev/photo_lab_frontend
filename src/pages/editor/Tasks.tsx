import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { DataTable, EmptyState, QueryState, StatusBadge } from '../../components/data';
import { useToast } from '../../components/toast';
import { Button, ButtonLink, Card, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useEditorQueue } from '../../lib/editor';
import { useMyAssignments, type TaskStatus } from '../../lib/events';
import { date, num, titleCase } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';

const NEXT: Partial<Record<TaskStatus, { status: TaskStatus; label: string }>> = {
    ASSIGNED: { status: 'ACCEPTED', label: 'Accept' },
    ACCEPTED: { status: 'IN_PROGRESS', label: 'Start' },
    IN_PROGRESS: { status: 'DONE', label: 'Mark done' },
};

export default function EditorTasks() {
    const navigate = useNavigate();
    const toast = useToast();
    const invalidate = useInvalidate();
    const queue = useEditorQueue();
    const mine = useMyAssignments('upcoming');
    const update = useMutation({
        mutationFn: ({ eventId, status }: { eventId: number; status: TaskStatus }) => api.send('PUT', `/api/events/${eventId}/my-task`, { status }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['events', 'mine']);
        },
        onError: (e) => toast.error(e),
    });

    return (
        <div>
            <PageHeader title="Tasks" subtitle="Photos assigned to you for retouching, grouped by event." />
            <div className="space-y-6">
                <Card title="Editing queue" padded={false}>
                    <QueryState query={queue}>
                        {(rows) => (
                            <DataTable
                                rows={rows}
                                rowKey={(r) => r.event_id}
                                onRowClick={(r) => navigate(`/editor/photos?eventId=${r.event_id}${Number(r.editing) ? '&status=EDITING' : ''}`)}
                                empty={<EmptyState title="Nothing assigned" description="When a manager assigns photos to you for editing, they appear here." />}
                                columns={[
                                    { key: 'event', header: 'Event', cell: (r) => <span><span className="font-medium">{r.event_title}</span><span className="block text-xs text-stone-500">{r.event_code} · {r.customer_name}</span></span> },
                                    { key: 'date', header: 'Date', cell: (r) => date(r.event_date), hideOnMobile: true },
                                    {
                                        key: 'progress',
                                        header: 'Progress',
                                        cell: (r) => {
                                            const done = Number(r.edited) + Number(r.approved);
                                            const pct = Number(r.total) ? Math.round((done / Number(r.total)) * 100) : 0;
                                            return (
                                                <div className="min-w-32">
                                                    <div className="mb-1 flex justify-between text-xs text-stone-500">
                                                        <span>
                                                            {num(done)} / {num(r.total)}
                                                        </span>
                                                        <span>{pct}%</span>
                                                    </div>
                                                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                                                        <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        },
                                    },
                                    { key: 'todo', header: 'To edit', cell: (r) => <span className="font-semibold">{num(r.editing)}</span> },
                                    { key: 'approved', header: 'Approved', cell: (r) => num(r.approved), hideOnMobile: true },
                                ]}
                            />
                        )}
                    </QueryState>
                </Card>

                <Card title="Event assignments" padded={false}>
                    <QueryState query={mine}>
                        {(rows) => (
                            <DataTable
                                rows={rows}
                                rowKey={(r) => r.assignment_id}
                                empty={<EmptyState title="No active event assignments" />}
                                columns={[
                                    { key: 'event', header: 'Event', cell: (r) => <span><span className="font-medium">{r.title}</span><span className="block text-xs text-stone-500">{r.event_code} · {r.customer_name}</span></span> },
                                    { key: 'date', header: 'Date', cell: (r) => date(r.event_date), hideOnMobile: true },
                                    { key: 'role', header: 'Role', cell: (r) => titleCase(r.role), hideOnMobile: true },
                                    { key: 'status', header: 'Event', cell: (r) => <StatusBadge status={r.status} />, hideOnMobile: true },
                                    { key: 'task', header: 'My task', cell: (r) => <StatusBadge status={r.task_status} /> },
                                    {
                                        key: 'act',
                                        header: '',
                                        cell: (r) => {
                                            const next = NEXT[r.task_status];
                                            return (
                                                <div className="flex justify-end gap-2">
                                                    {next && (
                                                        <Button size="sm" variant="secondary" loading={update.isPending && update.variables?.eventId === r.id} onClick={() => update.mutate({ eventId: r.id, status: next.status })}>
                                                            {next.label}
                                                        </Button>
                                                    )}
                                                    <ButtonLink size="sm" variant="ghost" to={`/editor/photos?eventId=${r.id}`}>
                                                        Photos
                                                    </ButtonLink>
                                                </div>
                                            );
                                        },
                                    },
                                ]}
                            />
                        )}
                    </QueryState>
                </Card>
            </div>
        </div>
    );
}
