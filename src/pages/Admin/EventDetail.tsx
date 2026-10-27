// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, CalendarDays, Camera, Clock3, Copy, ExternalLink, Eye, Images, IndianRupee, Link2, MapPin, MessageSquare, Package, Pencil, Phone, QrCode, Trash2, Upload, UserPlus, UserRound, Wrench, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { EmptyState, QueryState, StatCard, StatusBadge } from '../../components/ui/Data';
import { Avatar } from '../../components/staff/staffCommon';
import { EventForm, type EventFormValue } from '../../components/event/EventForm';
import { OfflinePaymentModal } from '../../components/payment/OfflinePaymentModal';
import { Input, Select } from '../../components/ui/Form';
import { Modal, useConfirm } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toast';
import { Button, ButtonLink, Card } from '../../components/ui';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { EVENT_ACTIONS, STAFF_ROLE_SOURCE, STAFF_ROLES, type EventAction, type StaffRole } from '../../helpers/event/events';
import { date, dateTime, money, num, relative, time, titleCase } from '../../utils/format';
import { useInvalidate } from '../../hooks';
import { useRealtime } from '../../services/socket';
import type { EventStatus } from '../../types';
import './EventDetail.scss';

interface StaffRow {
    id: number;
    user_id: number;
    name: string;
    email: string | null;
    phone: string | null;
    role: StaffRole;
    camera_label: string | null;
    task_status: string;
    pay_basis?: string;
    share_pct?: number | null;
    commission_pct?: number | null;
    day_rate_override?: number | null;
    flat_amount?: number | null;
    payout_status?: string;
}
interface AssetRow {
    assignment_id: number;
    id: number;
    asset_code: string;
    name: string;
    category: string;
    status: string;
    asset_condition: string;
    assigned_at: string;
    notes: string | null;
    staff_name: string | null;
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
    assets: AssetRow[];
    gallery: { id: number; title: string; status: string; watermark_enabled: number; allow_download: number; photo_price: number | null; expires_at: string | null } | null;
    cover_url?: string | null;
    public_url?: string | null;
    qr_token?: string | null;
    qr_data_url?: string | null;
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
    const [assigningAsset, setAssigningAsset] = useState(false);
    const [paying, setPaying] = useState(false);
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
                    const customerLink = e.qr_token ? `${window.location.origin}/g/${e.qr_token}` : e.public_url;
                    return (
                        <>
                            <section className="mb-4 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[var(--soft-shadow)]">
                                {e.cover_url && (
                                    <div className="relative h-44 w-full overflow-hidden bg-stone-900 sm:h-52">
                                        <img src={e.cover_url} alt={e.title} className="h-full w-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/85 via-stone-900/25 to-transparent" />
                                        {customerLink && (
                                            <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                                <a
                                                    href={customerLink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-stone-900 shadow-md backdrop-blur transition-all hover:bg-white hover:scale-105"
                                                >
                                                    <ExternalLink className="size-3.5 text-rose-500" />
                                                    Customer View
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
                                    <div className="min-w-0">
                                        <Link to="/admin/events" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
                                            <ArrowLeft className="size-4" /> Events
                                        </Link>
                                        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold text-stone-900">
                                            {e.title}
                                            <StatusBadge status={e.status} />
                                        </h1>
                                        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-500">
                                            <span className="font-medium text-stone-700">{e.event_code}</span>
                                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">{e.event_type}</span>
                                            <span className="inline-flex items-center gap-1">
                                                <CalendarDays className="size-3.5 text-sky-500" />
                                                {date(e.event_date)}
                                                {e.start_time ? ` · ${time(e.start_time)}` : ''}
                                            </span>
                                            {e.venue && (
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin className="size-3.5 text-rose-500" />
                                                    {e.venue}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
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
                                        {(can('photos.manage') || can('events.manage')) && (
                                            <ButtonLink to={`/admin/events/${e.id}/upload`} variant="secondary">
                                                <Upload className="size-4" /> Upload images
                                            </ButtonLink>
                                        )}
                                        {customerLink && (
                                            <>
                                                <Button
                                                    variant="secondary"
                                                    icon={<Copy className="size-4" />}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(customerLink);
                                                        toast.success('Customer gallery link copied!');
                                                    }}
                                                >
                                                    Copy Link
                                                </Button>
                                                <a
                                                    href={customerLink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
                                                >
                                                    <ExternalLink className="size-4 text-rose-500" />
                                                    Open Gallery
                                                </a>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1.5 overflow-x-auto border-t border-stone-100 px-4 py-2.5 sm:px-5" role="tablist">
                                    {(
                                        [
                                            { value: 'overview', label: 'Overview' },
                                            { value: 'selection', label: 'Customer selection' },
                                            { value: 'culling', label: 'AI culling' },
                                        ] as const
                                    ).map((t) => (
                                        <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} onClick={() => setParams({ tab: t.value }, { replace: true })} className={clsx('rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors', tab === t.value ? 'bg-ink-900 text-accent-300' : 'bg-stone-100 text-stone-600 hover:bg-stone-200')}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </section>
                            {tab === 'overview' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                        <Kpi tone="from-sky-500 to-cyan-600" icon={<Camera className="size-4" />} label="Photos" value={num(e.photo_total)} hint={Object.entries(e.photos).map(([s, n]) => `${titleCase(s)} ${n}`).join(' · ') || 'None uploaded'} />
                                        <Kpi tone="from-violet-500 to-fuchsia-600" icon={<QrCode className="size-4" />} label="Gallery opens" value={num(e.access?.gallery_opens)} />
                                        <Kpi tone="from-amber-400 to-orange-500" icon={<Eye className="size-4" />} label="Photo views" value={num(e.access?.photo_views)} />
                                        <Kpi tone="from-emerald-500 to-teal-600" icon={<IndianRupee className="size-4" />} label="Revenue" value={money(e.revenue?.total ?? 0, true)} hint={`Orders ${money(e.revenue?.orders ?? 0, true)}`} />
                                    </div>
                                    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.85fr)]">
                                    <div className="space-y-4">
                                        <Card title="Details">
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <Fact icon={<UserRound className="size-4" />} tone="bg-sky-50 text-sky-600" label="Customer" value={<Link to={`/admin/customers?open=${e.customer_id}`} className="font-semibold text-sky-700 hover:underline">{e.customer_name}</Link>} />
                                                <Fact icon={<Phone className="size-4" />} tone="bg-emerald-50 text-emerald-600" label="Contact" value={[e.customer_phone, e.customer_email].filter(Boolean).join(' · ') || '—'} />
                                                <Fact icon={<CalendarDays className="size-4" />} tone="bg-violet-50 text-violet-600" label="Booking" value={e.booking_id ? <Link to={`/admin/bookings?open=${e.booking_id}`} className="font-semibold text-violet-700 hover:underline">{e.booking_no}</Link> : 'Not linked'} />
                                                <Fact icon={<Package className="size-4" />} tone="bg-amber-50 text-amber-600" label="Package" value={e.package_name || '—'} />
                                                <Fact icon={<IndianRupee className="size-4" />} tone="bg-rose-50 text-rose-600" label="Payment" value={e.payment_status === 'N/A' ? '—' : <><StatusBadge status={e.payment_status} /> <span className="mt-0.5 block">{money(e.paid_amount ?? 0)} of {money(e.total_amount ?? 0)}</span></>} />
                                                <Fact icon={<Clock3 className="size-4" />} tone="bg-stone-100 text-stone-600" label="Time" value={e.start_time ? `${time(e.start_time)}${e.end_time ? ` – ${time(e.end_time)}` : ''}` : '—'} />
                                                <Fact icon={<Clock3 className="size-4" />} tone="bg-sky-50 text-sky-600" label="Started" value={e.started_at ? dateTime(e.started_at) : '—'} />
                                                <Fact icon={<Clock3 className="size-4" />} tone="bg-emerald-50 text-emerald-600" label="Completed" value={e.completed_at ? dateTime(e.completed_at) : '—'} />
                                            </div>
                                            {e.notes && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{e.notes}</p>}
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
                                        >
                                            {e.staff.length ? (
                                                <ul className="grid gap-2 sm:grid-cols-2">
                                                    {e.staff.map((s) => (
                                                        <li key={s.id} className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-stone-50/50 p-3">
                                                            <Avatar name={s.name} className="size-10 text-xs" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate font-semibold text-stone-900">{s.name}</p>
                                                                <p className="truncate text-xs text-stone-500">
                                                                    {titleCase(s.role)}
                                                                    {s.camera_label && ` · ${s.camera_label}`}
                                                                    {s.pay_basis && s.pay_basis !== 'NONE' && (
                                                                        <>
                                                                            {' · '}
                                                                            {titleCase(s.pay_basis)}
                                                                            {s.pay_basis === 'SHARE' && s.share_pct != null ? ` ${s.share_pct}%` : ''}
                                                                            {s.pay_basis === 'COMMISSION' && s.commission_pct != null ? ` ${s.commission_pct}%` : ''}
                                                                        </>
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <StatusBadge status={s.task_status} />
                                                            {can('staff.assign') && (
                                                                <button type="button" className="rounded-lg p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${s.name}`} onClick={async () => (await ask({ title: 'Remove from event?', message: `${s.name} will no longer see this event.`, confirmLabel: 'Remove' })) && removeStaff.mutate(s.id)}>
                                                                    <X className="size-4" />
                                                                </button>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <EmptyState title="No one assigned yet" description="Assign photographers so they can upload from the app." />
                                            )}
                                        </Card>
                                        <Card
                                            title="Assets allocated"
                                            actions={
                                                can('events.manage') && (
                                                    <Button size="sm" variant="secondary" icon={<Wrench className="size-4" />} onClick={() => setAssigningAsset(true)}>
                                                        Allocate
                                                    </Button>
                                                )
                                            }
                                        >
                                            {(e.assets ?? []).length ? (
                                                <ul className="grid gap-2 sm:grid-cols-2">
                                                    {(e.assets ?? []).map((a) => (
                                                        <li key={a.assignment_id} className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-stone-50/50 p-3">
                                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                                                                <Camera className="size-4" />
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate font-semibold text-stone-900">{a.name}</p>
                                                                <p className="truncate text-xs text-stone-500">
                                                                    {a.asset_code} · {titleCase(a.category)}
                                                                    {a.staff_name ? ` · ${a.staff_name}` : ''}
                                                                </p>
                                                            </div>
                                                            {can('events.manage') && (
                                                                <button
                                                                    type="button"
                                                                    className="rounded-lg px-2 py-1 text-xs font-semibold text-stone-500 hover:bg-emerald-50 hover:text-emerald-700"
                                                                    onClick={async () => {
                                                                        if (!(await ask({ title: 'Return asset?', message: `${a.name} will be marked available again.`, confirmLabel: 'Return' }))) return;
                                                                        try {
                                                                            await api.send('POST', `/api/assets/${a.id}/return`, { condition: a.asset_condition || 'GOOD', notes: null });
                                                                            toast.success('Asset returned');
                                                                            await invalidate(['events', 'detail', id], ['assets']);
                                                                        } catch (err) {
                                                                            toast.error(err);
                                                                        }
                                                                    }}
                                                                >
                                                                    Return
                                                                </button>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <EmptyState title="No assets allocated" description="Allocate cameras, lenses and kit from studio equipment." />
                                            )}
                                        </Card>
                                    </div>
                                    <div className="space-y-4">
                                        <Card
                                            title="Payment"
                                            actions={
                                                e.booking_id && can('payments.manage') && Number(e.total_amount ?? 0) - Number(e.paid_amount ?? 0) > 0 ? (
                                                    <Button size="sm" onClick={() => setPaying(true)}>
                                                        Record payment
                                                    </Button>
                                                ) : undefined
                                            }
                                        >
                                            {e.booking_id ? (
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-stone-500">Status</span>
                                                        <StatusBadge status={e.payment_status} />
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-stone-500">Paid</span>
                                                        <span className="font-semibold text-stone-900">
                                                            {money(e.paid_amount ?? 0)} / {money(e.total_amount ?? 0)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-stone-500">Due</span>
                                                        <span className="font-semibold text-rose-700">{money(Math.max(0, Number(e.total_amount ?? 0) - Number(e.paid_amount ?? 0)))}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        <ButtonLink to={`/admin/bookings?open=${e.booking_id}`} size="sm" variant="secondary">
                                                            Open booking
                                                        </ButtonLink>
                                                        <ButtonLink to="/admin/payments" size="sm" variant="secondary">
                                                            Payments ledger
                                                        </ButtonLink>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="rounded-xl border-2 border-dashed border-stone-200 px-4 py-6 text-center text-xs text-stone-500">Link a booking to collect advance or balance payments for this event.</p>
                                            )}
                                        </Card>
                                        <Card title="Customer Gallery Link">
                                            {customerLink ? (
                                                <div className="space-y-3 text-sm">
                                                    <p className="text-xs text-stone-500">
                                                        Direct public link created for customer and guests. Opening this link displays the cover photo and opens event photos for viewing and selection.
                                                    </p>
                                                    <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2">
                                                        <Link2 className="size-4 shrink-0 text-stone-400" />
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={customerLink}
                                                            className="w-full bg-transparent font-mono text-xs text-stone-800 outline-none select-all"
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            icon={<Copy className="size-3.5" />}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(customerLink);
                                                                toast.success('Gallery link copied to clipboard!');
                                                            }}
                                                        >
                                                            Copy
                                                        </Button>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                                        <a
                                                            href={customerLink}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rose-700"
                                                        >
                                                            <ExternalLink className="size-3.5" />
                                                            Open Customer Gallery
                                                        </a>
                                                        {e.gallery && (
                                                            <ButtonLink to={`/admin/galleries/${e.gallery.id}`} size="sm" variant="secondary">
                                                                <QrCode className="size-4" /> QR Code & Passcode
                                                            </ButtonLink>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="rounded-xl border-2 border-dashed border-stone-200 px-4 py-6 text-center text-xs text-stone-500">
                                                    Customer link is generated upon event creation.
                                                </p>
                                            )}
                                        </Card>
                                        <Card title="Gallery">
                                            {e.gallery ? (
                                                <div className="space-y-3 text-sm">
                                                    {e.cover_url && <img src={e.cover_url} alt="" className="h-36 w-full rounded-xl object-cover" />}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="font-semibold text-stone-900">{e.gallery.title}</span>
                                                        <StatusBadge status={e.gallery.status} />
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold', e.gallery.watermark_enabled ? 'bg-sky-50 text-sky-700' : 'bg-stone-100 text-stone-500')}>Watermark {e.gallery.watermark_enabled ? 'on' : 'off'}</span>
                                                        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold', e.gallery.allow_download ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>Downloads {e.gallery.allow_download ? 'allowed' : 'blocked'}</span>
                                                        {e.gallery.expires_at && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Expires {date(e.gallery.expires_at)}</span>}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <ButtonLink to={`/admin/galleries/${e.gallery.id}`} size="sm" variant="secondary">
                                                            <QrCode className="size-4" /> Gallery & QR
                                                        </ButtonLink>
                                                        <ButtonLink to={`/admin/events/${e.id}/upload`} size="sm" variant="secondary">
                                                            <Upload className="size-4" /> Upload images
                                                        </ButtonLink>
                                                        <ButtonLink to={`/admin/photos?eventId=${e.id}`} size="sm" variant="secondary">
                                                            <Images className="size-4" /> Manage photos
                                                        </ButtonLink>
                                                        {can('events.manage') && (
                                                            <label className="inline-flex cursor-pointer items-center rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700">
                                                                Cover image
                                                                <input
                                                                    type="file"
                                                                    accept="image/jpeg,image/png,image/webp"
                                                                    className="hidden"
                                                                    onChange={async (ev) => {
                                                                        const file = ev.target.files?.[0];
                                                                        ev.target.value = '';
                                                                        if (!file) return;
                                                                        const body = new FormData();
                                                                        body.append('cover', file);
                                                                        try {
                                                                            await api.send('POST', `/api/events/${e.id}/cover`, body);
                                                                            toast.success('Cover image saved');
                                                                            await invalidate(['events', 'detail', id]);
                                                                        } catch (err) {
                                                                            toast.error(err);
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="rounded-xl border-2 border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500">No gallery yet.</p>
                                            )}
                                        </Card>
                                        {can('events.manage') && ['UPCOMING', 'CANCELLED'].includes(e.status) && (
                                            <Card title="Danger zone">
                                                <p className="mb-3 text-sm text-stone-500">Events with uploaded photos cannot be deleted.</p>
                                                <Button variant="danger" icon={<Trash2 className="size-4" />} loading={del.isPending} onClick={async () => (await ask({ title: 'Delete event?', message: 'Events with uploaded photos cannot be deleted.', confirmLabel: 'Delete event' })) && del.mutate()}>
                                                    Delete event
                                                </Button>
                                            </Card>
                                        )}
                                    </div>
                                    </div>
                                </div>
                            )}
                            {tab === 'selection' && <SelectionTab eventId={id} />}
                            {tab === 'culling' && <CullingTab eventId={id} />}
                            <EventForm value={editing ? e : null} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />
                            <AssignStaffModal open={assigning} eventId={id} existing={e.staff} onClose={() => setAssigning(false)} />
                            <AssignAssetModal open={assigningAsset} eventId={id} onClose={() => setAssigningAsset(false)} />
                            <OfflinePaymentModal
                                target={paying && e.booking_id ? { bookingId: e.booking_id } : null}
                                due={Math.max(0, Number(e.total_amount ?? 0) - Number(e.paid_amount ?? 0))}
                                onClose={() => setPaying(false)}
                                onSaved={() => {
                                    setPaying(false);
                                    invalidate(['events', 'detail', id], ['payments'], ['bookings']);
                                }}
                            />
                        </>
                    );
                }}
            </QueryState>
            {dialog}
        </div>
    );
}

function Kpi({ tone, icon, label, value, hint }: { tone: string; icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
    return (
        <div className={clsx('relative overflow-hidden rounded-2xl bg-gradient-to-br p-3.5 text-white shadow-lg', tone)}>
            <span className="pointer-events-none absolute -right-5 -top-5 size-16 rounded-full bg-white/15" />
            <div className="relative flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{label}</p>
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/20">{icon}</span>
            </div>
            <p className="relative mt-1 truncate text-2xl font-bold">{value}</p>
            {hint && <p className="relative mt-0.5 line-clamp-1 text-xs text-white/75">{hint}</p>}
        </div>
    );
}

function Fact({ icon, tone, label, value }: { icon: ReactNode; tone: string; label: string; value: ReactNode }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-white p-3">
            <span className={clsx('flex size-9 shrink-0 items-center justify-center rounded-lg', tone)}>{icon}</span>
            <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</span>
                <span className="block text-sm text-stone-800">{value}</span>
            </span>
        </div>
    );
}

function AssignStaffModal({ open, eventId, existing, onClose }: { open: boolean; eventId: number; existing: StaffRow[]; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [role, setRole] = useState<StaffRole>('PHOTOGRAPHER');
    const [userId, setUserId] = useState('');
    const [camera, setCamera] = useState('');
    const [payBasis, setPayBasis] = useState('DAY_RATE');
    const [sharePct, setSharePct] = useState('');
    const [commissionPct, setCommissionPct] = useState('');
    const [flatAmount, setFlatAmount] = useState('');
    const [error, setError] = useState('');
    const source = STAFF_ROLE_SOURCE[role];
    const users = useQuery({ queryKey: ['users', 'assignable', source ?? 'all'], queryFn: () => api.get<{ id: number; name: string; role: string }[]>('/api/users/assignable', { role: source }), enabled: open });
    const options = useMemo(() => {
        const seen = new Set<number>();
        return (users.data ?? []).filter((u) => !seen.has(u.id) && seen.add(u.id) && !existing.some((s) => s.user_id === u.id && s.role === role));
    }, [users.data, existing, role]);
    const save = useMutation({
        mutationFn: () =>
            api.send('POST', `/api/events/${eventId}/staff`, {
                userId: Number(userId),
                role,
                cameraLabel: camera.trim() || null,
                payBasis,
                sharePct: sharePct === '' ? null : Number(sharePct),
                commissionPct: commissionPct === '' ? null : Number(commissionPct),
                flatAmount: flatAmount === '' ? null : Math.round(Number(flatAmount) * 100),
            }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['events', 'detail', eventId], ['payroll']);
            setUserId('');
            setCamera('');
            setPayBasis('DAY_RATE');
            setSharePct('');
            setCommissionPct('');
            setFlatAmount('');
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
                <Select
                    label="How this member is paid"
                    value={payBasis}
                    onChange={(e) => setPayBasis(e.target.value)}
                    options={[
                        { value: 'DAY_RATE', label: 'Day rate' },
                        { value: 'SHARE', label: 'Revenue share %' },
                        { value: 'COMMISSION', label: 'Commission %' },
                        { value: 'FLAT', label: 'Flat amount' },
                        { value: 'NONE', label: 'No payout' },
                    ]}
                    hint="Used in Payroll → Event member shares and End of month."
                />
                {payBasis === 'SHARE' && <Input label="Share of booking paid (%)" type="number" min={0} max={100} step="0.01" value={sharePct} onChange={(e) => setSharePct(e.target.value)} />}
                {payBasis === 'COMMISSION' && <Input label="Commission (%)" type="number" min={0} max={100} step="0.01" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} />}
                {payBasis === 'FLAT' && <Input label="Flat amount (₹)" type="number" min={0} step="0.01" value={flatAmount} onChange={(e) => setFlatAmount(e.target.value)} />}
            </div>
        </Modal>
    );
}

function AssignAssetModal({ open, eventId, onClose }: { open: boolean; eventId: number; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [assetId, setAssetId] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const available = useQuery({
        queryKey: ['assets', 'AVAILABLE'],
        queryFn: () => api.get<{ id: number; asset_code: string; name: string; category: string }[]>('/api/assets', { status: 'AVAILABLE' }),
        enabled: open,
    });
    const save = useMutation({
        mutationFn: () => api.send('POST', `/api/assets/${assetId}/assign`, { eventId, notes: notes.trim() || null }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['events', 'detail', eventId], ['assets']);
            setAssetId('');
            setNotes('');
            onClose();
        },
        onError: (e) => toast.error(e),
    });
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Allocate asset"
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={save.isPending} onClick={() => (assetId ? save.mutate() : setError('Choose an asset'))}>
                        Allocate
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Select
                    label="Available equipment"
                    required
                    value={assetId}
                    onChange={(e) => (setAssetId(e.target.value), setError(''))}
                    placeholder={available.isLoading ? 'Loading…' : (available.data?.length ?? 0) ? 'Choose…' : 'No available assets'}
                    options={(available.data ?? []).map((a) => ({ value: a.id, label: `${a.asset_code} · ${a.name}` }))}
                    error={error}
                />
                <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="Optional" />
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
                    {ai.data && !ai.data.cullingEnabled && <p className="text-sm text-brand-700">Automatic culling is turned off in Settings → AI. Counts below reflect photos analysed while it was on.</p>}
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
