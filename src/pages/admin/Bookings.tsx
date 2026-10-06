// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026 
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Banknote, FilePlus2, Pencil, Send, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { BookingFields } from '../../components/BookingFields';
import { CustomerPicker, type CustomerOption } from '../../components/CustomerPicker';
import { DataTable, EmptyState, Pagination, QueryState, StatusBadge, TableHeaderToolbar } from '../../components/data';
import { PaymentList, QuotationView } from '../../components/domain';
import { Input, Select, Textarea } from '../../components/form';
import { OfflinePaymentModal } from '../../components/OfflinePaymentModal';
import { Drawer, Modal, useConfirm } from '../../components/overlay';
import { QuotationBuilder } from '../../components/QuotationBuilder';
import { useToast } from '../../components/toast';
import { Button, Card, IconButton, KeyValue } from '../../components/ui';
import { api, applyFieldErrors, type Paged } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { date, dateTime, money, time, titleCase } from '../../lib/format';
import { useInvalidate, useListParams, useOpenParam, useViewMode } from '../../lib/hooks';
import { useSite } from '../../lib/site';
import { BOOKING_STATUSES, type BookingDetail, type BookingRow, type Quotation } from '../../lib/types';
import { bookingDetailsSchema, bookingPayload } from '../../lib/validation';

export default function AdminBookings() {
    const { can } = useAuth();
    const { page, search, filters, setPage, setSearch, setFilter } = useListParams(['status', 'from', 'to'] as const);
    const [openId, setOpenId] = useOpenParam();
    const [form, setForm] = useState<BookingDetail | 'new' | null>(null);
    const rangeError = filters.from && filters.to && filters.from > filters.to;
    const q = useQuery({
        queryKey: ['bookings', 'admin', page, search, filters],
        queryFn: () => api.get<Paged<BookingRow>>('/api/bookings', { page, pageSize: 25, search, status: filters.status, from: filters.from, to: filters.to }),
        placeholderData: (p) => p,
        enabled: !rangeError,
    });

    const [viewMode, setViewMode] = useViewMode();

    return (
        <div>
            <Card padded={false} className="overflow-hidden">
                <TableHeaderToolbar
                    total={q.data?.total}
                    totalLabel="Bookings"
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder="Booking no, customer, phone, venue"
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onAdd={can('bookings.manage') ? () => setForm('new') : undefined}
                    addLabel="New Booking"
                    extraFilters={
                        <div className="flex flex-wrap items-center gap-2">
                            <Select wrapperClassName="w-40" aria-label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="All statuses" options={BOOKING_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                            <Input wrapperClassName="w-36" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
                            <Input wrapperClassName="w-36" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} error={rangeError ? 'Must be after From' : undefined} />
                        </div>
                    }
                />
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                onRowClick={(r) => setOpenId(r.id)}
                                viewMode={viewMode}
                                empty={<EmptyState title="No bookings match these filters" />}
                                columns={[
                                    {
                                        key: 'no',
                                        header: 'Booking',
                                        cell: (r) => (
                                            <div>
                                                <p className="font-medium text-stone-900">{r.booking_no}</p>
                                                <p className="text-xs text-stone-500">{titleCase(r.source)}</p>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'customer',
                                        header: 'Customer',
                                        cell: (r) => (
                                            <div>
                                                <p>{r.customer_name}</p>
                                                <p className="text-xs text-stone-500">{r.customer_phone ?? r.customer_email}</p>
                                            </div>
                                        ),
                                    },
                                    { key: 'event', header: 'Event', cell: (r) => `${r.event_type} · ${date(r.event_date)}` },
                                    { key: 'pkg', header: 'Package', cell: (r) => r.package_name ?? '—', hideOnMobile: true },
                                    { key: 'total', header: 'Total', cell: (r) => (r.total_amount ? money(r.total_amount) : '—'), hideOnMobile: true },
                                    { key: 'due', header: 'Due', cell: (r) => money(Math.max(0, r.total_amount - r.paid_amount)), hideOnMobile: true },
                                    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                    {
                                        key: 'act',
                                        header: '',
                                        cell: (r) => (
                                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                <IconButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => setForm(r as any)} />
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
            <BookingDrawer id={openId} onClose={() => setOpenId(null)} onEdit={(b) => setForm(b)} />
            <BookingForm value={form} onClose={() => setForm(null)} onSaved={(id) => (setForm(null), setOpenId(id))} />
        </div>
    );
}

const adminSchema = bookingDetailsSchema.and(z.object({ internalNotes: z.string().max(3000).optional() }));
type AdminForm = z.infer<typeof adminSchema>;

function BookingForm({ value, onClose, onSaved }: { value: BookingDetail | 'new' | null; onClose: () => void; onSaved: (id: number) => void }) {
    const site = useSite();
    const toast = useToast();
    const invalidate = useInvalidate();
    const isNew = value === 'new';
    const [customer, setCustomer] = useState<CustomerOption | null>(null);
    const [customerError, setCustomerError] = useState('');
    const {
        register,
        handleSubmit,
        watch,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<AdminForm>({ resolver: zodResolver(adminSchema) });
    useEffect(() => {
        if (!value) return;
        setCustomerError('');
        if (value === 'new') {
            setCustomer(null);
            reset({ eventType: '', eventDate: '', serviceId: '', packageId: '', internalNotes: '' });
        } else {
            reset({
                serviceId: value.service_id ? String(value.service_id) : '',
                packageId: value.package_id ? String(value.package_id) : '',
                eventType: value.event_type,
                eventDate: value.event_date,
                startTime: value.start_time?.slice(0, 5) ?? '',
                endTime: value.end_time?.slice(0, 5) ?? '',
                venue: value.venue ?? '',
                guests: value.guests ? String(value.guests) : '',
                message: value.message ?? '',
                internalNotes: value.internal_notes ?? '',
            });
        }
    }, [value, reset]);

    const submit = handleSubmit(async (v) => {
        if (isNew && !customer) return setCustomerError('Choose a customer');
        const body = { ...bookingPayload(v), internalNotes: v.internalNotes?.trim() || null };
        try {
            const r = isNew ? await api.send<{ id: number }>('POST', '/api/bookings', { ...body, customerId: customer!.id }) : await api.send<{ id: number }>('PUT', `/api/bookings/${(value as BookingDetail).id}`, body);
            toast.success(r.message);
            await invalidate(['bookings']);
            onSaved(r.data.id);
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });

    return (
        <Modal
            open={!!value}
            onClose={onClose}
            title={isNew ? 'New booking' : 'Edit booking'}
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
            <form onSubmit={submit} noValidate className="space-y-4">
                {isNew ? (
                    <CustomerPicker required value={customer?.id ?? null} onChange={(c) => (setCustomer(c), setCustomerError(''))} error={customerError} />
                ) : (
                    <p className="text-sm text-stone-600">
                        Customer: <strong>{(value as BookingDetail | null)?.customer_name}</strong>
                    </p>
                )}
                {site.data && <BookingFields register={register} errors={errors} watch={watch} services={site.data.services} packages={site.data.packages} />}
                <Textarea label="Internal notes (staff only)" rows={2} {...register('internalNotes')} error={errors.internalNotes?.message} />
            </form>
        </Modal>
    );
}

function BookingDrawer({ id, onClose, onEdit }: { id: number | null; onClose: () => void; onEdit: (b: BookingDetail) => void }) {
    const { can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [builder, setBuilder] = useState<{ q: Quotation | null } | null>(null);
    const [offline, setOffline] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [activeTab, setActiveTab] = useState<'event' | 'quote' | 'qr' | 'team' | 'finance'>('event');
    const q = useQuery({ queryKey: ['bookings', 'detail', id], queryFn: () => api.get<BookingDetail>(`/api/bookings/${id}`), enabled: !!id });
    const refresh = () => invalidate(['bookings'], ['reports']);
    const manage = can('bookings.manage');

    const act = useMutation({
        mutationFn: ({ method, path, body }: { method: 'POST' | 'DELETE'; path: string; body?: unknown }) => api.send(method, path, body),
        onSuccess: (r) => {
            toast.success(r.message);
            setCancelOpen(false);
            refresh();
        },
        onError: (e) => toast.error(e),
    });

    return (
        <Drawer
            open={!!id}
            onClose={onClose}
            width="max-w-[90vw] w-[90vw]"
            title={q.data ? `Booking ${q.data.booking_no}` : 'Booking'}
            footer={
                activeTab === 'event' && q.data && manage && (
                    <>
                        {!['COMPLETED', 'CANCELLED'].includes(q.data.status) && (
                            <Button variant="ghost" className="text-red-600" onClick={() => setCancelOpen(true)}>
                                Cancel booking
                            </Button>
                        )}
                        {['CONFIRMED', 'IN_PROGRESS'].includes(q.data.status) && (
                            <Button variant="secondary" loading={act.isPending} onClick={async () => (await ask({ title: 'Mark as delivered?', message: 'All photos/albums have been handed over to the customer. If fully paid, the booking will be completed.', confirmLabel: 'Mark delivered', tone: 'primary' })) && act.mutate({ method: 'POST', path: `/api/bookings/${q.data!.id}/deliver` })}>
                                Mark delivered
                            </Button>
                        )}
                        {!['COMPLETED', 'CANCELLED'].includes(q.data.status) && (
                            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => onEdit(q.data!)}>
                                Edit
                            </Button>
                        )}
                    </>
                )
            }
        >
            <div className="mb-6 flex space-x-1 rounded-xl bg-stone-100 p-1">
                {(
                    [
                        { id: 'event', label: 'Manage Event' },
                        { id: 'quote', label: 'Quotations' },
                        { id: 'qr', label: 'QR & Links' },
                        { id: 'team', label: 'Team & Assets' },
                        { id: 'finance', label: 'Finance' },
                    ] as const
                ).map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                            activeTab === tab.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <QueryState query={q}>
                {(b) => {
                    const due = b.balance_due;
                    const canQuote = manage && ['ENQUIRY', 'QUOTED', 'ADVANCE_PENDING'].includes(b.status);
                    return (
                        <div className="space-y-6">
                            {activeTab === 'event' && (
                                <section className="space-y-6">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StatusBadge status={b.status} />
                                        <span className="text-xs text-stone-500">
                                            {titleCase(b.source)} · created {dateTime(b.created_at)}
                                        </span>
                                        {b.event && (
                                            <Link to={`/admin/events/${b.event.id}`} className="ml-auto text-sm font-medium text-brand-700 hover:underline">
                                                Event {b.event.event_code} →
                                            </Link>
                                        )}
                                    </div>
                                    <KeyValue
                                        items={[
                                            ['Customer', <Link key="c" to={`/admin/customers?open=${b.customer_id}`} className="link">{b.customer_name}</Link>],
                                            ['Contact', [b.customer_phone, b.customer_email].filter(Boolean).join(' · ')],
                                            ['Event', b.event_type],
                                            ['Date', `${date(b.event_date)}${b.start_time ? ` · ${time(b.start_time)}${b.end_time ? `–${time(b.end_time)}` : ''}` : ''}`],
                                            ['Venue', b.venue],
                                            ['Guests', b.guests],
                                            ['Service', b.service_name],
                                            ['Package', b.package_name ?? 'Custom'],
                                        ]}
                                    />
                                    {b.message && (
                                        <div>
                                            <p className="text-xs font-medium uppercase text-stone-500">Customer message</p>
                                            <p className="mt-1 whitespace-pre-wrap text-sm">{b.message}</p>
                                        </div>
                                    )}
                                    {b.internal_notes && <p className="whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{b.internal_notes}</p>}
                                </section>
                            )}

                            {activeTab === 'quote' && (
                                <section>
                                    <div className="mb-4 flex items-center justify-between">
                                        <p className="font-semibold text-lg">Quotations</p>
                                        {canQuote && (
                                            <Button size="sm" variant="primary" icon={<FilePlus2 className="size-4" />} onClick={() => setBuilder({ q: null })}>
                                                Create Quotation
                                            </Button>
                                        )}
                                    </div>
                                    {(!b.quotations || !b.quotations.length) && (
                                        <EmptyState title="No quotations" description={canQuote ? 'Create a quotation to send pricing and package details to the customer.' : ''} />
                                    )}
                                    <div className="space-y-3">
                                        {(b.quotations || []).map((qt) => (
                                            <div key={qt.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
                                                <QuotationView q={qt} />
                                                {manage && qt.status === 'DRAFT' && (
                                                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-4">
                                                        <Button size="sm" variant="ghost" className="text-red-600" icon={<Trash2 className="size-4" />} onClick={async () => (await ask({ title: 'Delete draft quotation?', message: qt.quotation_no, confirmLabel: 'Delete' })) && act.mutate({ method: 'DELETE', path: `/api/bookings/quotations/${qt.id}` })}>
                                                            Delete
                                                        </Button>
                                                        <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setBuilder({ q: qt })}>
                                                            Edit
                                                        </Button>
                                                        <Button size="sm" icon={<Send className="size-4" />} loading={act.isPending} onClick={() => act.mutate({ method: 'POST', path: `/api/bookings/quotations/${qt.id}/send` })}>
                                                            Send to customer
                                                        </Button>
                                                    </div>
                                                )}
                                                {manage && qt.status === 'SENT' && (
                                                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-4">
                                                        <span className="mr-auto self-center text-xs text-stone-500">Customer can accept online. Record manual decision:</span>
                                                        <Button size="sm" variant="secondary" onClick={() => act.mutate({ method: 'POST', path: `/api/bookings/quotations/${qt.id}/respond`, body: { decision: 'REJECT' } })}>
                                                            Mark declined
                                                        </Button>
                                                        <Button size="sm" variant="success" onClick={() => act.mutate({ method: 'POST', path: `/api/bookings/quotations/${qt.id}/respond`, body: { decision: 'ACCEPT' } })}>
                                                            Mark accepted
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {activeTab === 'qr' && (
                                <section className="space-y-6">
                                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-8 text-center">
                                        <p className="mb-2 font-medium text-stone-900">QR Codes & Upload Links</p>
                                        <p className="text-sm text-stone-500 mb-6">Create upload links and set security codes (e.g. one for photographer upload, one for customer review).</p>
                                        <Button variant="secondary" onClick={() => alert('This functionality will be connected to the Galleries & QR module.')}>
                                            Generate Upload Link
                                        </Button>
                                    </div>
                                </section>
                            )}

                            {activeTab === 'team' && (
                                <section className="space-y-6">
                                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-8 text-center">
                                        <p className="mb-2 font-medium text-stone-900">Team & Asset Assignment</p>
                                        <p className="text-sm text-stone-500 mb-6">Assign photographers, editors, and allocate equipment/assets for this booking.</p>
                                        <Button variant="secondary" onClick={() => alert('This functionality will be connected to the Events module.')}>
                                            Assign Staff
                                        </Button>
                                    </div>
                                </section>
                            )}

                            {activeTab === 'finance' && (
                                <section className="space-y-6">
                                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm sm:grid-cols-4 shadow-xs">
                                        <div>
                                            <p className="text-xs uppercase text-stone-500">Total Booking Value</p>
                                            <p className="font-semibold text-lg">{money(b.total_amount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase text-stone-500">Advance Paid</p>
                                            <p className="font-semibold text-lg">{money(b.advance_amount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase text-stone-500">Total Paid</p>
                                            <p className="font-semibold text-lg text-emerald-600">{money(b.paid_amount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase text-stone-500">Balance Due</p>
                                            <p className="font-semibold text-lg text-rose-600">{money(due)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 rounded-xl border border-stone-200 bg-white shadow-xs">
                                        <div className="flex items-center justify-between border-b border-stone-100 p-4">
                                            <p className="font-semibold text-lg">Payment History</p>
                                            {can('payments.manage') && due > 0 && !['ENQUIRY', 'QUOTED', 'CANCELLED'].includes(b.status) && (
                                                <Button size="sm" variant="primary" icon={<Banknote className="size-4" />} onClick={() => setOffline(true)}>
                                                    Record payment
                                                </Button>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <PaymentList payments={b.payments || []} />
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>
                    );
                }}
            </QueryState>
            {q.data && (
                <>
                    <QuotationBuilder
                        open={!!builder}
                        bookingId={q.data.id}
                        quotation={builder?.q ?? null}
                        defaults={q.data.package_name && q.data.total_amount ? { description: `${q.data.package_name} - ${q.data.event_type}`, amount: q.data.total_amount } : null}
                        onClose={() => setBuilder(null)}
                        onSaved={() => (setBuilder(null), refresh())}
                    />
                    <OfflinePaymentModal target={offline ? { bookingId: q.data.id } : null} due={q.data.balance_due} onClose={() => setOffline(false)} onSaved={() => (setOffline(false), refresh())} />
                </>
            )}
            <Modal
                open={cancelOpen}
                onClose={() => setCancelOpen(false)}
                title="Cancel booking"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setCancelOpen(false)}>
                            Keep
                        </Button>
                        <Button variant="danger" loading={act.isPending} onClick={() => act.mutate({ method: 'POST', path: `/api/bookings/${id}/cancel`, body: { reason: reason.trim() || null } })}>
                            Cancel booking
                        </Button>
                    </>
                }
            >
                <p className="mb-3 text-sm text-stone-600">Linked upcoming events are cancelled and open quotations expire. Refunds, if any, are handled from Payments.</p>
                <Textarea label="Reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Modal>
            {dialog}
        </Drawer>
    );
}
