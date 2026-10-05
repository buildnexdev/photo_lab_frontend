import { useMutation, useQuery } from '@tanstack/react-query';
import { Printer, Truck, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { titleCase } from '../lib/format';
import { useInvalidate } from '../lib/hooks';
import type { OrderDetail, OrderStatus } from '../lib/types';
import { QueryState } from './data';
import { InvoiceModal, OrderBody } from './domain';
import { Textarea } from './form';
import { OfflinePaymentModal } from './OfflinePaymentModal';
import { Drawer, Modal } from './overlay';
import { useToast } from './toast';
import { Button } from './ui';

/** Mirrors the server's order status flow. */
const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
    CREATED: ['CANCELLED'],
    PAID: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['READY', 'CANCELLED'],
    READY: ['DELIVERED'],
    DELIVERED: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
};
const STATUS_ACTION: Partial<Record<OrderStatus, string>> = { PROCESSING: 'Start production', READY: 'Mark ready', DELIVERED: 'Mark delivered', COMPLETED: 'Complete', CANCELLED: 'Cancel order' };

/** Staff view of an order: items, payments, status changes and offline payment. */
export function OrderManageDrawer({ id, onClose, links = 'admin' }: { id: number | null; onClose: () => void; links?: 'admin' | 'delivery' }) {
    const { can } = useAuth();
    const invalidate = useInvalidate();
    const [invoiceId, setInvoiceId] = useState<number | null>(null);
    const [next, setNext] = useState<OrderStatus | null>(null);
    const [paying, setPaying] = useState(false);
    const q = useQuery({ queryKey: ['orders', 'detail', id], queryFn: () => api.get<OrderDetail>(`/api/orders/${id}`), enabled: !!id });
    const o = q.data;
    const due = o?.status === 'CREATED' ? Number(o.total) : 0;
    const canPay = !!o && due > 0 && can('payments.manage');
    const options = o && can('orders.manage', 'printing.manage', 'delivery.manage') ? ORDER_FLOW[o.status].filter((s) => s !== 'CANCELLED' || can('orders.manage')) : [];
    const base = links === 'admin' ? '/admin' : '/delivery';
    return (
        <Drawer
            open={!!id}
            onClose={onClose}
            title={o ? `Order ${o.order_no}` : 'Order'}
            width="max-w-2xl"
            footer={
                o && (options.length > 0 || canPay) ? (
                    <>
                        {options.includes('CANCELLED') && (
                            <Button variant="ghost" className="mr-auto text-red-600" onClick={() => setNext('CANCELLED')}>
                                Cancel order
                            </Button>
                        )}
                        {canPay && (
                            <Button variant="secondary" icon={<Wallet className="size-4" />} onClick={() => setPaying(true)}>
                                Record payment
                            </Button>
                        )}
                        {options
                            .filter((s) => s !== 'CANCELLED')
                            .map((s) => (
                                <Button key={s} onClick={() => setNext(s)}>
                                    {STATUS_ACTION[s] ?? titleCase(s)}
                                </Button>
                            ))}
                    </>
                ) : undefined
            }
        >
            <QueryState query={q}>
                {(order) => (
                    <div className="space-y-4">
                        {(order.prints.length > 0 || order.delivery) && (
                            <div className="flex flex-wrap gap-2">
                                {order.prints.length > 0 && (
                                    <Link to={`${base}/printing?search=${encodeURIComponent(order.order_no)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50">
                                        <Printer className="size-4" /> Print jobs
                                    </Link>
                                )}
                                {order.delivery && (
                                    <Link to={`${base}/${links === 'admin' ? 'delivery' : 'dispatch'}?search=${encodeURIComponent(order.order_no)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50">
                                        <Truck className="size-4" /> Delivery
                                    </Link>
                                )}
                            </div>
                        )}
                        <OrderBody order={order} onInvoice={can('payments.view', 'orders.view') ? setInvoiceId : undefined} />
                    </div>
                )}
            </QueryState>
            <InvoiceModal id={invoiceId} onClose={() => setInvoiceId(null)} />
            <OrderStatusModal orderId={id} status={next} onClose={() => setNext(null)} />
            <OfflinePaymentModal target={paying && id ? { orderId: id } : null} due={due} onClose={() => setPaying(false)} onSaved={() => (setPaying(false), invalidate(['orders']))} />
        </Drawer>
    );
}

function OrderStatusModal({ orderId, status, onClose }: { orderId: number | null; status: OrderStatus | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    useEffect(() => {
        if (status) (setNote(''), setError(''));
    }, [status]);
    const save = useMutation({
        mutationFn: () => api.send('PUT', `/api/orders/${orderId}/status`, { status, note: note.trim() || null }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['orders'], ['printing'], ['delivery'], ['reports']);
            onClose();
        },
        onError: (e) => toast.error(e),
    });
    const cancelling = status === 'CANCELLED';
    const submit = () => {
        if (cancelling && note.trim().length < 3) return setError('Give a reason (kept in the order notes)');
        save.mutate();
    };
    return (
        <Modal
            open={!!status}
            onClose={onClose}
            title={status ? (STATUS_ACTION[status] ?? titleCase(status)) : ''}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Back
                    </Button>
                    <Button variant={cancelling ? 'danger' : 'primary'} loading={save.isPending} onClick={submit}>
                        Confirm
                    </Button>
                </>
            }
        >
            <div className="space-y-3">
                {cancelling && <p className="text-sm text-stone-600">Cancelling a paid order does not refund it automatically. Issue the refund from Payments.</p>}
                {status === 'READY' && <p className="text-sm text-stone-600">All print jobs for this order must be marked ready first.</p>}
                <Textarea label={cancelling ? 'Reason' : 'Note (optional)'} required={cancelling} rows={3} value={note} onChange={(e) => (setNote(e.target.value), setError(''))} error={error} maxLength={255} />
            </div>
        </Modal>
    );
}
