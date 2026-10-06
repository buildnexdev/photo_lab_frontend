// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import { date, dateTime, money, parseJson, titleCase } from '../lib/format';
import { formatAddress, ORDER_TYPE_LABELS, type OrderDetail, type PaymentLine, type Quotation } from '../lib/types';
import { QueryState, StatusBadge } from './data';
import { Modal } from './overlay';
import { Button } from './ui';

export function TotalsRow({ label, value, strong, className }: { label: ReactNode; value: ReactNode; strong?: boolean; className?: string }) {
    return (
        <div className={`flex justify-between gap-4 ${strong ? 'font-semibold text-stone-900' : 'text-stone-600'} ${className ?? ''}`}>
            <span>{label}</span>
            <span className="tabular-nums">{value}</span>
        </div>
    );
}

export function QuotationView({ q }: { q: Quotation }) {
    return (
        <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-stone-900">
                    Quotation {q.quotation_no} <StatusBadge status={q.status} className="ml-1" />
                </p>
                <p className="text-xs text-stone-500">
                    {q.sent_at ? `Sent ${date(q.sent_at)}` : `Created ${date(q.created_at)}`}
                    {q.valid_until && ` · valid until ${date(q.valid_until)}`}
                </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="min-w-full text-sm">
                    <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                        <tr>
                            <th className="px-3 py-2 text-left">Item</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Rate</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {q.items.map((i) => (
                            <tr key={i.id}>
                                <td className="px-3 py-2">{i.description}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{i.quantity}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{money(i.unit_price)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{money(i.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="ml-auto max-w-xs space-y-1">
                <TotalsRow label="Subtotal" value={money(q.subtotal)} />
                {q.discount > 0 && <TotalsRow label="Discount" value={`− ${money(q.discount)}`} />}
                <TotalsRow label={`GST (${Number(q.tax_percent)}%)`} value={money(q.tax)} />
                <TotalsRow label="Total" value={money(q.total)} strong className="border-t border-stone-200 pt-1" />
                <TotalsRow label="Advance to confirm" value={money(q.advance_amount)} />
            </div>
            {q.notes && <p className="whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-stone-700">{q.notes}</p>}
            {q.terms && (
                <details className="text-xs text-stone-500">
                    <summary className="cursor-pointer font-medium">Terms & conditions</summary>
                    <p className="mt-2 whitespace-pre-wrap">{q.terms}</p>
                </details>
            )}
        </div>
    );
}

export function PaymentList({ payments, onInvoice }: { payments: (PaymentLine & { invoice_id?: number | null })[]; onInvoice?: (id: number) => void }) {
    if (!payments.length) return <p className="text-sm text-stone-500">No payments yet.</p>;
    return (
        <ul className="divide-y divide-stone-100 text-sm">
            {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                        <p className="font-medium text-stone-800">
                            {p.payment_no} {p.purpose && <span className="font-normal text-stone-500">· {titleCase(p.purpose)}</span>}
                        </p>
                        <p className="text-xs text-stone-500">
                            {dateTime(p.paid_at ?? p.created_at)} · {p.method ? titleCase(p.method) : titleCase(p.provider)}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="tabular-nums">{money(p.amount)}</span>
                        <StatusBadge status={p.status} />
                        {onInvoice && p.invoice_id && (
                            <button type="button" className="text-xs font-medium text-brand-700 hover:underline" onClick={() => onInvoice(p.invoice_id!)}>
                                Invoice
                            </button>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

export function OrderBody({ order, onInvoice }: { order: OrderDetail; onInvoice?: (id: number) => void }) {
    const address = formatAddress(order.shipping_address ?? order.delivery?.address);
    return (
        <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status} />
                <span className="text-stone-500">
                    {ORDER_TYPE_LABELS[order.type]} · placed {dateTime(order.created_at)}
                    {order.event_title && ` · ${order.event_title}`}
                </span>
            </div>
            <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
                {order.items.map((i) => (
                    <li key={i.id} className="flex items-center gap-3 p-3">
                        {i.thumb_url ? <img src={i.thumb_url} alt="" draggable={false} className="protected-img size-12 shrink-0 rounded object-cover" /> : <span className="size-12 shrink-0 rounded bg-stone-100" />}
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-stone-800">{i.description}</p>
                            <p className="text-xs text-stone-500">
                                {i.quantity} × {money(i.unit_price)}
                            </p>
                        </div>
                        <span className="tabular-nums">{money(i.total)}</span>
                    </li>
                ))}
            </ul>
            <div className="ml-auto max-w-xs space-y-1">
                <TotalsRow label="Subtotal" value={money(order.subtotal)} />
                {order.discount > 0 && <TotalsRow label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`} value={`− ${money(order.discount)}`} />}
                <TotalsRow label="Total (incl. GST)" value={money(order.total)} strong className="border-t border-stone-200 pt-1" />
                <TotalsRow label="of which GST" value={money(order.tax)} />
            </div>
            {order.delivery_method !== 'DIGITAL' && (
                <div className="rounded-lg bg-stone-50 p-3">
                    <p className="font-medium text-stone-800">
                        {order.delivery_method === 'COURIER' ? 'Courier delivery' : 'Pick up at studio'} {order.delivery && <StatusBadge status={order.delivery.status} className="ml-1" />}
                    </p>
                    {address && <p className="mt-1 whitespace-pre-line text-stone-600">{address}</p>}
                    {order.delivery?.courier && (
                        <p className="mt-1 text-stone-600">
                            {order.delivery.courier}
                            {order.delivery.tracking_no && ` · Tracking ${order.delivery.tracking_no}`}
                        </p>
                    )}
                </div>
            )}
            {order.prints.length > 0 && (
                <div>
                    <p className="mb-2 font-medium text-stone-800">Production</p>
                    <ul className="space-y-1">
                        {order.prints.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-2 text-stone-600">
                                <span>
                                    {titleCase(p.kind)} {p.size} × {p.quantity}
                                </span>
                                <StatusBadge status={p.status} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {order.notes && <p className="whitespace-pre-wrap text-stone-600">Note: {order.notes}</p>}
            <div>
                <p className="mb-1 font-medium text-stone-800">Payments</p>
                <PaymentList payments={order.payments} />
                {order.invoice && onInvoice && (
                    <Button size="sm" variant="secondary" className="mt-2" onClick={() => onInvoice(order.invoice!.id)}>
                        View invoice {order.invoice.invoice_no}
                    </Button>
                )}
            </div>
        </div>
    );
}

interface Invoice {
    id: number;
    invoice_no: string;
    description: string;
    subtotal: number;
    tax: number;
    total: number;
    line_items: string | { description: string; quantity: number; unit_price: number; total: number }[] | null;
    issued_at: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    customer_address: string | null;
    customer_city: string | null;
    payment_no: string;
    purpose: string;
    method: string | null;
    provider: string;
    provider_payment_id: string | null;
    paid_at: string | null;
    order_no: string | null;
    booking_no: string | null;
    taxPercent: number;
    studio: { name: string; address: string; city: string; phone: string; email: string; gstin: string };
}

/** Printable tax invoice. Uses the browser's print dialog (Save as PDF works everywhere). */
export function InvoiceModal({ id, onClose }: { id: number | null; onClose: () => void }) {
    const q = useQuery({ queryKey: ['invoice', id], queryFn: () => api.get<Invoice>(`/api/invoices/${id}`), enabled: !!id });
    return (
        <Modal
            open={!!id}
            onClose={onClose}
            title="Invoice"
            size="lg"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Close
                    </Button>
                    <Button icon={<Printer className="size-4" />} disabled={!q.data} onClick={() => window.print()}>
                        Print / Save PDF
                    </Button>
                </>
            }
        >
            <QueryState query={q}>
                {(inv) => {
                    const lines = parseJson<{ description: string; quantity: number; unit_price: number; total: number }[]>(inv.line_items, []);
                    return (
                        <div className="print-area space-y-5 text-sm text-stone-800">
                            <div className="flex flex-wrap justify-between gap-4">
                                <div>
                                    <p className="text-lg font-semibold">{inv.studio.name}</p>
                                    <p className="whitespace-pre-line text-stone-600">{[inv.studio.address, inv.studio.city].filter(Boolean).join(', ')}</p>
                                    <p className="text-stone-600">{[inv.studio.phone, inv.studio.email].filter(Boolean).join(' · ')}</p>
                                    {inv.studio.gstin && <p className="text-stone-600">GSTIN: {inv.studio.gstin}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-semibold">TAX INVOICE</p>
                                    <p>{inv.invoice_no}</p>
                                    <p className="text-stone-600">Issued {date(inv.issued_at)}</p>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase text-stone-500">Billed to</p>
                                    <p className="font-medium">{inv.customer_name}</p>
                                    <p className="text-stone-600">{[inv.customer_address, inv.customer_city].filter(Boolean).join(', ')}</p>
                                    <p className="text-stone-600">{[inv.customer_phone, inv.customer_email].filter(Boolean).join(' · ')}</p>
                                </div>
                                <div className="sm:text-right">
                                    <p className="text-xs font-semibold uppercase text-stone-500">Payment</p>
                                    <p>{inv.payment_no}</p>
                                    <p className="text-stone-600">
                                        {titleCase(inv.purpose)} · {inv.method ? titleCase(inv.method) : titleCase(inv.provider)}
                                    </p>
                                    {inv.provider_payment_id && <p className="text-xs text-stone-500">Ref {inv.provider_payment_id}</p>}
                                    {(inv.booking_no || inv.order_no) && <p className="text-stone-600">{inv.booking_no ? `Booking ${inv.booking_no}` : `Order ${inv.order_no}`}</p>}
                                </div>
                            </div>
                            <table className="min-w-full border-y border-stone-200 text-sm">
                                <thead className="text-xs uppercase text-stone-500">
                                    <tr>
                                        <th className="py-2 text-left">Description</th>
                                        <th className="py-2 text-right">Qty</th>
                                        <th className="py-2 text-right">Rate</th>
                                        <th className="py-2 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {(lines.length ? lines : [{ description: inv.description, quantity: 1, unit_price: inv.total, total: inv.total }]).map((l, i) => (
                                        <tr key={i}>
                                            <td className="py-2">{l.description}</td>
                                            <td className="py-2 text-right">{l.quantity}</td>
                                            <td className="py-2 text-right">{money(Number(l.unit_price))}</td>
                                            <td className="py-2 text-right">{money(Number(l.total))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="ml-auto max-w-xs space-y-1">
                                <TotalsRow label="Taxable value" value={money(inv.subtotal)} />
                                <TotalsRow label={`CGST (${inv.taxPercent / 2}%)`} value={money(Math.floor(inv.tax / 2))} />
                                <TotalsRow label={`SGST (${inv.taxPercent / 2}%)`} value={money(inv.tax - Math.floor(inv.tax / 2))} />
                                <TotalsRow label="Total paid" value={money(inv.total)} strong className="border-t border-stone-200 pt-1" />
                            </div>
                            <p className="text-xs text-stone-500">Prices are inclusive of GST. This is a computer-generated invoice.</p>
                        </div>
                    );
                }}
            </QueryState>
        </Modal>
    );
}
