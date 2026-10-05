import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, type Paged } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dateTime, money, relative, titleCase } from '../lib/format';
import { useInvalidate, useListParams, useOpenParam } from '../lib/hooks';
import { formatAddress, type Address } from '../lib/types';
import { DataTable, EmptyState, Pagination, QueryState, SearchInput, StatusBadge } from './data';
import { FormGrid, Input, Select, Textarea } from './form';
import { OrderManageDrawer } from './OrderManageDrawer';
import { Modal } from './overlay';
import { useToast } from './toast';
import { Button, Card, IconButton, KeyValue, PageHeader, Tabs } from './ui';

export const PRINT_STATUSES = ['QUEUED', 'PRINTING', 'PRINTED', 'READY', 'CANCELLED'] as const;
type PrintStatus = (typeof PRINT_STATUSES)[number];
const PRINT_FLOW: Record<PrintStatus, PrintStatus[]> = {
    QUEUED: ['PRINTING', 'CANCELLED'],
    PRINTING: ['PRINTED', 'QUEUED', 'CANCELLED'],
    PRINTED: ['READY', 'PRINTING'],
    READY: [],
    CANCELLED: ['QUEUED'],
};
const PRINT_ACTION: Record<PrintStatus, string> = { QUEUED: 'Back to queue', PRINTING: 'Start printing', PRINTED: 'Printed', READY: 'Quality checked — ready', CANCELLED: 'Cancel' };

export const DELIVERY_STATUSES = ['PENDING', 'READY', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'] as const;
type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
const DELIVERY_FLOW: Record<DeliveryStatus, DeliveryStatus[]> = {
    PENDING: ['READY'],
    READY: ['DISPATCHED', 'DELIVERED', 'FAILED'],
    DISPATCHED: ['IN_TRANSIT', 'DELIVERED', 'FAILED'],
    IN_TRANSIT: ['DELIVERED', 'FAILED'],
    DELIVERED: [],
    FAILED: ['READY', 'DISPATCHED'],
};

interface PrintJobRow {
    id: number;
    order_id: number;
    kind: 'PRINT' | 'FRAME' | 'CANVAS' | 'ALBUM';
    size: string | null;
    quantity: number;
    status: PrintStatus;
    notes: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    order_no: string;
    delivery_method: string;
    customer_name: string;
    customer_phone: string | null;
    file_name: string | null;
    thumb_url: string | null;
    assigned_name: string | null;
    assigned_to: number | null;
}
interface DeliveryRow {
    id: number;
    order_id: number;
    method: 'PICKUP' | 'COURIER' | 'HAND_DELIVERY';
    address: Address | string | null;
    status: DeliveryStatus;
    courier: string | null;
    tracking_no: string | null;
    assigned_to: number | null;
    notes: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
    order_no: string;
    order_type: string;
    order_status: string;
    total: number;
    customer_name: string;
    customer_phone: string | null;
    assigned_name: string | null;
    item_count: number;
}
type WithCounts<T> = Paged<T> & { counts: Record<string, number> };

/** People a job can be assigned to: managers pick any production staff, others can only take it themselves. */
function useAssignees(enabled: boolean) {
    const { user, can } = useAuth();
    const canAssign = can('staff.assign', 'events.manage');
    const q = useQuery({ queryKey: ['users', 'assignable', 'PRINTER_DELIVERY_STAFF'], queryFn: () => api.get<{ id: number; name: string }[]>('/api/users/assignable', { role: 'PRINTER_DELIVERY_STAFF' }), enabled: enabled && canAssign });
    return useMemo(() => {
        const list = canAssign ? (q.data ?? []) : [];
        const seen = new Set<number>();
        const out = list.filter((u) => !seen.has(u.id) && seen.add(u.id));
        if (user && !out.some((u) => u.id === user.id)) out.unshift({ id: user.id, name: `${user.name} (me)` });
        return out;
    }, [canAssign, q.data, user]);
}

export function PrintQueue({ base, title, subtitle }: { base: 'admin' | 'delivery'; title: string; subtitle: string }) {
    const { user, can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { page, search, filters, setPage, setSearch, setFilter, set } = useListParams(['status', 'kind', 'mine'] as const);
    const [orderId, setOrderId] = useOpenParam('order');
    const [editing, setEditing] = useState<PrintJobRow | null>(null);
    const q = useQuery({
        queryKey: ['printing', page, search, filters],
        queryFn: () => api.get<WithCounts<PrintJobRow>>('/api/printing', { page, pageSize: 25, search, status: filters.status, kind: filters.kind, mine: filters.mine ? 'true' : undefined }),
        placeholderData: (p) => p,
    });
    const update = useMutation({
        mutationFn: ({ id, ...body }: { id: number; status?: PrintStatus; assignedTo?: number | null }) => api.send('PUT', `/api/printing/${id}`, body),
        onSuccess: (r) => (toast.success(r.message), invalidate(['printing'], ['orders'], ['delivery'])),
        onError: (e) => toast.error(e),
    });
    const files = useMutation({
        mutationFn: (id: number) => api.get<{ name: string; url: string }[]>(`/api/printing/${id}/files`),
        onSuccess: (list) => {
            if (!list.length) return toast.error('No print file is attached to this job.');
            list.forEach((f, i) =>
                setTimeout(() => {
                    const a = document.createElement('a');
                    a.href = f.url;
                    a.rel = 'noopener';
                    a.download = f.name;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                }, i * 400),
            );
        },
        onError: (e) => toast.error(e),
    });
    const counts = q.data?.counts ?? {};
    const active = (counts.QUEUED ?? 0) + (counts.PRINTING ?? 0) + (counts.PRINTED ?? 0);
    return (
        <div>
            <PageHeader title={title} subtitle={subtitle} />
            <Tabs
                className="mb-4"
                value={filters.status || 'ACTIVE'}
                onChange={(s) => setFilter('status', s === 'ACTIVE' ? '' : s)}
                tabs={[{ value: 'ACTIVE', label: 'In production', count: active }, ...PRINT_STATUSES.map((s) => ({ value: s, label: titleCase(s), count: counts[s] ?? 0 }))]}
            />
            <Card padded={false}>
                <div className="flex flex-wrap items-center gap-3 border-b border-stone-100 p-4">
                    <SearchInput value={search} onChange={setSearch} placeholder="Order no. or customer" className="w-full max-w-xs" />
                    <Select wrapperClassName="w-40" aria-label="Kind" value={filters.kind} onChange={(e) => setFilter('kind', e.target.value)} placeholder="All kinds" options={['PRINT', 'FRAME', 'CANVAS', 'ALBUM'].map((k) => ({ value: k, label: titleCase(k) }))} />
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="size-4 rounded border-stone-300" checked={filters.mine === '1'} onChange={(e) => set({ mine: e.target.checked ? '1' : null })} />
                        Assigned to me
                    </label>
                </div>
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                empty={<EmptyState title="Nothing in this queue" description="Paid print, frame, canvas and album orders appear here." />}
                                columns={[
                                    {
                                        key: 'job',
                                        header: 'Job',
                                        cell: (r) => (
                                            <div className="flex items-center gap-3">
                                                <div className="size-12 shrink-0 overflow-hidden rounded bg-stone-100">{r.thumb_url && <img src={r.thumb_url} alt="" loading="lazy" className="size-full object-cover" />}</div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-stone-900">
                                                        {titleCase(r.kind)} {r.size ?? ''} × {r.quantity}
                                                    </p>
                                                    <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => setOrderId(r.order_id)}>
                                                        {r.order_no}
                                                    </button>
                                                    {r.notes && <p className="line-clamp-1 text-xs text-amber-700">{r.notes}</p>}
                                                </div>
                                            </div>
                                        ),
                                    },
                                    { key: 'customer', header: 'Customer', cell: (r) => <span>{r.customer_name}<span className="block text-xs text-stone-500">{titleCase(r.delivery_method)}</span></span>, hideOnMobile: true },
                                    { key: 'assigned', header: 'Assigned', cell: (r) => r.assigned_name ?? (r.status !== 'READY' && r.status !== 'CANCELLED' && user ? <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: r.id, assignedTo: user.id })}>Take</Button> : '—'), hideOnMobile: true },
                                    { key: 'age', header: 'Queued', cell: (r) => relative(r.created_at), hideOnMobile: true },
                                    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                    {
                                        key: 'act',
                                        header: '',
                                        cell: (r) => (
                                            <div className="flex items-center justify-end gap-1">
                                                {PRINT_FLOW[r.status]
                                                    .filter((s) => s !== 'CANCELLED' && !(r.status === 'PRINTING' && s === 'QUEUED') && !(r.status === 'PRINTED' && s === 'PRINTING'))
                                                    .map((s) => (
                                                        <Button key={s} size="sm" variant={s === 'READY' ? 'success' : 'secondary'} loading={update.isPending && update.variables?.id === r.id && update.variables.status === s} onClick={() => update.mutate({ id: r.id, status: s })}>
                                                            {PRINT_ACTION[s]}
                                                        </Button>
                                                    ))}
                                                <IconButton label="Download print files" icon={<Download className="size-4" />} disabled={files.isPending} onClick={() => files.mutate(r.id)} />
                                                <IconButton label="Edit job" icon={<Pencil className="size-4" />} onClick={() => setEditing(r)} />
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
            <PrintJobModal job={editing} canCancel={can('orders.manage')} onClose={() => setEditing(null)} />
            <OrderManageDrawer id={orderId} onClose={() => setOrderId(null)} links={base} />
        </div>
    );
}

function PrintJobModal({ job, canCancel, onClose }: { job: PrintJobRow | null; canCancel: boolean; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const assignees = useAssignees(!!job);
    const [status, setStatus] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [notes, setNotes] = useState('');
    useEffect(() => {
        if (job) (setStatus(job.status), setAssignedTo(job.assigned_to ? String(job.assigned_to) : ''), setNotes(job.notes ?? ''));
    }, [job]);
    const save = useMutation({
        mutationFn: () => api.send('PUT', `/api/printing/${job!.id}`, { status: status !== job!.status ? status : undefined, assignedTo: assignedTo ? Number(assignedTo) : null, notes }),
        onSuccess: (r) => (toast.success(r.message), invalidate(['printing'], ['orders'], ['delivery']), onClose()),
        onError: (e) => toast.error(e),
    });
    const statusOptions = job ? [job.status, ...PRINT_FLOW[job.status].filter((s) => s !== 'CANCELLED' || canCancel)] : [];
    const assigneeOptions = useMemo(() => {
        const list = assignees.map((u) => ({ value: u.id, label: u.name }));
        if (job?.assigned_to && !list.some((o) => o.value === job.assigned_to)) list.push({ value: job.assigned_to, label: job.assigned_name ?? `User #${job.assigned_to}` });
        return list;
    }, [assignees, job]);
    return (
        <Modal
            open={!!job}
            onClose={onClose}
            title={job ? `${titleCase(job.kind)} job · ${job.order_no}` : ''}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={save.isPending} onClick={() => (notes.length > 255 ? toast.error('Notes: 255 characters maximum') : save.mutate())}>
                        Save
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions.map((s) => ({ value: s, label: titleCase(s) }))} />
                <Select label="Assigned to" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Unassigned" options={assigneeOptions} />
                <Textarea label="Notes" rows={3} maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)} hint="Paper, finish, packaging or quality notes." />
            </div>
        </Modal>
    );
}

export function DeliveryBoard({ base, title, subtitle }: { base: 'admin' | 'delivery'; title: string; subtitle: string }) {
    const { can } = useAuth();
    const { page, search, filters, setPage, setSearch, setFilter, set } = useListParams(['status', 'method', 'mine'] as const);
    const [openId, setOpenId] = useOpenParam();
    const [orderId, setOrderId] = useOpenParam('order');
    const q = useQuery({
        queryKey: ['delivery', page, search, filters],
        queryFn: () => api.get<WithCounts<DeliveryRow>>('/api/delivery', { page, pageSize: 25, search, status: filters.status, method: filters.method, mine: filters.mine ? 'true' : undefined }),
        placeholderData: (p) => p,
    });
    const counts = q.data?.counts ?? {};
    const open = q.data?.items.find((d) => d.id === openId) ?? null;
    return (
        <div>
            <PageHeader title={title} subtitle={subtitle} />
            <Tabs
                className="mb-4"
                value={filters.status || 'ALL'}
                onChange={(s) => setFilter('status', s === 'ALL' ? '' : s)}
                tabs={[{ value: 'ALL', label: 'All' }, ...DELIVERY_STATUSES.map((s) => ({ value: s, label: titleCase(s), count: counts[s] ?? 0 }))]}
            />
            <Card padded={false}>
                <div className="flex flex-wrap items-center gap-3 border-b border-stone-100 p-4">
                    <SearchInput value={search} onChange={setSearch} placeholder="Order, customer, phone or tracking no." className="w-full max-w-xs" />
                    <Select
                        wrapperClassName="w-44"
                        aria-label="Method"
                        value={filters.method}
                        onChange={(e) => setFilter('method', e.target.value)}
                        placeholder="All methods"
                        options={[
                            { value: 'PICKUP', label: 'Studio pickup' },
                            { value: 'COURIER', label: 'Courier' },
                            { value: 'HAND_DELIVERY', label: 'Hand delivery' },
                        ]}
                    />
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="size-4 rounded border-stone-300" checked={filters.mine === '1'} onChange={(e) => set({ mine: e.target.checked ? '1' : null })} />
                        Assigned to me
                    </label>
                </div>
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                onRowClick={can('delivery.manage') ? (r) => setOpenId(r.id) : undefined}
                                empty={<EmptyState title="No deliveries here" description="Physical orders appear once they are paid." />}
                                columns={[
                                    {
                                        key: 'order',
                                        header: 'Order',
                                        cell: (r) => (
                                            <div>
                                                <button
                                                    type="button"
                                                    className="font-medium text-stone-900 hover:underline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOrderId(r.order_id);
                                                    }}
                                                >
                                                    {r.order_no}
                                                </button>
                                                <p className="text-xs text-stone-500">
                                                    {titleCase(r.order_type)} · {r.item_count} item(s) · order {titleCase(r.order_status)}
                                                </p>
                                            </div>
                                        ),
                                    },
                                    { key: 'customer', header: 'Customer', cell: (r) => <span>{r.customer_name}<span className="block text-xs text-stone-500">{r.customer_phone}</span></span> },
                                    { key: 'method', header: 'Method', cell: (r) => `${titleCase(r.method)}${r.tracking_no ? ` · ${r.courier ?? ''} ${r.tracking_no}` : ''}`, hideOnMobile: true },
                                    { key: 'assigned', header: 'Assigned', cell: (r) => r.assigned_name ?? '—', hideOnMobile: true },
                                    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
            <DeliveryModal delivery={open} onClose={() => setOpenId(null)} />
            <OrderManageDrawer id={orderId} onClose={() => setOrderId(null)} links={base} />
        </div>
    );
}

function DeliveryModal({ delivery, onClose }: { delivery: DeliveryRow | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const assignees = useAssignees(!!delivery);
    const [form, setForm] = useState({ status: '', method: '', courier: '', trackingNo: '', assignedTo: '', notes: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => {
        if (delivery) {
            setForm({ status: delivery.status, method: delivery.method, courier: delivery.courier ?? '', trackingNo: delivery.tracking_no ?? '', assignedTo: delivery.assigned_to ? String(delivery.assigned_to) : '', notes: delivery.notes ?? '' });
            setErrors({});
        }
    }, [delivery]);
    const save = useMutation({
        mutationFn: () =>
            api.send('PUT', `/api/delivery/${delivery!.id}`, {
                status: form.status !== delivery!.status ? form.status : undefined,
                method: form.method,
                courier: form.courier,
                trackingNo: form.trackingNo,
                assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
                notes: form.notes,
            }),
        onSuccess: (r) => (toast.success(r.message), invalidate(['delivery'], ['orders']), onClose()),
        onError: (e) => toast.error(e),
    });
    const submit = () => {
        const e: Record<string, string> = {};
        if (form.method === 'COURIER' && ['DISPATCHED', 'IN_TRANSIT'].includes(form.status) && !form.trackingNo.trim()) e.trackingNo = 'Enter the tracking number before dispatching';
        if (form.status === 'FAILED' && form.notes.trim().length < 3) e.notes = 'Say what went wrong';
        if (form.courier.length > 80) e.courier = '80 characters max';
        if (form.trackingNo.length > 80) e.trackingNo = '80 characters max';
        if (form.notes.length > 255) e.notes = '255 characters max';
        setErrors(e);
        if (!Object.keys(e).length) save.mutate();
    };
    const statusOptions = delivery ? [delivery.status, ...DELIVERY_FLOW[delivery.status]] : [];
    const assigneeOptions = useMemo(() => {
        const list = assignees.map((u) => ({ value: u.id, label: u.name }));
        if (delivery?.assigned_to && !list.some((o) => o.value === delivery.assigned_to)) list.push({ value: delivery.assigned_to, label: delivery.assigned_name ?? `User #${delivery.assigned_to}` });
        return list;
    }, [assignees, delivery]);
    const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const address = delivery ? formatAddress(delivery.address) : null;
    return (
        <Modal
            open={!!delivery}
            onClose={onClose}
            title={delivery ? `Delivery · ${delivery.order_no}` : ''}
            size="lg"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={save.isPending} onClick={submit}>
                        Save
                    </Button>
                </>
            }
        >
            {delivery && (
                <div className="space-y-5">
                    <KeyValue
                        items={[
                            ['Customer', `${delivery.customer_name}${delivery.customer_phone ? ` · ${delivery.customer_phone}` : ''}`],
                            ['Order', `${titleCase(delivery.order_type)} · ${money(delivery.total)} · ${titleCase(delivery.order_status)}`],
                            ['Address', address ? <span key="a" className="whitespace-pre-line">{address}</span> : delivery.method === 'PICKUP' ? 'Studio pickup' : null],
                            ['Dispatched', delivery.dispatched_at ? dateTime(delivery.dispatched_at) : null],
                            ['Delivered', delivery.delivered_at ? dateTime(delivery.delivered_at) : null],
                        ]}
                    />
                    {!['READY', 'DELIVERED'].includes(delivery.order_status) && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">The order is still {titleCase(delivery.order_status).toLowerCase()}. It can be dispatched once all printing is ready.</p>}
                    <FormGrid>
                        <Select label="Status" value={form.status} onChange={set('status')} options={statusOptions.map((s) => ({ value: s, label: titleCase(s) }))} />
                        <Select
                            label="Method"
                            value={form.method}
                            onChange={set('method')}
                            options={[
                                { value: 'PICKUP', label: 'Studio pickup' },
                                { value: 'COURIER', label: 'Courier' },
                                { value: 'HAND_DELIVERY', label: 'Hand delivery' },
                            ]}
                        />
                        {form.method === 'COURIER' && (
                            <>
                                <Input label="Courier" value={form.courier} onChange={set('courier')} error={errors.courier} placeholder="e.g. DTDC" />
                                <Input label="Tracking number" value={form.trackingNo} onChange={set('trackingNo')} error={errors.trackingNo} />
                            </>
                        )}
                        <Select label="Assigned to" value={form.assignedTo} onChange={set('assignedTo')} placeholder="Unassigned" options={assigneeOptions} />
                    </FormGrid>
                    <Textarea label="Notes" rows={3} value={form.notes} onChange={set('notes')} error={errors.notes} maxLength={255} />
                </div>
            )}
        </Modal>
    );
}
