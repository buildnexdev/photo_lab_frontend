// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { BookingFields } from '../../components/BookingFields';
import { DataTable, EmptyState, Pagination, QueryState, StatusBadge } from '../../components/data';
import { PaymentList, QuotationView } from '../../components/domain';
import { Select, Textarea } from '../../components/form';
import { Drawer, Modal, useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { usePayment } from '../../components/usePayment';
import { Alert, Button, Card, KeyValue, PageHeader } from '../../components/ui';
import { api, applyFieldErrors, type Paged } from '../../lib/api';
import { date, money, time, titleCase } from '../../lib/format';
import { useInvalidate, useListParams, useOpenParam } from '../../lib/hooks';
import { useSite } from '../../lib/site';
import { BOOKING_STATUSES, type BookingDetail, type BookingRow } from '../../lib/types';
import { bookingDetailsSchema, bookingPayload, type BookingDetailsForm } from '../../lib/validation';

export default function CustomerBookings() {
    const { page, filters, setPage, setFilter } = useListParams(['status'] as const);
    const [openId, setOpenId] = useOpenParam();
    const [params, setParams] = useSearchParams();
    const creating = params.get('new') === '1';
    const setCreating = (v: boolean) =>
        setParams((p) => {
            const n = new URLSearchParams(p);
            if (v) n.set('new', '1');
            else n.delete('new');
            return n;
        });
    const q = useQuery({
        queryKey: ['bookings', 'mine', page, filters.status],
        queryFn: () => api.get<Paged<BookingRow>>('/api/bookings', { page, pageSize: 20, status: filters.status }),
        placeholderData: (p) => p,
    });

    return (
        <div>
            <PageHeader
                title="My bookings"
                subtitle="Enquiries, quotations and confirmed shoots."
                actions={
                    <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                        New booking
                    </Button>
                }
            />
            <Card padded={false}>
                <div className="flex flex-wrap gap-3 border-b border-stone-100 p-4">
                    <Select wrapperClassName="w-48" aria-label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="All statuses" options={BOOKING_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                </div>
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                onRowClick={(r) => setOpenId(r.id)}
                                empty={<EmptyState title="No bookings yet" description="Tell us about your event and we'll send you a quotation." action={<Button onClick={() => setCreating(true)}>Book a shoot</Button>} />}
                                columns={[
                                    { key: 'no', header: 'Booking', cell: (r) => <span className="font-medium text-stone-900">{r.booking_no}</span> },
                                    { key: 'event', header: 'Event', cell: (r) => `${r.event_type} · ${date(r.event_date)}` },
                                    { key: 'pkg', header: 'Package', cell: (r) => r.package_name ?? 'Custom', hideOnMobile: true },
                                    { key: 'amount', header: 'Total', cell: (r) => (r.total_amount ? money(r.total_amount) : '—'), hideOnMobile: true },
                                    { key: 'paid', header: 'Paid', cell: (r) => money(r.paid_amount), hideOnMobile: true },
                                    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
            <NewBookingModal open={creating} onClose={() => setCreating(false)} onCreated={(id) => (setCreating(false), setOpenId(id))} />
            <BookingDrawer id={openId} onClose={() => setOpenId(null)} />
        </div>
    );
}

function NewBookingModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
    const site = useSite();
    const toast = useToast();
    const invalidate = useInvalidate();
    const {
        register,
        handleSubmit,
        watch,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<BookingDetailsForm>({ resolver: zodResolver(bookingDetailsSchema) });
    useEffect(() => {
        if (open) reset({ eventType: '', eventDate: '', serviceId: '', packageId: '' });
    }, [open, reset]);
    const submit = handleSubmit(async (v) => {
        try {
            const r = await api.send<{ id: number; bookingNo: string }>('POST', '/api/bookings', bookingPayload(v));
            toast.success(`${r.message} (${r.data.bookingNo})`);
            await invalidate(['bookings'], ['portal']);
            onCreated(r.data.id);
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Book a shoot"
            size="lg"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={submit} loading={isSubmitting}>
                        Send request
                    </Button>
                </>
            }
        >
            {site.data ? (
                <form onSubmit={submit} noValidate>
                    <BookingFields register={register} errors={errors} watch={watch} services={site.data.services} packages={site.data.packages} />
                </form>
            ) : (
                <p className="text-sm text-stone-500">Loading packages…</p>
            )}
        </Modal>
    );
}

function BookingDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const { pay, busy, dialog: payDialog } = usePayment();
    const [cancelOpen, setCancelOpen] = useState(false);
    const [reason, setReason] = useState('');
    const q = useQuery({ queryKey: ['bookings', 'detail', id], queryFn: () => api.get<BookingDetail>(`/api/bookings/${id}`), enabled: !!id });

    const refresh = () => invalidate(['bookings'], ['portal']);
    const respond = useMutation({
        mutationFn: ({ qid, decision }: { qid: number; decision: 'ACCEPT' | 'REJECT' }) => api.send('POST', `/api/bookings/quotations/${qid}/respond`, { decision }),
        onSuccess: (r) => {
            toast.success(r.message);
            refresh();
        },
        onError: (e) => toast.error(e),
    });
    const cancel = useMutation({
        mutationFn: () => api.send('POST', `/api/bookings/${id}/cancel`, { reason: reason.trim() || null }),
        onSuccess: (r) => {
            toast.success(r.message);
            setCancelOpen(false);
            refresh();
        },
        onError: (e) => toast.error(e),
    });

    return (
        <Drawer open={!!id} onClose={onClose} title={q.data ? `Booking ${q.data.booking_no}` : 'Booking'}>
            <QueryState query={q}>
                {(b) => {
                    const pending = b.quotations.find((x) => x.status === 'SENT');
                    return (
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={b.status} />
                                {b.event && (
                                    <Link to="/customer/events" className="text-sm text-brand-700 hover:underline">
                                        Event {b.event.event_code}
                                    </Link>
                                )}
                            </div>
                            <KeyValue
                                items={[
                                    ['Event', b.event_type],
                                    ['Date', `${date(b.event_date)}${b.start_time ? ` · ${time(b.start_time)}${b.end_time ? `–${time(b.end_time)}` : ''}` : ''}`],
                                    ['Venue', b.venue],
                                    ['Guests', b.guests],
                                    ['Service', b.service_name],
                                    ['Package', b.package_name ?? 'Custom quotation'],
                                ]}
                            />
                            {b.message && <p className="whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-sm text-stone-700">{b.message}</p>}

                            <div className="rounded-xl border border-stone-200 p-4">
                                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                                    <div>
                                        <p className="text-xs uppercase text-stone-500">Total</p>
                                        <p className="font-semibold">{b.total_amount ? money(b.total_amount) : 'To be quoted'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-stone-500">Paid</p>
                                        <p className="font-semibold text-emerald-700">{money(b.paid_amount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-stone-500">Balance</p>
                                        <p className="font-semibold">{money(b.balance_due)}</p>
                                    </div>
                                </div>
                                {b.can_pay_advance && (
                                    <Button className="mt-4 w-full" loading={busy} onClick={() => pay({ bookingId: b.id, purpose: 'ADVANCE' })}>
                                        Pay advance {money(b.advance_due)} to confirm
                                    </Button>
                                )}
                                {b.can_pay_balance && (
                                    <Button className="mt-4 w-full" loading={busy} onClick={() => pay({ bookingId: b.id, purpose: 'BALANCE' })}>
                                        Pay balance {money(b.balance_due)}
                                    </Button>
                                )}
                            </div>

                            {pending && (
                                <Alert tone="info" title="A quotation is waiting for your response">
                                    Review it below and accept to move ahead with the advance payment.
                                </Alert>
                            )}
                            {b.quotations.map((qt) => (
                                <div key={qt.id} className="rounded-xl border border-stone-200 p-4">
                                    <QuotationView q={qt} />
                                    {qt.status === 'SENT' && (
                                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                                            <Button
                                                variant="secondary"
                                                loading={respond.isPending && respond.variables?.decision === 'REJECT'}
                                                onClick={async () => (await ask({ title: 'Decline this quotation?', message: 'The studio will be notified. You can still discuss changes with them.', confirmLabel: 'Decline' })) && respond.mutate({ qid: qt.id, decision: 'REJECT' })}
                                            >
                                                Decline
                                            </Button>
                                            <Button variant="success" loading={respond.isPending && respond.variables?.decision === 'ACCEPT'} onClick={() => respond.mutate({ qid: qt.id, decision: 'ACCEPT' })}>
                                                Accept quotation
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <div>
                                <p className="mb-2 font-semibold text-stone-900">Payments</p>
                                <PaymentList payments={b.payments} />
                                {b.payments.some((p) => p.status === 'SUCCESS') && (
                                    <Link to="/customer/payments" className="mt-2 inline-block text-sm text-brand-700 hover:underline">
                                        Invoices are under Payments
                                    </Link>
                                )}
                            </div>

                            {['ENQUIRY', 'QUOTED', 'ADVANCE_PENDING'].includes(b.status) && (
                                <div className="border-t border-stone-100 pt-4">
                                    <Button variant="ghost" className="text-red-600" onClick={() => setCancelOpen(true)}>
                                        Cancel this booking
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                }}
            </QueryState>
            <Modal
                open={cancelOpen}
                onClose={() => setCancelOpen(false)}
                title="Cancel booking"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setCancelOpen(false)}>
                            Keep booking
                        </Button>
                        <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>
                            Cancel booking
                        </Button>
                    </>
                }
            >
                <Textarea label="Reason (optional)" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Modal>
            {dialog}
            {payDialog}
        </Drawer>
    );
}
