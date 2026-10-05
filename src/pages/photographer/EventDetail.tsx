import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Copy, Expand, ImageUp, Phone, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { EmptyState, QueryState, StatCard, StatusBadge } from '../../components/data';
import { Modal, useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Alert, Button, ButtonLink, Card, KeyValue, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { EVENT_ACTIONS, UPLOADABLE, useMyAssignments, type EventAction, type TaskStatus } from '../../lib/events';
import { date, dateTime, num, relative, time, titleCase } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';
import { useRealtime } from '../../lib/socket';
import type { EventStatus } from '../../lib/types';

interface EventData {
    id: number;
    event_code: string;
    title: string;
    event_type: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    venue: string | null;
    notes: string | null;
    status: EventStatus;
    customer_name: string;
    customer_phone: string | null;
    staff?: { id: number; user_id: number; name: string; phone: string | null; role: string; camera_label: string | null; task_status: string }[];
    gallery: { id: number; title: string; status: string } | null;
    photo_total: number;
}
interface LiveQr {
    tokenId: number;
    url: string;
    qr: string;
    expiresAt: string | null;
    galleryStatus: string;
}
interface UploadStatus {
    counts: Record<string, number>;
    total: number;
    queue: number;
    failed: { id: number; file_name: string; processing_error: string; created_at: string }[];
    cameras: { camera: string; n: number; last_upload: string }[];
    recent: { id: number; file_name: string; status: string; camera_label: string | null; created_at: string; uploaded_by: string | null; thumb_url: string | null }[];
}

const NEXT_TASK: Partial<Record<TaskStatus, { status: TaskStatus; label: string }>> = {
    ASSIGNED: { status: 'ACCEPTED', label: 'Accept assignment' },
    ACCEPTED: { status: 'IN_PROGRESS', label: 'Mark in progress' },
    IN_PROGRESS: { status: 'DONE', label: 'Mark my work done' },
};

export default function PhotographerEventDetail() {
    const id = Number(useParams().id);
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [qrOpen, setQrOpen] = useState(false);
    const q = useQuery({ queryKey: ['events', 'detail', id], queryFn: () => api.get<EventData>(`/api/events/${id}`), enabled: id > 0 });
    const mine = useMyAssignments('all');
    const assignment = mine.data?.find((a) => a.id === id) ?? null;
    const galleryId = q.data?.gallery?.id ?? null;
    const qr = useQuery({ queryKey: ['galleries', 'live-qr', galleryId], queryFn: () => api.get<LiveQr | null>(`/api/galleries/${galleryId}/live-qr`), enabled: !!galleryId });
    const status = useQuery({ queryKey: ['photos', 'upload-status', id], queryFn: () => api.get<UploadStatus>(`/api/photos/upload-status/${id}`), enabled: id > 0, refetchInterval: q.data && UPLOADABLE.includes(q.data.status) ? 20_000 : false });

    const refreshStatus = () => invalidate(['photos', 'upload-status', id]);
    useRealtime({ eventId: id, enabled: id > 0 }, {
        'event:status': (p: { eventId: number }) => p.eventId === id && invalidate(['events'], ['galleries', 'live-qr']),
        'photo:uploaded': (p: { eventId: number }) => p.eventId === id && refreshStatus(),
        'photo:processed': (p: { eventId: number }) => p.eventId === id && refreshStatus(),
        'photo:failed': (p: { eventId: number }) => p.eventId === id && refreshStatus(),
    });

    const transition = useMutation({
        mutationFn: (action: EventAction) => api.send('POST', `/api/events/${id}/${action}`),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['events'], ['galleries', 'live-qr']);
        },
        onError: (e) => toast.error(e),
    });
    const task = useMutation({
        mutationFn: (s: TaskStatus) => api.send('PUT', `/api/events/${id}/my-task`, { status: s }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['events', 'mine']);
        },
        onError: (e) => toast.error(e),
    });
    const retry = useMutation({
        mutationFn: (photoId: number) => api.send('POST', `/api/photos/${photoId}/retry`),
        onSuccess: (r) => {
            toast.success(r.message);
            refreshStatus();
        },
        onError: (e) => toast.error(e),
    });

    const copy = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Gallery link copied');
        } catch {
            toast.error('Could not copy. Long-press the link to copy it instead.');
        }
    };

    return (
        <div>
            <QueryState query={q}>
                {(e) => {
                    const actions = EVENT_ACTIONS.filter((a) => (a.action === 'start' || a.action === 'stop') && a.from.includes(e.status));
                    const next = assignment ? NEXT_TASK[assignment.task_status] : undefined;
                    return (
                        <>
                            <PageHeader
                                back={
                                    <Link to="/photographer/events" className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
                                        <ArrowLeft className="size-4" /> My events
                                    </Link>
                                }
                                title={
                                    <span className="flex flex-wrap items-center gap-3">
                                        {e.title} <StatusBadge status={e.status} />
                                    </span>
                                }
                                subtitle={`${e.event_code} · ${e.event_type} · ${date(e.event_date)}${e.start_time ? ` ${time(e.start_time)}` : ''}${e.venue ? ` · ${e.venue}` : ''}`}
                                actions={
                                    <>
                                        {actions.map((a) => (
                                            <Button
                                                key={a.action}
                                                variant={a.tone}
                                                loading={transition.isPending && transition.variables === a.action}
                                                onClick={async () => {
                                                    if (a.confirm && !(await ask({ title: `${a.label}?`, message: a.confirm, confirmLabel: a.label, tone: 'primary' }))) return;
                                                    transition.mutate(a.action);
                                                }}
                                            >
                                                {a.label}
                                            </Button>
                                        ))}
                                        {UPLOADABLE.includes(e.status) && (
                                            <ButtonLink to={`/photographer/upload?event=${e.id}`}>
                                                <ImageUp className="size-4" /> Upload
                                            </ButtonLink>
                                        )}
                                    </>
                                }
                            />
                            {e.status === 'UPCOMING' && <Alert className="mb-6">Tap “Go live” when the shoot starts. Uploads open once the event is live, and guests scanning the QR code see photos as they arrive.</Alert>}
                            <div className="grid gap-6 xl:grid-cols-3">
                                <div className="space-y-6 xl:col-span-2">
                                    <QueryState query={status}>
                                        {(s) => (
                                            <>
                                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                                    <StatCard label="Photos in event" value={num(s.total)} />
                                                    <StatCard label="Ready (preview)" value={num(Object.entries(s.counts).filter(([k]) => k !== 'UPLOADED' && k !== 'PROCESSING').reduce((n, [, v]) => n + Number(v), 0))} tone="emerald" />
                                                    <StatCard label="Processing" value={num(Number(s.counts.UPLOADED ?? 0) + Number(s.counts.PROCESSING ?? 0))} hint={s.queue ? `${num(s.queue)} in server queue` : undefined} tone="sky" />
                                                    <StatCard label="Failed" value={num(s.failed.length)} tone={s.failed.length ? 'rose' : 'stone'} />
                                                </div>
                                                {s.failed.length > 0 && (
                                                    <Card title={<span className="flex items-center gap-2"><AlertTriangle className="size-4 text-rose-600" /> Processing failures</span>} padded={false}>
                                                        <ul className="divide-y divide-stone-100">
                                                            {s.failed.map((f) => (
                                                                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-medium">{f.file_name}</p>
                                                                        <p className="truncate text-xs text-rose-700">{f.processing_error}</p>
                                                                    </div>
                                                                    <Button size="sm" variant="secondary" icon={<RotateCw className="size-4" />} loading={retry.isPending && retry.variables === f.id} onClick={() => retry.mutate(f.id)}>
                                                                        Retry
                                                                    </Button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </Card>
                                                )}
                                                <Card title="Recent uploads">
                                                    {s.recent.length ? (
                                                        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                                                            {s.recent.map((p) => (
                                                                <li key={p.id} className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                                                                    <div className="flex aspect-square items-center justify-center bg-stone-100">
                                                                        {p.thumb_url ? <img src={p.thumb_url} alt={p.file_name} loading="lazy" className="size-full object-cover" /> : <span className="px-1 text-center text-[11px] text-stone-500">{titleCase(p.status)}</span>}
                                                                    </div>
                                                                    <p className="truncate px-1.5 py-1 text-[11px] text-stone-600" title={`${p.file_name} · ${p.uploaded_by ?? ''}`}>
                                                                        {p.camera_label ?? p.file_name}
                                                                    </p>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <EmptyState title="No photos yet" description={UPLOADABLE.includes(e.status) ? 'Upload from the Upload page or the mobile app.' : 'Photos appear here once uploading starts.'} />
                                                    )}
                                                </Card>
                                                {s.cameras.length > 0 && (
                                                    <Card title="By camera" padded={false}>
                                                        <ul className="divide-y divide-stone-100 text-sm">
                                                            {s.cameras.map((c) => (
                                                                <li key={c.camera} className="flex justify-between px-4 py-2.5 sm:px-5">
                                                                    <span>{c.camera}</span>
                                                                    <span className="text-stone-500">
                                                                        {num(c.n)} · last {relative(c.last_upload)}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </Card>
                                                )}
                                            </>
                                        )}
                                    </QueryState>
                                </div>

                                <div className="space-y-6">
                                    <Card title="Guest QR code">
                                        {!e.gallery ? (
                                            <p className="text-sm text-stone-500">This event has no gallery yet. Ask the studio manager to create one.</p>
                                        ) : (
                                            <QueryState query={qr}>
                                                {(code) =>
                                                    code ? (
                                                        <div className="space-y-3 text-center">
                                                            <button type="button" onClick={() => setQrOpen(true)} className="mx-auto block w-full max-w-60 rounded-lg border border-stone-200 bg-white p-2" aria-label="Show QR code full screen">
                                                                <img src={code.qr} alt="Gallery QR code" className="w-full" />
                                                            </button>
                                                            <p className="text-xs text-stone-500">
                                                                Gallery {titleCase(code.galleryStatus)}
                                                                {code.expiresAt ? ` · expires ${dateTime(code.expiresAt)}` : ''}
                                                            </p>
                                                            <div className="flex flex-wrap justify-center gap-2">
                                                                <Button size="sm" variant="secondary" icon={<Expand className="size-4" />} onClick={() => setQrOpen(true)}>
                                                                    Show to guests
                                                                </Button>
                                                                <Button size="sm" variant="secondary" icon={<Copy className="size-4" />} onClick={() => copy(code.url)}>
                                                                    Copy link
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-stone-500">No active QR code. The studio manager can generate one from the gallery page.</p>
                                                    )
                                                }
                                            </QueryState>
                                        )}
                                    </Card>

                                    <Card title="My assignment">
                                        {assignment ? (
                                            <div className="space-y-3">
                                                <KeyValue
                                                    items={[
                                                        ['Role', titleCase(assignment.role)],
                                                        ['Camera', assignment.camera_label ?? '—'],
                                                        ['Task', <StatusBadge key="t" status={assignment.task_status} />],
                                                        ['My uploads', num(assignment.my_uploads)],
                                                    ]}
                                                />
                                                {next && (
                                                    <Button className="w-full" variant="secondary" loading={task.isPending} onClick={() => task.mutate(next.status)}>
                                                        {next.label}
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-stone-500">{mine.isLoading ? 'Loading…' : 'You are viewing this event without an assignment.'}</p>
                                        )}
                                    </Card>

                                    <Card title="Details">
                                        <KeyValue
                                            items={[
                                                ['Customer', e.customer_name],
                                                [
                                                    'Phone',
                                                    e.customer_phone ? (
                                                        <a key="p" href={`tel:${e.customer_phone}`} className="link inline-flex items-center gap-1">
                                                            <Phone className="size-3.5" /> {e.customer_phone}
                                                        </a>
                                                    ) : null,
                                                ],
                                                ['Time', e.start_time ? `${time(e.start_time)}${e.end_time ? ` – ${time(e.end_time)}` : ''}` : null],
                                                ['Venue', e.venue],
                                            ]}
                                        />
                                        {e.notes && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-sm">{e.notes}</p>}
                                    </Card>

                                    {e.staff && e.staff.length > 0 && (
                                        <Card title="Team" padded={false}>
                                            <ul className="divide-y divide-stone-100 text-sm">
                                                {e.staff.map((s) => (
                                                    <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                                                        <span>
                                                            <span className="font-medium">{s.name}</span>
                                                            <span className="block text-xs text-stone-500">
                                                                {titleCase(s.role)}
                                                                {s.camera_label ? ` · ${s.camera_label}` : ''}
                                                            </span>
                                                        </span>
                                                        {s.phone && (
                                                            <a href={`tel:${s.phone}`} className="text-xs text-brand-700 hover:underline">
                                                                Call
                                                            </a>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </Card>
                                    )}
                                </div>
                            </div>

                            <Modal open={qrOpen && !!qr.data} onClose={() => setQrOpen(false)} title="Scan to see your photos" size="lg">
                                {qr.data && (
                                    <div className="text-center">
                                        <img src={qr.data.qr} alt="Gallery QR code" className="mx-auto w-full max-w-md" />
                                        <p className="mt-3 text-lg font-semibold">{e.title}</p>
                                        <p className="text-sm text-stone-500">Point your phone camera at the code to open the live gallery.</p>
                                    </div>
                                )}
                            </Modal>
                            {dialog}
                        </>
                    );
                }}
            </QueryState>
        </div>
    );
}
