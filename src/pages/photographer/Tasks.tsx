// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { EmptyState, QueryState, StatusBadge } from '../../components/data';
import { useToast } from '../../components/toast';
import { Button, ButtonLink, Card, PageHeader, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { UPLOADABLE, useMyAssignments, type Assignment, type TaskStatus } from '../../lib/events';
import { date, num, time, titleCase } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';

const NEXT: Partial<Record<TaskStatus, { status: TaskStatus; label: string }[]>> = {
    ASSIGNED: [{ status: 'ACCEPTED', label: 'Accept' }],
    ACCEPTED: [{ status: 'IN_PROGRESS', label: 'Start work' }],
    IN_PROGRESS: [{ status: 'DONE', label: 'Mark done' }],
    DONE: [{ status: 'IN_PROGRESS', label: 'Reopen' }],
};

const isOpen = (a: Assignment) => a.task_status !== 'DONE' && !['COMPLETED', 'CANCELLED'].includes(a.status);

export default function PhotographerTasks() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [params, setParams] = useSearchParams();
    const view = params.get('view') === 'done' ? 'done' : 'open';
    const q = useMyAssignments('all');
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
            <PageHeader title="Tasks" subtitle="Accept new assignments and mark your work done so the studio knows where each shoot stands." />
            <QueryState query={q}>
                {(rows) => {
                    const open = rows.filter(isOpen);
                    const done = rows.filter((r) => !isOpen(r));
                    const list = view === 'open' ? open : done;
                    return (
                        <>
                            <Tabs
                                className="mb-4"
                                value={view}
                                onChange={(v) => setParams(v === 'done' ? { view: 'done' } : {}, { replace: true })}
                                tabs={[
                                    { value: 'open', label: 'Open', count: open.length },
                                    { value: 'done', label: 'Done', count: done.length },
                                ]}
                            />
                            {list.length === 0 ? (
                                <Card>
                                    <EmptyState title={view === 'open' ? 'Nothing pending' : 'No finished tasks yet'} description={view === 'open' ? 'New assignments from the studio appear here.' : undefined} />
                                </Card>
                            ) : (
                                <ul className="grid gap-4 md:grid-cols-2">
                                    {list.map((a) => {
                                        const closed = ['COMPLETED', 'CANCELLED'].includes(a.status);
                                        return (
                                            <li key={a.assignment_id}>
                                                <Card>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-semibold">{a.title}</p>
                                                            <p className="text-xs text-stone-500">
                                                                {a.event_code} · {date(a.event_date)}
                                                                {a.start_time ? ` ${time(a.start_time)}` : ''}
                                                            </p>
                                                        </div>
                                                        <StatusBadge status={a.task_status} />
                                                    </div>
                                                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                                        <dt className="text-stone-500">Event</dt>
                                                        <dd>
                                                            <StatusBadge status={a.status} />
                                                        </dd>
                                                        <dt className="text-stone-500">Role</dt>
                                                        <dd>{titleCase(a.role)}{a.camera_label ? ` · ${a.camera_label}` : ''}</dd>
                                                        <dt className="text-stone-500">Customer</dt>
                                                        <dd className="truncate">{a.customer_name}</dd>
                                                        <dt className="text-stone-500">Venue</dt>
                                                        <dd className="truncate">{a.venue ?? '—'}</dd>
                                                        <dt className="text-stone-500">My uploads</dt>
                                                        <dd>{num(a.my_uploads)}</dd>
                                                    </dl>
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {!closed &&
                                                            (NEXT[a.task_status] ?? []).map((n) => (
                                                                <Button
                                                                    key={n.status}
                                                                    size="sm"
                                                                    variant={n.status === 'IN_PROGRESS' && a.task_status === 'DONE' ? 'secondary' : 'primary'}
                                                                    loading={update.isPending && update.variables?.eventId === a.id}
                                                                    onClick={() => update.mutate({ eventId: a.id, status: n.status })}
                                                                >
                                                                    {n.label}
                                                                </Button>
                                                            ))}
                                                        {UPLOADABLE.includes(a.status) && (
                                                            <ButtonLink size="sm" variant="secondary" to={`/photographer/upload?event=${a.id}`}>
                                                                Upload
                                                            </ButtonLink>
                                                        )}
                                                        <ButtonLink size="sm" variant="ghost" to={`/photographer/event/${a.id}`}>
                                                            Open event
                                                        </ButtonLink>
                                                    </div>
                                                </Card>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </>
                    );
                }}
            </QueryState>
        </div>
    );
}
