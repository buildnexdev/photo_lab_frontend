import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Trash2, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { DataTable, EmptyState, Pagination, QueryState, StatusBadge, TableHeaderToolbar } from '../../components/data';
import { FormGrid, Input, Textarea } from '../../components/form';
import { Drawer, Modal, useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Button, Card, KeyValue, Tabs } from '../../components/ui';
import { api, applyFieldErrors, type Paged } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { date, dateTime, money, titleCase } from '../../lib/format';
import { useInvalidate, useListParams, useOpenParam, useViewMode } from '../../lib/hooks';
import { ORDER_TYPE_LABELS, type OrderType } from '../../lib/types';
import { optionalPhone } from '../../lib/validation';

interface CustomerRow {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    source: string;
    user_id: number | null;
    created_at: string;
    bookings: number;
    events: number;
    lifetime_value: number;
}
interface CustomerDetail extends Omit<CustomerRow, 'bookings' | 'events' | 'lifetime_value'> {
    address: string | null;
    state: string | null;
    pincode: string | null;
    notes: string | null;
    bookings: { id: number; booking_no: string; event_type: string; event_date: string; status: string; total_amount: number; paid_amount: number }[];
    events: { id: number; event_code: string; title: string; event_date: string; status: string }[];
    orders: { id: number; order_no: string; type: OrderType; status: string; total: number; created_at: string }[];
    payments: { id: number; payment_no: string; purpose: string; amount: number; status: string; method: string | null; paid_at: string | null; created_at: string }[];
}

const schema = z
    .object({
        name: z.string().trim().min(2, 'Enter the name').max(120),
        email: z.string().trim().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email'),
        phone: optionalPhone,
        address: z.string().trim().max(255),
        city: z.string().trim().max(80),
        state: z.string().trim().max(80),
        pincode: z.string().trim().refine((v) => !v || /^\d{6}$/.test(v), 'Enter a 6-digit PIN code'),
        notes: z.string().trim().max(2000),
    })
    .refine((v) => v.email || v.phone, { path: ['phone'], message: 'Enter an email or a phone number' });
type Form = z.infer<typeof schema>;
const blank: Form = { name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', notes: '' };

export default function AdminCustomers() {
    const { can } = useAuth();
    const { page, search, setPage, setSearch } = useListParams();
    const [openId, setOpenId] = useOpenParam();
    const [viewMode, setViewMode] = useViewMode();
    const [editing, setEditing] = useState<CustomerDetail | 'new' | null>(null);
    const q = useQuery({ queryKey: ['customers', 'list', page, search], queryFn: () => api.get<Paged<CustomerRow>>('/api/customers', { page, pageSize: 25, search }), placeholderData: (p) => p });

    return (
        <div>
            <Card padded={false} className="overflow-hidden">
                <TableHeaderToolbar
                    total={q.data?.total}
                    totalLabel="Customers"
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder="Search name, phone, email or city"
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onAdd={can('customers.manage') ? () => setEditing('new') : undefined}
                    addLabel="Add Customer"
                />
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                onRowClick={(r) => setOpenId(r.id)}
                                viewMode={viewMode}
                                empty={<EmptyState title={search ? 'No customers match your search' : 'No customers yet'} />}
                                columns={[
                                    {
                                        key: 'name',
                                        header: 'Customer',
                                        cell: (r) => (
                                            <div>
                                                <p className="flex items-center gap-1.5 font-medium text-stone-900">
                                                    {r.name} {r.user_id && <UserCheck className="size-3.5 text-emerald-600" aria-label="Has an online account" />}
                                                </p>
                                                <p className="text-xs text-stone-500">{[r.phone, r.email].filter(Boolean).join(' · ')}</p>
                                            </div>
                                        ),
                                    },
                                    { key: 'city', header: 'City', cell: (r) => r.city ?? '—', hideOnMobile: true },
                                    { key: 'bookings', header: 'Bookings', cell: (r) => r.bookings, hideOnMobile: true },
                                    { key: 'events', header: 'Events', cell: (r) => r.events, hideOnMobile: true },
                                    { key: 'ltv', header: 'Lifetime value', cell: (r) => money(r.lifetime_value) },
                                    { key: 'source', header: 'Source', cell: (r) => titleCase(r.source), hideOnMobile: true },
                                    { key: 'since', header: 'Since', cell: (r) => date(r.created_at), hideOnMobile: true },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
            <CustomerDrawer id={openId} onClose={() => setOpenId(null)} onEdit={(c) => setEditing(c)} />
            <CustomerForm value={editing} onClose={() => setEditing(null)} onSaved={(id) => (setEditing(null), setOpenId(id))} />
        </div>
    );
}

function CustomerDrawer({ id, onClose, onEdit }: { id: number | null; onClose: () => void; onEdit: (c: CustomerDetail) => void }) {
    const { can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [tab, setTab] = useState<'bookings' | 'events' | 'orders' | 'payments'>('bookings');
    const q = useQuery({ queryKey: ['customers', 'detail', id], queryFn: () => api.get<CustomerDetail>(`/api/customers/${id}`), enabled: !!id });
    const del = useMutation({
        mutationFn: () => api.send('DELETE', `/api/customers/${id}`),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['customers']);
            onClose();
        },
        onError: (e) => toast.error(e),
    });
    return (
        <Drawer
            open={!!id}
            onClose={onClose}
            title={q.data?.name ?? 'Customer'}
            footer={
                q.data &&
                can('customers.manage') && (
                    <>
                        <Button variant="ghost" className="text-red-600" icon={<Trash2 className="size-4" />} loading={del.isPending} onClick={async () => (await ask({ title: 'Delete customer?', message: 'Customers with active bookings cannot be deleted. History is kept for reports.', confirmLabel: 'Delete' })) && del.mutate()}>
                            Delete
                        </Button>
                        <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => onEdit(q.data!)}>
                            Edit
                        </Button>
                    </>
                )
            }
        >
            <QueryState query={q}>
                {(c) => (
                    <div className="space-y-6">
                        <KeyValue
                            items={[
                                ['Phone', c.phone],
                                ['Email', c.email],
                                ['Address', [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ') || null],
                                ['Online account', c.user_id ? 'Yes' : 'No'],
                                ['Source', titleCase(c.source)],
                                ['Customer since', dateTime(c.created_at)],
                            ]}
                        />
                        {c.notes && <p className="whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{c.notes}</p>}
                        <div>
                            <Tabs
                                value={tab}
                                onChange={setTab}
                                tabs={[
                                    { value: 'bookings', label: 'Bookings', count: c.bookings.length },
                                    { value: 'events', label: 'Events', count: c.events.length },
                                    { value: 'orders', label: 'Orders', count: c.orders.length },
                                    { value: 'payments', label: 'Payments', count: c.payments.length },
                                ]}
                            />
                            <ul className="divide-y divide-stone-100 text-sm">
                                {tab === 'bookings' &&
                                    c.bookings.map((b) => (
                                        <li key={b.id}>
                                            <Link to={`/admin/bookings?open=${b.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:bg-stone-50">
                                                <span>
                                                    <span className="font-medium">{b.booking_no}</span> · {b.event_type} · {date(b.event_date)}
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    {money(b.paid_amount)} / {money(b.total_amount)} <StatusBadge status={b.status} />
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                {tab === 'events' &&
                                    c.events.map((e) => (
                                        <li key={e.id}>
                                            <Link to={`/admin/events/${e.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:bg-stone-50">
                                                <span>
                                                    <span className="font-medium">{e.title}</span> · {date(e.event_date)}
                                                </span>
                                                <StatusBadge status={e.status} />
                                            </Link>
                                        </li>
                                    ))}
                                {tab === 'orders' &&
                                    c.orders.map((o) => (
                                        <li key={o.id}>
                                            <Link to={`/admin/orders?open=${o.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:bg-stone-50">
                                                <span>
                                                    <span className="font-medium">{o.order_no}</span> · {ORDER_TYPE_LABELS[o.type]}
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    {money(o.total)} <StatusBadge status={o.status} />
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                {tab === 'payments' &&
                                    c.payments.map((p) => (
                                        <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                                            <span>
                                                <span className="font-medium">{p.payment_no}</span> · {titleCase(p.purpose)} · {date(p.paid_at ?? p.created_at)}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                {money(p.amount)} <StatusBadge status={p.status} />
                                            </span>
                                        </li>
                                    ))}
                                {!c[tab].length && <li className="py-6 text-center text-stone-500">Nothing yet</li>}
                            </ul>
                        </div>
                    </div>
                )}
            </QueryState>
            {dialog}
        </Drawer>
    );
}

function CustomerForm({ value, onClose, onSaved }: { value: CustomerDetail | 'new' | null; onClose: () => void; onSaved: (id: number) => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const isNew = value === 'new';
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: blank });
    useEffect(() => {
        if (!value) return;
        if (value === 'new') reset(blank);
        else reset({ name: value.name, email: value.email ?? '', phone: value.phone ?? '', address: value.address ?? '', city: value.city ?? '', state: value.state ?? '', pincode: value.pincode ?? '', notes: value.notes ?? '' });
    }, [value, reset]);

    const submit = handleSubmit(async (v) => {
        const body = { name: v.name, email: v.email || null, phone: v.phone || null, address: v.address || null, city: v.city || null, state: v.state || null, pincode: v.pincode || null, notes: v.notes || null };
        try {
            const r = isNew ? await api.send<{ id: number }>('POST', '/api/customers', body) : await api.send<{ id: number }>('PUT', `/api/customers/${(value as CustomerDetail).id}`, body);
            toast.success(r.message);
            await invalidate(['customers']);
            onSaved(r.data?.id ?? (value as CustomerDetail).id);
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });

    return (
        <Modal
            open={!!value}
            onClose={onClose}
            title={isNew ? 'Add customer' : 'Edit customer'}
            size="lg"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={isSubmitting} onClick={submit}>
                        Save
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} noValidate>
                <FormGrid>
                    <Input label="Name" required {...register('name')} error={errors.name?.message} />
                    <Input label="Phone" type="tel" {...register('phone')} error={errors.phone?.message} />
                    <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
                    <Input label="City" {...register('city')} error={errors.city?.message} />
                    <Input label="Address" wrapperClassName="sm:col-span-2" {...register('address')} error={errors.address?.message} />
                    <Input label="State" {...register('state')} error={errors.state?.message} />
                    <Input label="PIN code" inputMode="numeric" maxLength={6} {...register('pincode')} error={errors.pincode?.message} />
                    <Textarea label="Internal notes" wrapperClassName="sm:col-span-2" rows={3} {...register('notes')} error={errors.notes?.message} />
                </FormGrid>
            </form>
        </Modal>
    );
}
