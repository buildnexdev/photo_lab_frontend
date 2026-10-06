// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Images, MessageSquare, Pencil, QrCode, Trash2, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { EmptyState, QueryState, StatCard, StatusBadge } from '../../components/data';
import { EventForm, type EventFormValue } from '../../components/EventForm';
import { Input, Select } from '../../components/form';
import { Modal, useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Button, ButtonLink, Card, KeyValue, PageHeader, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { EVENT_ACTIONS, STAFF_ROLE_SOURCE, STAFF_ROLES, type EventAction, type StaffRole } from '../../lib/events';
import { date, dateTime, money, num, relative, time, titleCase } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';
import { useRealtime } from '../../lib/socket';
import type { EventStatus } from '../../lib/types';

interface StaffRow {
    id: number;
    user_id: number;
    name: string;
    email: string | null;
    phone: string | null;
    role: StaffRole;
    camera_label: string | null;
    task_status: string;
}
interface EventDetailData extends EventFormValue {
    event_code: string;
    status: EventStatus;
    booking_no: string | null;
    booking_status: string | null;
    total_amount: number | null;
    paid_amount: number | null;
    package_name: string | null;
    payment_status: string;
    started_at: string | null;
    completed_at: string | null;
    staff: StaffRow[];
    gallery: { id: number; title: string; status: string; watermark_enabled: number; allow_download: number; photo_price: number | null; expires_at: string | null } | null;
    photos: Record<string, number>;
    photo_total: number;
    revenue: { booking: number; orders: number; total: number };
    access: { gallery_opens: number; photo_views: number; downloads: number };
}
interface SelectionData {
    submissions: { id: number; customer_id: number; customer_name: string; status: string; photo_count: number; note: string | null; submitted_at: string | null; confirmed_at: string | null }[];
    photos: { id: number; file_name: string; status: string; thumb_url: string | null; customer_id: number; comments: number }[];
    comments: { id: number; photo_id: number; body: string; is_staff: number; created_at: string; user_name: string }[];
}
interface Culling {
    analysed: number;
    blurry: number | null;
    duplicates: number | null;
    eyes_closed: number | null;
    couple: number | null;
    family: number | null;
    group: number | null;
    single: number | null;
}

type Tab = 'overview' | 'selection' | 'culling';

export default function AdminEventDetail() {
    const id = Number(useParams().id);
    const navigate = useNavigate();
    const { can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [params, setParams] = useSearchParams();
    const tab = (['overview', 'selection', 'culling'].includes(params.get('tab') ?? '') ? params.get('tab') : 'overview') as Tab;
    const [editing, setEditing] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const q = useQuery({ queryKey: ['events', 'detail', id], queryFn: () => api.get<EventDetailData>(`/api/events/${id}`), enabled: id > 0 });

    useRealtime({ eventId: id, enabled: id > 0 }, {
        'event:status': (p: { eventId: number }) => p.eventId === id && invalidate(['events', 'detail', id]),
        'photo:uploaded': (p: { eventId: number }) => p.eventId === id && invalidate(['events', 'detail', id]),
    });

    const transition = useMutation({
        mutationFn: (action: EventAction) => api.send('POST', `/api/events/${id}/${action}`),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['events'], ['galleries']);
        },
        onError: (e) => toast.error(e),
    });
    const removeStaff = useMutation({
        mutationFn: (assignmentId: number) => api.send('DELETE', `/api/events/${id}/staff/${assignmentId}`),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['events', 'detail', id]);
        },
        onError: (e) => toast.error(e),
    });
    const del = useMutation({
        mutationFn: () => api.send('DELETE', `/api/events/${id}`),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['events']);
            navigate('/admin/events');
        },
        onError: (e) => toast.error(e),
    });

    const runAction = async (a: (typeof EVENT_ACTIONS)[number]) => {
        if (a.confirm && !(await ask({ title: `${a.label}?`, message: a.confirm, confirmLabel: a.label, tone: a.tone === 'danger' ? 'danger' : 'primary' }))) return;
        transition.mutate(a.action);
    };

    return (
        <div>
            <QueryState query={q}>
                {(e) => {
                    const actions = can('events.manage') ? EVENT_ACTIONS.filter((a) => a.from.includes(e.status)) : [];
                    return (
                        <>
                            <PageHeader
                                back={
                                    <Link to="/admin/events" className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
                                        <ArrowLeft className="size-4" /> Events
                                    </Link>
                                }
                                title={
                                    <span className="flex items-center gap-3">
                                        {e.title} <StatusBadge status={e.status} />
                                    </span>
                                }
                                subtitle={`${e.event_code} · ${e.event_type} · ${date(e.event_date)}${e.start_time ? ` ${time(e.start_time)}` : ''}${e.venue ? ` · ${e.venue}` : ''}`}
                                actions={
                                    <>
                                        {actions.map((a) => (
                                            <Button key={a.action} variant={a.tone} loading={transition.isPending && transition.variables === a.action} onClick={() => runAction(a)}>
                                                {a.label}
                                            </Button>
                                        ))}
                                        {can('events.manage') && (
                                            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                                                Edit
                                            </Button>
                                        )}
                                    </>
                                }
                            />
                            <Tabs
                                className="mb-6"
                                value={tab}
                                onChange={(t) => setParams({ tab: t }, { replace: true })}
                                tabs={[
                                    { value: 'overview', label: 'Overview' },
                                    { value: 'selection', label: 'Customer selection' },
                                    { value: 'culling', label: 'AI culling' },
                                ]}
                            />
                            {tab === 'overview' && (
                                <div className="grid gap-6 xl:grid-cols-3">
                                    <div className="space-y-6 xl:col-span-2">
                                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                            <StatCard label="Photos" value={num(e.photo_total)} hint={Object.entries(e.photos).map(([s, n]) => `${titleCase(s)} ${n}`).join(' · ') || undefined} />
                                            <StatCard label="Gallery opens" value={num(e.access?.gallery_opens)} />
                                            <StatCard label="Photo views" value={num(e.access?.photo_views)} />
                                            <StatCard label="Revenue" value={money(e.revenue?.total ?? 0, true)} hint={`Orders ${money(e.revenue?.orders ?? 0, true)}`} />
                                        </div>
                                        <Card title="Details">
                                            <KeyValue
                                                items={[
                                                    ['Customer', <Link key="c" to={`/admin/customers?open=${e.customer_id}`} className="link">{e.customer_name}</Link>],
                                                    ['Contact', [e.customer_phone, e.customer_email].filter(Boolean).join(' · ')],
                                                    ['Booking', e.booking_id ? <Link key="b" to={`/admin/bookings?open=${e.booking_id}`} className="link">{e.booking_no}</Link> : 'Not linked'],
                                                    ['Package', e.package_name],
                                                    ['Payment', e.payment_status === 'N/A' ? '—' : `${titleCase(e.payment_status)} · ${money(e.paid_amount ?? 0)} of ${money(e.total_amount ?? 0)}`],
                                                    ['Time', e.start_time ? `${time(e.start_time)}${e.end_time ? ` – ${time(e.end_time)}` : ''}` : null],
                                                    ['Started', e.started_at ? dateTime(e.started_at) : null],
                                                    ['Completed', e.completed_at ? dateTime(e.completed_at) : null],
                                                ]}
                                            />
                                            {e.notes && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-sm">{e.notes}</p>}
                                        </Card>
                                        <Card
                                            title="Team"
                                            actions={
                                                can('staff.assign') && (
                                                    <Button size="sm" variant="secondary" icon={<UserPlus className="size-4" />} onClick={() => setAssigning(true)}>
                                                        Assign
                                                    </Button>
                                                )
                                            }
                                            padded={false}
                                        >
                                            {e.staff.length ? (
                                                <ul className="divide-y divide-stone-100">
                                                    {e.staff.map((s) => (
                                                        <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                                                            <div className="min-w-0">
                                                                <p className="font-medium">{s.name}</p>
                                                                <p className="text-xs text-stone-500">
                                                                    {titleCase(s.role)}
                                                                    {s.camera_label && ` · ${s.camera_label}`} · {s.phone ?? s.email}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <StatusBadge status={s.task_status} />
                                                                {can('staff.assign') && (
                                                                    <button
                                                                        type="button"
                                                                        className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                                                                        aria-label={`Remove ${s.name}`}
                                                                        onClick={async () => (await ask({ title: 'Remove from event?', message: `${s.name} will no longer see this event.`, confirmLabel: 'Remove' })) && removeStaff.mutate(s.id)}
                                                                    >
                                                                        <X className="size-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <EmptyState title="No one assigned yet" description="Assign photographers so they can upload from the app." />
                                            )}
                                        </Card>
                                    </div>
                                    <div className="space-y-6">
                                        <Card title="Gallery">
                                            {e.gallery ? (
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{e.gallery.title}</span>
                                                        <StatusBadge status={e.gallery.status} />
                                                    </div>
                                                    <p className="text-stone-600">
                                                        Watermark {e.gallery.watermark_enabled ? 'on' : 'off'} · downloads {e.gallery.allow_download ? 'allowed' : 'blocked'}
                                                        {e.gallery.expires_at && ` · expires ${date(e.gallery.expires_at)}`}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <ButtonLink to={`/admin/galleries/${e.gallery.id}`} size="sm" variant="secondary">
                                                            <QrCode className="size-4" /> Gallery & QR
                                                        </ButtonLink>
                                                        <ButtonLink to={`/admin/photos?eventId=${e.id}`} size="sm" variant="secondary">
                                                            <Images className="size-4" /> Manage photos
                                                        </ButtonLink>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-stone-500">No gallery.</p>
                                            )}
                                        </Card>
                                        {can('events.manage') && ['UPCOMING', 'CANCELLED'].includes(e.status) && (
                                            <Card title="Danger zone">
                                                <Button variant="danger" icon={<Trash2 className="size-4" />} loading={del.isPending} onClick={async () => (await ask({ title: 'Delete event?', message: 'Events with uploaded photos cannot be deleted.', confirmLabel: 'Delete event' })) && del.mutate()}>
                                                    Delete event
                                                </Button>
                                            </Card>
                                        )}
                                    </div>
                                </div>
                            )}
                            {tab === 'selection' && <SelectionTab eventId={id} />}
                            {tab === 'culling' && <CullingTab eventId={id} />}
                            <EventForm value={editing ? e : null} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />
                            <AssignStaffModal open={assigning} eventId={id} existing={e.staff} onClose={() => setAssigning(false)} />
                        </>
                    );
                }}
            </QueryState>
            {dialog}
        </div>
    );
}

function AssignStaffModal({ open, eventId, existing, onClose }: { open: boolean; eventId: number; existing: StaffRow[]; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [role, setRole] = useState<StaffRole>('PHOTOGRAPHER');
    const [userId, setUserId] = useState('');
    const [camera, setCamera] = useState('');
    const [error, setError] = useState('');
    const source = STAFF_ROLE_SOURCE[role];
    const users = useQuery({ queryKey: ['users', 'assignable', source ?? 'all'], queryFn: () => api.get<{ id: number; name: string; role: string }[]>('/api/users/assignable', { role: source }), enabled: open });
    const options = useMemo(() => {
        const seen = new Set<number>();
        return (users.data ?? []).filter((u) => !seen.has(u.id) && seen.add(u.id) && !existing.some((s) => s.user_id === u.id && s.role === role));
    }, [users.data, existing, role]);
    const save = useMutation({
        mutationFn: () => api.send('POST', `/api/events/${eventId}/staff`, { userId: Number(userId), role, cameraLabel: camera.trim() || null }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['events', 'detail', eventId]);
            setUserId('');
            setCamera('');
            onClose();
        },
        onError: (e) => toast.error(e),
    });
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Assign team member"
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={save.isPending} onClick={() => (userId ? save.mutate() : setError('Choose a person'))}>
                        Assign
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Select label="Role on this event" value={role} onChange={(e) => (setRole(e.target.value as StaffRole), setUserId(''))} options={STAFF_ROLES.map((r) => ({ value: r, label: titleCase(r) }))} />
                <Select
                    label="Person"
                    required
                    value={userId}
                    onChange={(e) => (setUserId(e.target.value), setError(''))}
                    placeholder={users.isLoading ? 'Loading…' : options.length ? 'Choose…' : 'No available staff for this role'}
                    options={options.map((u) => ({ value: u.id, label: u.name }))}
                    error={error}
                />
                {(role === 'PHOTOGRAPHER' || role === 'VIDEOGRAPHER') && <Input label="Camera label" value={camera} onChange={(e) => setCamera(e.target.value)} maxLength={40} placeholder="e.g. Cam A" hint="Shown on uploads so you can tell cameras apart." />}
            </div>
        </Modal>
    );
}

function SelectionTab({ eventId }: { eventId: number }) {
    const { can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const q = useQuery({ queryKey: ['selections', eventId], queryFn: () => api.get<SelectionData>(`/api/selections/event/${eventId}`) });
    const act = useMutation({
        mutationFn: ({ action, customerId }: { action: 'confirm' | 'reopen'; customerId: number }) => api.send('POST', `/api/selections/event/${eventId}/${action}`, { customerId }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['selections', eventId], ['events', 'detail', eventId]);
        },
        onError: (e) => toast.error(e),
    });
    return (
        <QueryState query={q} isEmpty={(d) => !d.submissions.length && !d.photos.length} empty={<EmptyState title="No selection yet" description="The customer selects photos for the album from their gallery." />}>
            {(d) => (
                <div className="space-y-6">
                    {d.submissions.map((s) => {
                        const photos = d.photos.filter((p) => p.customer_id === s.customer_id);
                        return (
                            <Card
                                key={s.id}
                                title={
                                    <span className="flex items-center gap-2 font-semibold">
                                        {s.customer_name} · {s.photo_count} photos <StatusBadge status={s.status} />
                                    </span>
                                }
                                actions={
                                    can('galleries.manage', 'photos.manage') && (
                                        <>
                                            {s.status === 'SUBMITTED' && (
                                                <Button size="sm" variant="success" loading={act.isPending} onClick={() => act.mutate({ action: 'confirm', customerId: s.customer_id })}>
                                                    Confirm selection
                                                </Button>
                                            )}
                                            {['SUBMITTED', 'CONFIRMED'].includes(s.status) && (
                                                <Button size="sm" variant="secondary" loading={act.isPending} onClick={() => act.mutate({ action: 'reopen', customerId: s.customer_id })}>
                                                    Reopen for changes
                                                </Button>
                                            )}
                                        </>
                                    )
                                }
                            >
                                {s.submitted_at && <p className="mb-2 text-xs text-stone-500">Submitted {dateTime(s.submitted_at)}</p>}
                                {s.note && <p className="mb-4 whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-sm">“{s.note}”</p>}
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                                    {photos.map((p) => (
                                        <div key={p.id} className="relative aspect-square overflow-hidden rounded bg-stone-100" title={p.file_name}>
                                            {p.thumb_url && <img src={p.thumb_url} alt="" loading="lazy" className="size-full object-cover" />}
                                            {p.comments > 0 && (
                                                <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded bg-black/60 px-1 text-[10px] text-white">
                                                    <MessageSquare className="size-3" /> {p.comments}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {s.status === 'CONFIRMED' && (
                                    <p className="mt-4 text-sm text-stone-600">
                                        Confirmed photos are marked Selected. Assign them to an editor from{' '}
                                        <Link to={`/admin/photos?eventId=${eventId}&selected=1`} className="link">
                                            Photos
                                        </Link>
                                        .
                                    </p>
                                )}
                            </Card>
                        );
                    })}
                    {d.comments.length > 0 && (
                        <Card title="Comments on photos" padded={false}>
                            <ul className="divide-y divide-stone-100">
                                {d.comments.map((c) => (
                                    <li key={c.id} className="px-4 py-3 text-sm sm:px-5">
                                        <p className="text-xs text-stone-500">
                                            {c.user_name}
                                            {c.is_staff ? ' (studio)' : ''} · photo #{c.photo_id} · {relative(c.created_at)}
                                        </p>
                                        <p className="mt-0.5 whitespace-pre-wrap">{c.body}</p>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>
            )}
        </QueryState>
    );
}

function CullingTab({ eventId }: { eventId: number }) {
    const q = useQuery({ queryKey: ['culling', eventId], queryFn: () => api.get<Culling>(`/api/photos/culling/${eventId}`) });
    const ai = useQuery({ queryKey: ['ai', 'status'], queryFn: () => api.get<{ cullingEnabled: boolean; faceSearchEnabled: boolean }>('/api/ai/status') });
    return (
        <QueryState query={q}>
            {(c) => (
                <div className="space-y-4">
                    {ai.data && !ai.data.cullingEnabled && <p className="text-sm text-amber-700">Automatic culling is turned off in Settings → AI. Counts below reflect photos analysed while it was on.</p>}
                    {ai.data && !ai.data.faceSearchEnabled && <p className="text-sm text-stone-500">Closed-eye detection and people categories need the face recognition provider configured.</p>}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {(
                            [
                                ['Analysed', c.analysed, null],
                                ['Possibly blurry', c.blurry, 'blurry'],
                                ['Near duplicates', c.duplicates, 'duplicate'],
                                ['Eyes closed', c.eyes_closed, 'eyes_closed'],
                            ] as const
                        ).map(([label, value, flag]) => (
                            <Link key={label} to={flag ? `/admin/photos?eventId=${eventId}&flag=${flag}` : `/admin/photos?eventId=${eventId}`} className="block">
                                <StatCard label={label} value={num(value ?? 0)} tone={flag ? 'rose' : 'stone'} />
                            </Link>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {(
                            [
                                ['Couple', c.couple, 'COUPLE'],
                                ['Family', c.family, 'FAMILY'],
                                ['Group', c.group, 'GROUP'],
                                ['Single', c.single, 'SINGLE'],
                            ] as const
                        ).map(([label, value, cat]) => (
                            <Link key={label} to={`/admin/photos?eventId=${eventId}&category=${cat}`} className="block">
                                <StatCard label={label} value={num(value ?? 0)} tone="violet" />
                            </Link>
                        ))}
                    </div>
                    <p className="text-xs text-stone-500">Flags are suggestions from automatic analysis. Review before rejecting photos.</p>
                </div>
            )}
        </QueryState>
    );
}
