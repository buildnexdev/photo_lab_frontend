// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useEffect, useMemo, useState } from 'react';
import { AddressFields, addressPayload, emptyAddress, validateAddress, type AddressValue } from '../../components/AddressFields';
import { FormGrid, Input, Select } from '../../components/form';
import { Modal } from '../../components/overlay';
import { Alert, Button } from '../../components/ui';
import { api, ApiError, errorMessage } from '../../lib/api';
import { money } from '../../lib/format';
import type { GalleryInfo, GalleryPhoto } from './types';

type Kind = 'PRINT' | 'FRAME' | 'CANVAS';
interface Line {
    photoId: number;
    size: string;
    quantity: number;
}

/** Order prints / frames / canvas for chosen photos. Prices shown are estimates; the server prices the order. */
export function PrintOrderModal({
    open,
    onClose,
    info,
    photos,
    headers,
    onCreated,
}: {
    open: boolean;
    onClose: () => void;
    info: GalleryInfo;
    photos: GalleryPhoto[];
    headers?: Record<string, string>;
    onCreated: (orderId: number) => void;
}) {
    const [kind, setKind] = useState<Kind>('PRINT');
    const [lines, setLines] = useState<Line[]>([]);
    const [delivery, setDelivery] = useState<'PICKUP' | 'COURIER'>('PICKUP');
    const [address, setAddress] = useState<AddressValue>(emptyAddress);
    const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});
    const [coupon, setCoupon] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const table = kind === 'PRINT' ? info.pricing.prints : kind === 'FRAME' ? info.pricing.frames : info.pricing.canvas;
    const sizes = Object.keys(table);

    useEffect(() => {
        if (!open) return;
        const first = Object.keys(table)[0] ?? '';
        setLines(photos.map((p) => ({ photoId: p.id, size: first, quantity: 1 })));
        setError('');
    }, [open, photos, table]);

    const subtotal = useMemo(() => lines.reduce((s, l) => s + (table[l.size] ?? 0) * l.quantity, 0), [lines, table]);
    const fee = delivery === 'COURIER' ? info.pricing.courierFee : 0;

    const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

    const submit = async () => {
        setError('');
        if (!lines.length) return setError('Choose at least one photo.');
        if (lines.some((l) => !(l.size in table))) return setError('Choose a size for every photo.');
        if (delivery === 'COURIER') {
            const e = validateAddress(address);
            setAddrErrors(e);
            if (Object.keys(e).length) return;
        }
        setSaving(true);
        try {
            const order = await api.post<{ id: number }>(
                `/api/gallery/${info.id}/orders`,
                {
                    type: kind,
                    items: lines,
                    deliveryMethod: delivery,
                    shippingAddress: delivery === 'COURIER' ? addressPayload(address) : null,
                    couponCode: coupon.trim() || null,
                    notes: notes.trim() || null,
                },
                headers,
            );
            onCreated(order.id);
        } catch (e) {
            if (e instanceof ApiError && e.errors.length) setAddrErrors(Object.fromEntries(e.errors.map((fe) => [fe.field.replace(/^shippingAddress\./, ''), fe.message])));
            setError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Order prints"
            size="lg"
            dismissible={!saving}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} loading={saving} disabled={!sizes.length || !lines.length}>
                        Continue to payment
                    </Button>
                </>
            }
        >
            <div className="space-y-5">
                {error && <Alert tone="error">{error}</Alert>}
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Product">
                    {(['PRINT', 'FRAME', 'CANVAS'] as Kind[]).map((k) => (
                        <button
                            key={k}
                            type="button"
                            role="radio"
                            aria-checked={kind === k}
                            onClick={() => setKind(k)}
                            className={`rounded-lg border px-4 py-2 text-sm font-medium ${kind === k ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-stone-300 text-stone-700 hover:bg-stone-50'}`}
                        >
                            {k === 'PRINT' ? 'Prints' : k === 'FRAME' ? 'Framed prints' : 'Canvas'}
                        </button>
                    ))}
                </div>
                {!sizes.length ? (
                    <Alert tone="warning">This product is not available right now.</Alert>
                ) : (
                    <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
                        {lines.map((l, i) => {
                            const p = photos.find((x) => x.id === l.photoId);
                            return (
                                <li key={l.photoId} className="flex flex-wrap items-center gap-3 p-3">
                                    {p && <img src={p.thumb_url} alt="" draggable={false} className="protected-img size-14 rounded object-cover" />}
                                    <div className="flex flex-1 flex-wrap items-end gap-3">
                                        <Select label="Size" wrapperClassName="w-40" value={l.size} onChange={(e) => update(i, { size: e.target.value })} options={sizes.map((s) => ({ value: s, label: `${s} · ${money(table[s])}` }))} />
                                        <Input label="Qty" type="number" min={1} max={50} wrapperClassName="w-20" value={l.quantity} onChange={(e) => update(i, { quantity: Math.max(1, Math.min(50, Math.trunc(Number(e.target.value)) || 1)) })} />
                                    </div>
                                    <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                                        Remove
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <fieldset>
                    <legend className="mb-2 text-sm font-medium text-stone-700">Delivery</legend>
                    <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2">
                            <input type="radio" checked={delivery === 'PICKUP'} onChange={() => setDelivery('PICKUP')} className="accent-brand-700" /> Pick up at studio
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" checked={delivery === 'COURIER'} onChange={() => setDelivery('COURIER')} className="accent-brand-700" /> Courier ({money(info.pricing.courierFee)})
                        </label>
                    </div>
                </fieldset>
                {delivery === 'COURIER' && <AddressFields value={address} onChange={setAddress} errors={addrErrors} />}
                <FormGrid>
                    <Input label="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} maxLength={40} />
                    <Input label="Notes for the studio" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
                </FormGrid>
                <div className="rounded-lg bg-stone-50 p-3 text-sm">
                    <div className="flex justify-between">
                        <span>Items</span>
                        <span>{money(subtotal)}</span>
                    </div>
                    {fee > 0 && (
                        <div className="flex justify-between">
                            <span>Courier</span>
                            <span>{money(fee)}</span>
                        </div>
                    )}
                    <div className="mt-1 flex justify-between border-t border-stone-200 pt-1 font-semibold">
                        <span>Estimated total</span>
                        <span>{money(subtotal + fee)}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">Prices include GST. Coupons are applied and the final amount is confirmed at checkout.</p>
                </div>
            </div>
        </Modal>
    );
}
