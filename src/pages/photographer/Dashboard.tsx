import { Calendar, Camera, ImageUp, ListChecks, Radio } from 'lucide-react';
import { useNavigate } from 'react-router';
import { DataTable, EmptyState, QueryState, StatCard, StatusBadge } from '../../components/data';
import { ButtonLink, Card, PageHeader } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { UPLOADABLE, useMyAssignments } from '../../lib/events';
import { date, num, time, todayYmd } from '../../lib/format';

export default function PhotographerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const q = useMyAssignments('all');
    return (
        <div>
            <PageHeader
                title={`Hello, ${user?.name.split(' ')[0] ?? ''}`}
                subtitle="Your shoots, uploads and tasks."
                actions={
                    <ButtonLink to="/photographer/upload">
                        <ImageUp className="size-4" /> Upload photos
                    </ButtonLink>
                }
            />
            <QueryState query={q}>
                {(rows) => {
                    const today = todayYmd();
                    const live = rows.filter((r) => UPLOADABLE.includes(r.status));
                    const upcoming = rows.filter((r) => r.status === 'UPCOMING');
                    const openTasks = rows.filter((r) => r.task_status !== 'DONE' && !['COMPLETED', 'CANCELLED'].includes(r.status));
                    const uploads = rows.reduce((s, r) => s + Number(r.my_uploads), 0);
                    return (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <StatCard label="Live / uploading" value={num(live.length)} icon={<Radio className="size-5" />} tone="rose" onClick={() => navigate('/photographer/events')} />
                                <StatCard label="Upcoming shoots" value={num(upcoming.length)} hint={`${upcoming.filter((r) => r.event_date.slice(0, 10) === today).length} today`} icon={<Calendar className="size-5" />} tone="sky" onClick={() => navigate('/photographer/events')} />
                                <StatCard label="Open tasks" value={num(openTasks.length)} icon={<ListChecks className="size-5" />} tone="brand" onClick={() => navigate('/photographer/tasks')} />
                                <StatCard label="Photos I uploaded" value={num(uploads)} icon={<Camera className="size-5" />} tone="emerald" />
                            </div>

                            {live.length > 0 && (
                                <Card title="Shooting now">
                                    <ul className="grid gap-3 md:grid-cols-2">
                                        {live.map((r) => (
                                            <li key={r.id} className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold">{r.title}</p>
                                                        <p className="text-xs text-stone-500">
                                                            {r.customer_name} · {r.venue ?? r.event_type}
                                                        </p>
                                                    </div>
                                                    <StatusBadge status={r.status} />
                                                </div>
                                                <p className="mt-2 text-sm text-stone-600">
                                                    {num(r.my_uploads)} by me · {num(r.photo_count)} total
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <ButtonLink size="sm" to={`/photographer/upload?event=${r.id}`}>
                                                        Upload
                                                    </ButtonLink>
                                                    <ButtonLink size="sm" variant="secondary" to={`/photographer/event/${r.id}`}>
                                                        Live QR & status
                                                    </ButtonLink>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            )}

                            <Card title="Upcoming shoots" padded={false}>
                                <DataTable
                                    rows={upcoming}
                                    rowKey={(r) => r.assignment_id}
                                    onRowClick={(r) => navigate(`/photographer/event/${r.id}`)}
                                    empty={<EmptyState title="No upcoming shoots" description="Events you are assigned to will appear here." />}
                                    columns={[
                                        { key: 'date', header: 'Date', cell: (r) => <span className="whitespace-nowrap">{date(r.event_date)}{r.start_time ? <span className="block text-xs text-stone-500">{time(r.start_time)}</span> : null}</span> },
                                        { key: 'event', header: 'Event', cell: (r) => <span><span className="font-medium">{r.title}</span><span className="block text-xs text-stone-500">{r.event_code} · {r.event_type}</span></span> },
                                        { key: 'venue', header: 'Venue', cell: (r) => r.venue ?? '—', hideOnMobile: true },
                                        { key: 'camera', header: 'Camera', cell: (r) => r.camera_label ?? '—', hideOnMobile: true },
                                        { key: 'task', header: 'My task', cell: (r) => <StatusBadge status={r.task_status} /> },
                                    ]}
                                />
                            </Card>
                        </div>
                    );
                }}
            </QueryState>
        </div>
    );
}
