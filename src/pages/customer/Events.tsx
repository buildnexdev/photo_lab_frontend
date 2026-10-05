import { useMutation, useQuery } from '@tanstack/react-query';
import { BookOpen, Calendar, Images, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { AddressFields, addressPayload, emptyAddress, validateAddress, type AddressValue } from '../../components/AddressFields';
import { EmptyState, QueryState, StatusBadge } from '../../components/data';
import { Input, Textarea } from '../../components/form';
import { Drawer, Modal } from '../../components/overlay';
import { ProofViewer } from '../../components/ProofViewer';
import { useToast } from '../../components/toast';
import { usePayment } from '../../components/usePayment';
import { Alert, Button, ButtonLink, Card, PageHeader } from '../../components/ui';
import { api, ApiError, errorMessage, type Paged } from '../../lib/api';
import { date, dateTime, relative, time } from '../../lib/format';
import { useInvalidate, useOpenParam } from '../../lib/hooks';
import type { EventRow, Proof, ProofDetail } from '../../lib/types';

export default function CustomerEvents() {
    const [proofId, setProofId] = useOpenParam('proof');
    const [albumFor, setAlbumFor] = useState<EventRow | null>(null);
    const events = useQuery({ queryKey: ['events', 'mine'], queryFn: () => api.get<Paged<EventRow>>('/api/events', { pageSize: 100, sort: 'date', order: 'desc' }) });
    const proofs = useQuery({ queryKey: ['proofs', 'mine'], queryFn: () => api.get<Paged<Proof>>('/api/proofs', { pageSize: 50 }) });

    return (
        <div className="space-y-6">
            <PageHeader title="Events & albums" subtitle="Your shoots, galleries and album designs." />
            {proofs.data && proofs.data.items.some((p) => p.status === 'SENT') && (
                <Alert tone="info" title="Album design waiting for you">
                    Review the pages and approve, or tell the designer what to change.
                </Alert>
            )}
            <Card title="Album proofs" padded={false}>
                <QueryState query={proofs} isEmpty={(d) => !d.items.length} empty={<EmptyState icon={<BookOpen className="size-10" />} title="No album designs yet" description="Once you submit your photo selection, the designer will share the album here." />}>
                    {(d) => (
                        <ul className="divide-y divide-stone-100">
                            {d.items.map((p) => (
                                <li key={p.id}>
                                    <button type="button" onClick={() => setProofId(p.id)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-stone-50 sm:px-5">
                                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-stone-100">{p.cover_url && <img src={p.cover_url} alt="" draggable={false} className="protected-img size-full object-cover" />}</div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium">
                                                {p.title} <span className="text-stone-500">v{p.version}</span>
                                            </p>
                                            <p className="text-xs text-stone-500">
                                                {p.event_title} · {p.page_count} pages · {relative(p.sent_at ?? p.created_at)}
                                            </p>
                                        </div>
                                        <StatusBadge status={p.status} label={p.status === 'SENT' ? 'Awaiting your review' : undefined} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </QueryState>
            </Card>

            <QueryState query={events} isEmpty={(d) => !d.items.length} empty={<EmptyState icon={<Calendar className="size-10" />} title="No events yet" description="Events appear here once your booking is confirmed." action={<ButtonLink to="/customer/bookings?new=1">Book a shoot</ButtonLink>} />}>
                {(d) => (
                    <div className="grid gap-4 md:grid-cols-2">
                        {d.items.map((e) => (
                            <div key={e.id} className="card flex flex-col p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-lg font-semibold">{e.title}</p>
                                        <p className="text-xs text-stone-500">{e.event_code}</p>
                                    </div>
                                    <StatusBadge status={e.status} />
                                </div>
                                <div className="mt-3 space-y-1 text-sm text-stone-600">
                                    <p className="flex items-center gap-2">
                                        <Calendar className="size-4 text-stone-400" /> {date(e.event_date)}
                                        {e.start_time && ` · ${time(e.start_time)}`}
                                    </p>
                                    {e.venue && (
                                        <p className="flex items-center gap-2">
                                            <MapPin className="size-4 text-stone-400" /> {e.venue}
                                        </p>
                                    )}
                                    <p className="flex items-center gap-2">
                                        <Images className="size-4 text-stone-400" /> {e.photo_count} photos
                                    </p>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                                    {e.gallery_id && e.gallery_status && e.gallery_status !== 'DRAFT' && (
                                        <ButtonLink to={`/customer/galleries/${e.gallery_id}`} size="sm">
                                            Open gallery
                                        </ButtonLink>
                                    )}
                                    {e.status !== 'CANCELLED' && e.photo_count > 0 && (
                                        <Button size="sm" variant="secondary" onClick={() => setAlbumFor(e)}>
                                            Order printed album
                                        </Button>
                                    )}
                                    {(!e.gallery_status || e.gallery_status === 'DRAFT') && e.status !== 'CANCELLED' && <p className="text-xs text-stone-500">Your gallery opens here once the studio shares it.</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </QueryState>
            <ProofDrawer id={proofId} onClose={() => setProofId(null)} />
            <AlbumOrderModal event={albumFor} onClose={() => setAlbumFor(null)} />
        </div>
    );
}

function ProofDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [mode, setMode] = useState<'view' | 'revise'>('view');
    const [notes, setNotes] = useState('');
    const [pageRefs, setPageRefs] = useState('');
    const [notesError, setNotesError] = useState('');
    const q = useQuery({ queryKey: ['proofs', 'detail', id], queryFn: () => api.get<ProofDetail>(`/api/proofs/${id}`), enabled: !!id });
    const respond = useMutation({
        mutationFn: (decision: 'APPROVE' | 'REVISION') => api.send('POST', `/api/proofs/${id}/respond`, { decision, notes: decision === 'REVISION' ? notes.trim() : null, pageRefs: pageRefs.trim() || null }),
        onSuccess: (r) => {
            toast.success(r.message);
            setMode('view');
            setNotes('');
            setPageRefs('');
            invalidate(['proofs'], ['portal']);
        },
        onError: (e) => toast.error(e),
    });
    const sendRevision = () => {
        if (notes.trim().length < 5) return setNotesError('Describe the changes you would like (at least 5 characters).');
        setNotesError('');
        respond.mutate('REVISION');
    };
    return (
        <Drawer open={!!id} onClose={onClose} width="max-w-3xl" title={q.data ? `${q.data.title} · v${q.data.version}` : 'Album proof'}>
            <QueryState query={q}>
                {(p) => (
                    <div className="space-y-5">
                        <div className="flex items-center gap-2">
                            <StatusBadge status={p.status} />
                            {p.sent_at && <span className="text-xs text-stone-500">Shared {dateTime(p.sent_at)}</span>}
                        </div>
                        <ProofViewer pages={p.pages} />
                        {p.can_respond &&
                            (mode === 'view' ? (
                                <div className="flex flex-wrap justify-end gap-2">
                                    <Button variant="secondary" onClick={() => setMode('revise')}>
                                        Request changes
                                    </Button>
                                    <Button variant="success" loading={respond.isPending} onClick={() => respond.mutate('APPROVE')}>
                                        Approve album for printing
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3 rounded-xl border border-stone-200 p-4">
                                    <Textarea label="What should change?" required rows={4} maxLength={3000} value={notes} onChange={(e) => setNotes(e.target.value)} error={notesError} placeholder="e.g. Replace the photo on page 4 with one from the reception, make page 10 brighter…" />
                                    <Input label="Pages (optional)" value={pageRefs} onChange={(e) => setPageRefs(e.target.value)} maxLength={255} placeholder="e.g. 4, 10-12" />
                                    <div className="flex justify-end gap-2">
                                        <Button variant="secondary" onClick={() => setMode('view')}>
                                            Back
                                        </Button>
                                        <Button loading={respond.isPending} onClick={sendRevision}>
                                            Send to designer
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        {p.status === 'APPROVED' && <Alert tone="success">You approved this design{p.approved_at ? ` on ${date(p.approved_at)}` : ''}. It is now with the print team.</Alert>}
                        {p.revisions.length > 0 && (
                            <div>
                                <p className="mb-2 font-semibold">Change requests</p>
                                <ul className="space-y-2">
                                    {p.revisions.map((r) => (
                                        <li key={r.id} className="rounded-lg bg-stone-50 p-3 text-sm">
                                            <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                                                <span>
                                                    {relative(r.created_at)}
                                                    {r.page_refs && ` · pages ${r.page_refs}`}
                                                </span>
                                                <StatusBadge status={r.status} />
                                            </div>
                                            <p className="mt-1 whitespace-pre-wrap">{r.notes}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </QueryState>
        </Drawer>
    );
}

function AlbumOrderModal({ event, onClose }: { event: EventRow | null; onClose: () => void }) {
    const toast = useToast();
    const { pay, busy, dialog } = usePayment();
    const [delivery, setDelivery] = useState<'PICKUP' | 'COURIER'>('PICKUP');
    const [address, setAddress] = useState<AddressValue>(emptyAddress);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [coupon, setCoupon] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!event) return;
        setError('');
        if (delivery === 'COURIER') {
            const e = validateAddress(address);
            setErrors(e);
            if (Object.keys(e).length) return;
        }
        setSaving(true);
        try {
            const order = await api.post<{ id: number }>('/api/orders', {
                type: 'ALBUM',
                eventId: event.id,
                deliveryMethod: delivery,
                shippingAddress: delivery === 'COURIER' ? addressPayload(address) : null,
                couponCode: coupon.trim() || null,
            });
            onClose();
            if (await pay({ orderId: order.id })) toast.info('Your album order is placed. The designer will share proofs for approval.');
        } catch (e) {
            if (e instanceof ApiError && e.errors.length) setErrors(Object.fromEntries(e.errors.map((fe) => [fe.field.replace(/^shippingAddress\./, ''), fe.message])));
            setError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Modal
                open={!!event}
                onClose={onClose}
                title="Order a printed album"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button loading={saving || busy} onClick={submit}>
                            Continue to payment
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-stone-600">
                        A professionally designed, printed album for <strong>{event?.title}</strong>. The studio's current album price applies (shown at checkout). If your package already includes an album, you don't need to order one.
                    </p>
                    {error && <Alert tone="error">{error}</Alert>}
                    <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2">
                            <input type="radio" checked={delivery === 'PICKUP'} onChange={() => setDelivery('PICKUP')} className="accent-brand-700" /> Pick up at studio
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" checked={delivery === 'COURIER'} onChange={() => setDelivery('COURIER')} className="accent-brand-700" /> Courier delivery
                        </label>
                    </div>
                    {delivery === 'COURIER' && <AddressFields value={address} onChange={setAddress} errors={errors} />}
                    <Input label="Coupon code" wrapperClassName="max-w-xs" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} maxLength={40} />
                    <p className="text-xs text-stone-500">
                        Need something else? <Link to="/contact" className="link">Contact the studio</Link>.
                    </p>
                </div>
            </Modal>
            {dialog}
        </>
    );
}
