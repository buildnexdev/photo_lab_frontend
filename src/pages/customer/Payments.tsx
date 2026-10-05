import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable, EmptyState, Pagination, QueryState, StatCard, StatusBadge } from '../../components/data';
import { InvoiceModal } from '../../components/domain';
import { Card, PageHeader, Tabs } from '../../components/ui';
import { api, type Paged } from '../../lib/api';
import { dateTime, money, titleCase } from '../../lib/format';
import { useListParams } from '../../lib/hooks';
import type { PaymentRow } from '../../lib/types';

interface InvoiceRow {
    id: number;
    invoice_no: string;
    description: string;
    total: number;
    tax: number;
    issued_at: string;
    payment_no: string;
    purpose: string;
}

export default function CustomerPayments() {
    const { page, filters, setPage, set } = useListParams(['tab'] as const);
    const tab = filters.tab === 'invoices' ? 'invoices' : 'payments';
    const [invoiceId, setInvoiceId] = useState<number | null>(null);
    const payments = useQuery({
        queryKey: ['payments', 'mine', page],
        queryFn: () => api.get<Paged<PaymentRow> & { summary: { collected: number; pending: number; refunded: number; failed: number } }>('/api/payments', { page, pageSize: 20 }),
        enabled: tab === 'payments',
        placeholderData: (p) => p,
    });
    const invoices = useQuery({
        queryKey: ['invoices', 'mine', page],
        queryFn: () => api.get<Paged<InvoiceRow>>('/api/invoices', { page, pageSize: 20 }),
        enabled: tab === 'invoices',
        placeholderData: (p) => p,
    });

    return (
        <div>
            <PageHeader title="Payments & invoices" subtitle="Every payment is verified by the studio's server before it is marked successful." />
            {payments.data && tab === 'payments' && (
                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <StatCard label="Total paid" value={money(payments.data.summary.collected)} tone="emerald" />
                    <StatCard label="Refunded" value={money(payments.data.summary.refunded)} tone="violet" />
                    <StatCard label="Failed attempts" value={payments.data.summary.failed ?? 0} tone="stone" />
                </div>
            )}
            <Card padded={false}>
                <div className="px-4 pt-2">
                    <Tabs
                        value={tab}
                        onChange={(v) => set({ tab: v === 'invoices' ? 'invoices' : null })}
                        tabs={[
                            { value: 'payments', label: 'Payments' },
                            { value: 'invoices', label: 'Invoices' },
                        ]}
                    />
                </div>
                {tab === 'payments' ? (
                    <QueryState query={payments}>
                        {(d) => (
                            <>
                                <DataTable
                                    rows={d.items}
                                    rowKey={(r) => r.id}
                                    empty={<EmptyState title="No payments yet" />}
                                    columns={[
                                        { key: 'no', header: 'Payment', cell: (r) => <span className="font-medium text-stone-900">{r.payment_no}</span> },
                                        { key: 'for', header: 'For', cell: (r) => `${titleCase(r.purpose)}${r.booking_no ? ` · ${r.booking_no}` : r.order_no ? ` · ${r.order_no}` : ''}` },
                                        { key: 'date', header: 'Date', cell: (r) => dateTime(r.paid_at ?? r.created_at), hideOnMobile: true },
                                        { key: 'method', header: 'Method', cell: (r) => titleCase(r.method ?? r.provider), hideOnMobile: true },
                                        { key: 'amount', header: 'Amount', cell: (r) => (r.refunded_amount ? `${money(r.amount)} (−${money(r.refunded_amount)})` : money(r.amount)) },
                                        { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                        {
                                            key: 'invoice',
                                            header: '',
                                            cell: (r) =>
                                                r.invoice_id ? (
                                                    <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setInvoiceId(r.invoice_id)}>
                                                        Invoice
                                                    </button>
                                                ) : r.failure_reason ? (
                                                    <span className="text-xs text-red-600">{r.failure_reason}</span>
                                                ) : null,
                                        },
                                    ]}
                                />
                                <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                            </>
                        )}
                    </QueryState>
                ) : (
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
                                        { key: 'desc', header: 'Description', cell: (r) => r.description },
                                        { key: 'date', header: 'Issued', cell: (r) => dateTime(r.issued_at), hideOnMobile: true },
                                        { key: 'total', header: 'Total', cell: (r) => money(r.total) },
                                    ]}
                                />
                                <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                            </>
                        )}
                    </QueryState>
                )}
            </Card>
            <InvoiceModal id={invoiceId} onClose={() => setInvoiceId(null)} />
        </div>
    );
}
