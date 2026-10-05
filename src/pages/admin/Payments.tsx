import { useMutation, useQuery } from '@tanstack/react-query';
import { FileText, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { DataTable, EmptyState, Pagination, QueryState, SearchInput, StatCard, StatusBadge } from '../../components/data';
import { InvoiceModal } from '../../components/domain';
import { Input, Select, Textarea } from '../../components/form';
import { Drawer, Modal } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Button, Card, KeyValue, PageHeader, Tabs } from '../../components/ui';
import { api, type Paged } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { date, dateTime, money, titleCase, toPaise, toRupees } from '../../lib/format';
import { useInvalidate, useListParams, useOpenParam } from '../../lib/hooks';
import { PAYMENT_PURPOSES, PAYMENT_STATUSES, type PaymentRow } from '../../lib/types';

interface PaymentList extends Paged<PaymentRow> {
    summary: { collected: number; pending: number; refunded: number; failed: number | null };
}
interface InvoiceRow {
    id: number;
    invoice_no: string;
    description: string | null;
    total: number;
    tax: number;
    issued_at: string;
    customer_name: string;
    payment_no: string;
    purpose: string;
}
interface PaymentDetail extends PaymentRow {
    customer_email: string | null;
    customer_phone: string | null;
    booking_id: number | null;
    order_id: number | null;
    provider_order_id: string | null;
}

export default function AdminPayments() {
    const { page, search, filters, setPage, setSearch, setFilter, set } = useListParams(['tab', 'status', 'purpose', 'from', 'to'] as const);
    const tab = filters.tab === 'invoices' ? 'invoices' : 'payments';
    const [openId, setOpenId] = useOpenParam();
    const [invoiceId, setInvoiceId] = useState<number | null>(null);
    const rangeError = !!(filters.from && filters.to && filters.from > filters.to);
    const payments = useQuery({
        queryKey: ['payments', 'admin', page, search, filters],
        queryFn: () => api.get<PaymentList>('/api/payments', { page, pageSize: 25, search, status: filters.status, purpose: filters.purpose, from: filters.from, to: filters.to }),
        placeholderData: (p) => p,
        enabled: tab === 'payments' && !rangeError,
    });
    const invoices = useQuery({
        queryKey: ['invoices', 'admin', page, search],
        queryFn: () => api.get<Paged<InvoiceRow>>('/api/invoices', { page, pageSize: 25, search }),
        placeholderData: (p) => p,
        enabled: tab === 'invoices',
    });
    return (
        <div>
            <PageHeader title="Payments" subtitle="Online and offline collections, refunds and GST invoices." />
            <Tabs
                className="mb-4"
                value={tab}
                onChange={(t) => set({ tab: t === 'payments' ? null : t, status: null, purpose: null, from: null, to: null, search: null })}
                tabs={[
                    { value: 'payments', label: 'Payments' },
                    { value: 'invoices', label: 'Invoices' },
                ]}
            />
            {tab === 'payments' ? (
                <>
                    {payments.data && (
                        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                            <StatCard label="Collected (net)" value={money(payments.data.summary.collected, true)} tone="emerald" />
                            <StatCard label="Pending" value={money(payments.data.summary.pending, true)} tone="sky" />
                            <StatCard label="Refunded" value={money(payments.data.summary.refunded, true)} tone="rose" />
                            <StatCard label="Failed attempts" value={payments.data.summary.failed ?? 0} />
                        </div>
                    )}
                    <Card padded={false}>
                        <div className="flex flex-wrap items-end gap-3 border-b border-stone-100 p-4">
                            <SearchInput value={search} onChange={setSearch} placeholder="Payment no., gateway ID, customer" className="w-full max-w-xs" />
                            <Select wrapperClassName="w-40" aria-label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="All statuses" options={PAYMENT_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                            <Select wrapperClassName="w-40" aria-label="Purpose" value={filters.purpose} onChange={(e) => setFilter('purpose', e.target.value)} placeholder="All purposes" options={PAYMENT_PURPOSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                            <Input wrapperClassName="w-40" label="From" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
                            <Input wrapperClassName="w-40" label="To" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} error={rangeError ? 'Must be after From' : undefined} />
                        </div>
                        <QueryState query={payments}>
                            {(d) => (
                                <>
                                    <DataTable
                                        rows={d.items}
                                        rowKey={(r) => r.id}
                                        onRowClick={(r) => setOpenId(r.id)}
                                        empty={<EmptyState title="No payments match these filters" />}
                                        columns={[
                                            {
                                                key: 'no',
                                                header: 'Payment',
                                                cell: (r) => (
                                                    <div>
                                                        <p className="font-medium text-stone-900">{r.payment_no}</p>
                                                        <p className="text-xs text-stone-500">
                                                            {titleCase(r.purpose)} · {r.booking_no ?? r.order_no ?? '—'}
                                                        </p>
                                                    </div>
                                                ),
                                            },
                                            { key: 'customer', header: 'Customer', cell: (r) => r.customer_name },
                                            { key: 'method', header: 'Method', cell: (r) => `${titleCase(r.provider)}${r.method ? ` · ${titleCase(r.method)}` : ''}`, hideOnMobile: true },
                                            { key: 'date', header: 'Date', cell: (r) => dateTime(r.paid_at ?? r.created_at), hideOnMobile: true },
                                            {
                                                key: 'amount',
                                                header: 'Amount',
                                                cell: (r) => (
                                                    <div>
                                                        {money(r.amount)}
                                                        {Number(r.refunded_amount) > 0 && <p className="text-xs text-red-600">−{money(r.refunded_amount)} refunded</p>}
                                                    </div>
                                                ),
                                            },
                                            { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                        ]}
                                    />
                                    <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                                </>
                            )}
                        </QueryState>
                    </Card>
                </>
            ) : (
                <Card padded={false}>
                    <div className="border-b border-stone-100 p-4">
                        <SearchInput value={search} onChange={setSearch} placeholder="Invoice no. or customer" className="w-full max-w-xs" />
                    </div>
                    <QueryState query={invoices}>
                        {(d) => (
                            <>
                                <DataTable
                                    rows={d.items}
                                    rowKey={(r) => r.id}
                                    onRowClick={(r) => setInvoiceId(r.id)}
                                    empty={<EmptyState title="No invoices yet" description="An invoice is issued automatically for every successful payment." />}
                                    columns={[
                                        { key: 'no', header: 'Invoice', cell: (r) => <span className="font-medium text-stone-900">{r.invoice_no}</span> },
                                        { key: 'customer', header: 'Customer', cell: (r) => r.customer_name },
                                        { key: 'desc', header: 'For', cell: (r) => r.description ?? titleCase(r.purpose), hideOnMobile: true },
                                        { key: 'date', header: 'Issued', cell: (r) => date(r.issued_at), hideOnMobile: true },
                                        { key: 'tax', header: 'GST', cell: (r) => money(r.tax), hideOnMobile: true },
                                        { key: 'total', header: 'Total', cell: (r) => money(r.total) },
                                    ]}
                                />
                                <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                            </>
                        )}
                    </QueryState>
                </Card>
            )}
            <PaymentDrawer id={openId} onClose={() => setOpenId(null)} onInvoice={setInvoiceId} />
            <InvoiceModal id={invoiceId} onClose={() => setInvoiceId(null)} />
        </div>
    );
}

function PaymentDrawer({ id, onClose, onInvoice }: { id: number | null; onClose: () => void; onInvoice: (id: number) => void }) {
    const { can } = useAuth();
    const [refunding, setRefunding] = useState(false);
    const q = useQuery({ queryKey: ['payments', 'detail', id], queryFn: () => api.get<PaymentDetail>(`/api/payments/${id}`), enabled: !!id });
    const p = q.data;
    const refundable = p ? Number(p.amount) - Number(p.refunded_amount) : 0;
    return (
        <Drawer
            open={!!id}
            onClose={onClose}
            title={p ? `Payment ${p.payment_no}` : 'Payment'}
            footer={
                p && (
                    <>
                        {p.invoice_id && (
                            <Button variant="secondary" icon={<FileText className="size-4" />} onClick={() => onInvoice(p.invoice_id!)}>
                                Invoice {p.invoice_no}
                            </Button>
                        )}
                        {can('payments.manage') && p.status === 'SUCCESS' && refundable > 0 && (
                            <Button variant="danger" icon={<Undo2 className="size-4" />} onClick={() => setRefunding(true)}>
                                Refund
                            </Button>
                        )}
                    </>
                )
            }
        >
            <QueryState query={q}>
                {(d) => (
                    <div className="space-y-4">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-semibold">{money(d.amount)}</span>
                            <StatusBadge status={d.status} />
                        </div>
                        <KeyValue
                            items={[
                                ['Customer', <Link key="c" className="link" to={`/admin/customers?open=${d.customer_id}`}>{d.customer_name}</Link>],
                                ['Contact', [d.customer_phone, d.customer_email].filter(Boolean).join(' · ') || null],
                                ['Purpose', titleCase(d.purpose)],
                                ['For', d.booking_id ? <Link key="b" className="link" to={`/admin/bookings?open=${d.booking_id}`}>{d.booking_no}</Link> : d.order_id ? <Link key="o" className="link" to={`/admin/orders?open=${d.order_id}`}>{d.order_no}</Link> : null],
                                ['Provider', titleCase(d.provider)],
                                ['Method', d.method ? titleCase(d.method) : null],
                                ['Gateway order', d.provider_order_id],
                                ['Gateway payment / reference', d.provider_payment_id],
                                ['Created', dateTime(d.created_at)],
                                ['Paid', d.paid_at ? dateTime(d.paid_at) : null],
                                ['Refunded', Number(d.refunded_amount) > 0 ? money(d.refunded_amount) : null],
                                ['Note', d.failure_reason],
                            ]}
                        />
                    </div>
                )}
            </QueryState>
            {p && <RefundModal open={refunding} payment={p} max={refundable} onClose={() => setRefunding(false)} />}
        </Drawer>
    );
}

function RefundModal({ open, payment, max, onClose }: { open: boolean; payment: PaymentDetail; max: number; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});
    useEffect(() => {
        if (open) (setAmount(toRupees(max)), setReason(''), setErrors({}));
    }, [open, max]);
    const save = useMutation({
        mutationFn: () => api.send('POST', `/api/payments/${payment.id}/refund`, { amount: toPaise(amount), reason: reason.trim() }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['payments'], ['bookings'], ['orders'], ['reports']);
            onClose();
        },
        onError: (e) => toast.error(e),
    });
    const submit = () => {
        const e: typeof errors = {};
        if (!/^\d+(\.\d{1,2})?$/.test(amount) || toPaise(amount) <= 0) e.amount = 'Enter a valid amount';
        else if (toPaise(amount) > max) e.amount = `At most ${money(max)}`;
        if (reason.trim().length < 3) e.reason = 'Give a reason (at least 3 characters)';
        setErrors(e);
        if (!Object.keys(e).length) save.mutate();
    };
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Refund ${payment.payment_no}`}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="danger" loading={save.isPending} onClick={submit}>
                        Refund
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-stone-600">{payment.provider === 'offline' ? 'Offline payment: record the refund here after returning the money to the customer.' : 'The refund is sent to the customer through the payment gateway.'}</p>
                <Input label="Amount" prefix="₹" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} hint={`Refundable: ${money(max)}`} />
                <Textarea label="Reason" required rows={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} />
            </div>
        </Modal>
    );
}
