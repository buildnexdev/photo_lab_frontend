// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable, EmptyState, Pagination, QueryState, StatusBadge } from '../../components/data';
import { InvoiceModal, OrderBody } from '../../components/domain';
import { Input, Select } from '../../components/form';
import { Drawer, Modal, useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { usePayment } from '../../components/usePayment';
import { Alert, Button, ButtonLink, Card, PageHeader } from '../../components/ui';
import { api, errorMessage, type Paged } from '../../lib/api';
import { date, money, titleCase } from '../../lib/format';
import { useInvalidate, useListParams, useOpenParam } from '../../lib/hooks';
import { useSite } from '../../lib/site';
import { ORDER_STATUSES, ORDER_TYPE_LABELS, ORDER_TYPES, type EventRow, type OrderDetail, type OrderRow } from '../../lib/types';

export default function CustomerOrders() {
    const { page, filters, setPage, setFilter } = useListParams(['status', 'type'] as const);
    const [openId, setOpenId] = useOpenParam();
    const [buying, setBuying] = useState(false);
    const q = useQuery({
        queryKey: ['orders', 'mine', page, filters],
        queryFn: () => api.get<Paged<OrderRow>>('/api/orders', { page, pageSize: 20, status: filters.status, type: filters.type }),
        placeholderData: (p) => p,
    });
    return (
        <div>
            <PageHeader title="My orders" subtitle="HD downloads, prints, frames, albums and packages." actions={<Button variant="secondary" onClick={() => setBuying(true)}>Buy a package</Button>} />
            <Card padded={false}>
                <div className="flex flex-wrap gap-3 border-b border-stone-100 p-4">
                    <Select wrapperClassName="w-44" aria-label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="All statuses" options={ORDER_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                    <Select wrapperClassName="w-44" aria-label="Type" value={filters.type} onChange={(e) => setFilter('type', e.target.value)} placeholder="All types" options={ORDER_TYPES.map((t) => ({ value: t, label: ORDER_TYPE_LABELS[t] }))} />
                </div>
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                onRowClick={(r) => setOpenId(r.id)}
                                empty={<EmptyState title="No orders yet" description="Open a gallery to buy HD photos or order prints." action={<ButtonLink to="/customer/galleries">My galleries</ButtonLink>} />}
                                columns={[
                                    { key: 'no', header: 'Order', cell: (r) => <span className="font-medium text-stone-900">{r.order_no}</span> },
                                    { key: 'type', header: 'Type', cell: (r) => ORDER_TYPE_LABELS[r.type] },
                                    { key: 'event', header: 'Event', cell: (r) => r.event_title ?? '—', hideOnMobile: true },
                                    { key: 'date', header: 'Date', cell: (r) => date(r.created_at), hideOnMobile: true },
                                    { key: 'total', header: 'Total', cell: (r) => money(r.total) },
                                    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} label={r.status === 'CREATED' ? 'Awaiting payment' : undefined} /> },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
            <OrderDrawer id={openId} onClose={() => setOpenId(null)} />
            <PackageOrderModal open={buying} onClose={() => setBuying(false)} onCreated={(id) => (setBuying(false), setOpenId(id))} />
        </div>
    );
}

function PackageOrderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
    const site = useSite();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { pay, busy, dialog } = usePayment();
    const events = useQuery({ queryKey: ['events', 'mine'], queryFn: () => api.get<Paged<EventRow>>('/api/events', { pageSize: 100, sort: 'date', order: 'desc' }), enabled: open });
    const [packageId, setPackageId] = useState('');
    const [eventId, setEventId] = useState('');
    const [coupon, setCoupon] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const pkg = site.data?.packages.find((p) => String(p.id) === packageId);

    const submit = async () => {
        if (!packageId) return setError('Choose a package.');
        setError('');
        setSaving(true);
        try {
            const order = await api.post<{ id: number }>('/api/orders', { type: 'PACKAGE', packageId: Number(packageId), eventId: eventId ? Number(eventId) : undefined, couponCode: coupon.trim() || null });
            await invalidate(['orders']);
            onCreated(order.id);
            await pay({ orderId: order.id });
        } catch (e) {
            setError(errorMessage(e));
            toast.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Modal
                open={open}
                onClose={onClose}
                title="Buy a package"
                footer={
                    <>
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button loading={saving || busy} onClick={submit}>
                            {pkg ? `Pay ${money(pkg.price)}` : 'Continue'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {error && <Alert tone="error">{error}</Alert>}
                    <Select label="Package" required value={packageId} onChange={(e) => setPackageId(e.target.value)} placeholder="Choose a package" options={(site.data?.packages ?? []).map((p) => ({ value: p.id, label: `${p.name} · ${money(p.price, true)}` }))} />
                    {pkg?.description && <p className="text-sm text-stone-600">{pkg.description}</p>}
                    <Select label="For event (optional)" value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="Not linked to an event" options={(events.data?.items ?? []).map((ev) => ({ value: ev.id, label: `${ev.title} · ${date(ev.event_date)}` }))} hint="Link a digital package to an event to unlock its HD photos." />
                    <Input label="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} maxLength={40} />
                </div>
            </Modal>
            {dialog}
        </>
    );
}

function OrderDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const { pay, busy, dialog: payDialog } = usePayment();
    const [invoiceId, setInvoiceId] = useState<number | null>(null);
    const q = useQuery({ queryKey: ['orders', 'detail', id], queryFn: () => api.get<OrderDetail>(`/api/orders/${id}`), enabled: !!id });
    const cancel = useMutation({
        mutationFn: () => api.send('POST', `/api/orders/${id}/cancel`),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['orders'], ['portal']);
        },
        onError: (e) => toast.error(e),
    });
    return (
        <Drawer
            open={!!id}
            onClose={onClose}
            title={q.data ? `Order ${q.data.order_no}` : 'Order'}
            footer={
                q.data?.can_pay ? (
                    <>
                        <Button variant="ghost" className="text-red-600" loading={cancel.isPending} onClick={async () => (await ask({ title: 'Cancel this order?', message: 'This unpaid order will be cancelled.', confirmLabel: 'Cancel order' })) && cancel.mutate()}>
                            Cancel order
                        </Button>
                        <Button loading={busy} onClick={() => pay({ orderId: q.data!.id })}>
                            Pay {money(q.data.total)}
                        </Button>
                    </>
                ) : undefined
            }
        >
            <QueryState query={q}>{(o) => <OrderBody order={o} onInvoice={setInvoiceId} />}</QueryState>
            <InvoiceModal id={invoiceId} onClose={() => setInvoiceId(null)} />
            {dialog}
            {payDialog}
        </Drawer>
    );
}
