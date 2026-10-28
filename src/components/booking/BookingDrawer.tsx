// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 25-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Banknote, CalendarDays, Check, ChevronLeft, ClipboardList, FileDown, FilePlus2, IndianRupee, Link2, MapPin, NotebookPen, Package, Pencil, Plus, QrCode, Send, Sparkles, Trash2, Users, UserCircle2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { api, applyFieldErrors, downloadAuthed } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useInvalidate } from '../../hooks';
import { EVENT_TYPES, bookingPayload } from '../../helpers/validation';
import { date, dateTime, money, time, titleCase, todayYmd } from '../../utils/format';
import { useSite } from '../../utils/site';
import type { BookingDetail, Quotation } from '../../types';
import { CustomerPicker, type CustomerOption } from '../customer/CustomerPicker';
import { PaymentList, QuotationView } from '../ui/Domain';
import { FormGrid, Input, Select, Textarea } from '../ui/Form';
import { Drawer, Modal, useConfirm } from '../ui/Overlay';
import { EmptyState, StatusBadge } from '../ui/Data';
import { OfflinePaymentModal } from '../payment/OfflinePaymentModal';
import { useToast } from '../ui/Toast';
import { Button, TimeInput12 } from '../ui';
import { Avatar } from '../staff/staffCommon';
import { QuotationBuilder } from './QuotationBuilder';

const schema = z
    .object({
            serviceId: z.string().optional(),
            packageId: z.string().optional(),
            quotedAmount: z.string().optional(),
            eventType: z.string().trim().min(2, 'Tell us the type of event').max(60),
            eventDate: z.string().min(1, 'Choose the event date'),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
            venue: z.string().trim().max(255).optional(),
            guests: z
                .string()
                .optional()
                .refine((v) => !v || (/^\d+$/.test(v) && Number(v) <= 100000), 'Enter a number'),
            message: z.string().trim().max(3000).optional(),
            internalNotes: z.string().max(3000).optional(),
        })
        .superRefine((v, ctx) => {
            if (v.startTime && v.endTime && v.endTime <= v.startTime) {
                ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time must be after the start time' });
            }
            if (!v.packageId) {
                const amt = (v.quotedAmount ?? '').trim();
                if (!amt) ctx.addIssue({ code: 'custom', path: ['quotedAmount'], message: 'Enter a custom quotation amount' });
                else if (!/^\d+(\.\d{1,2})?$/.test(amt) || Number(amt) <= 0) ctx.addIssue({ code: 'custom', path: ['quotedAmount'], message: 'Enter a valid amount' });
            }
        });

type Form = z.infer<typeof schema>;

const blank: Form = { eventType: '', eventDate: '', serviceId: '', packageId: '', quotedAmount: '', startTime: '', endTime: '', venue: '', guests: '', message: '', internalNotes: '' };
const toForm = (b: BookingDetail): Form => ({
    serviceId: b.service_id ? String(b.service_id) : '',
    packageId: b.package_id ? String(b.package_id) : '',
    quotedAmount: !b.package_id && b.total_amount ? String(Number(b.total_amount) / 100) : '',
    eventType: b.event_type,
    eventDate: b.event_date,
    startTime: b.start_time?.slice(0, 5) ?? '',
    endTime: b.end_time?.slice(0, 5) ?? '',
    venue: b.venue ?? '',
    guests: b.guests ? String(b.guests) : '',
    message: b.message ?? '',
    internalNotes: b.internal_notes ?? '',
});

const SECTIONS = [
    { title: 'Customer', hint: 'Who this booking is for', icon: UserCircle2, fields: [] as const },
    { title: 'Event', hint: 'Type, date, venue and guests', icon: CalendarDays, fields: ['eventType', 'eventDate', 'startTime', 'endTime', 'venue', 'guests'] as const },
    { title: 'Package', hint: 'Service and package', icon: Package, fields: ['serviceId', 'packageId', 'quotedAmount'] as const },
    { title: 'Notes', hint: 'Customer message and staff notes', icon: NotebookPen, fields: ['message', 'internalNotes'] as const },
    { title: 'Quotations', hint: 'Send and accept quotes', icon: ClipboardList, fields: [] as const },
    { title: 'Finance', hint: 'Payments and balance', icon: IndianRupee, fields: [] as const },
    { title: 'QR & links', hint: 'Upload links and codes', icon: QrCode, fields: [] as const },
    { title: 'Team', hint: 'Staff and equipment', icon: Users, fields: [] as const },
] as const;

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[var(--soft-shadow)]">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-stone-900">
                {icon}
                {title}
            </h3>
            {children}
        </div>
    );
}

function Stat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: ReactNode; tone: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-white p-3">
            <span className={clsx('flex size-9 shrink-0 items-center justify-center rounded-lg', tone)}>{icon}</span>
            <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</span>
                <span className="block truncate font-semibold text-stone-900">{value}</span>
            </span>
        </div>
    );
}

export function BookingDrawer({ id, onClose, onCreated, detailsOnly = false }: { id: number | 'new' | null; onClose: () => void; onCreated: (id: number) => void; detailsOnly?: boolean }) {
    const { can } = useAuth();
    const site = useSite();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const isNew = id === 'new';
    const manage = can('bookings.manage');
    const [step, setStep] = useState(0);
    const [customer, setCustomer] = useState<CustomerOption | null>(null);
    const [customerError, setCustomerError] = useState('');
    const [builder, setBuilder] = useState<{ q: Quotation | null } | null>(null);
    const [offline, setOffline] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [reason, setReason] = useState('');
    const detail = useQuery({ queryKey: ['bookings', 'detail', id], queryFn: () => api.get<BookingDetail>(`/api/bookings/${id}`), enabled: typeof id === 'number' });
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        setError,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: blank });
    const startTime = watch('startTime');
    const endTime = watch('endTime');

    useEffect(() => {
        setStep(isNew ? 0 : 1);
        setCustomer(null);
        setCustomerError('');
        setBuilder(null);
        setOffline(false);
        setCancelOpen(false);
        setReason('');
    }, [id, isNew]);
    useEffect(() => {
        if (isNew) reset(blank);
        else if (detail.data) reset(toForm(detail.data));
    }, [isNew, detail.data, reset]);

    const refresh = () => invalidate(['bookings'], ['reports']);
    const b = detail.data;
    const locked = !!b && ['COMPLETED', 'CANCELLED'].includes(b.status);
    const editable = manage && !locked;
    const visible = isNew || detailsOnly ? SECTIONS.slice(0, 4) : SECTIONS;
    const section = visible[Math.min(step, visible.length - 1)];
    const eventType = watch('eventType');

    const act = useMutation({
        mutationFn: ({ method, path, body }: { method: 'POST' | 'DELETE'; path: string; body?: unknown }) => api.send(method, path, body),
        onSuccess: (r) => {
            toast.success(r.message);
            setCancelOpen(false);
            refresh();
        },
        onError: (e) => toast.error(e),
    });

    const jumpToError = (errs: FieldErrors<Form>) => {
        const idx = visible.findIndex((s) => s.fields.some((f) => f in errs));
        if (idx >= 0) setStep(idx);
    };
    const submit = handleSubmit(async (v) => {
        if (isNew && !customer) {
            setCustomerError('Choose a customer');
            setStep(0);
            return;
        }
        if (isNew && v.eventDate < todayYmd()) {
            setError('eventDate', { type: 'manual', message: 'The date cannot be in the past' });
            setStep(1);
            return;
        }
        const body = {
            ...bookingPayload(v),
            quotedAmount: !v.packageId && v.quotedAmount?.trim() ? Math.round(Number(v.quotedAmount) * 100) : null,
            internalNotes: v.internalNotes?.trim() || null,
        };
        try {
            const r = isNew ? await api.send<{ id: number }>('POST', '/api/bookings', { ...body, customerId: customer!.id }) : await api.send<{ id: number }>('PUT', `/api/bookings/${id}`, body);
            toast.success(r.message);
            await refresh();
            if (isNew) onCreated(r.data.id);
            else reset(v);
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    }, jumpToError);

    const hasError = (fields: readonly string[]) => fields.some((f) => f in errors);
    const services = site.data?.services ?? [];
    const packages = site.data?.packages ?? [];
    const serviceId = watch('serviceId');
    const packageId = watch('packageId');
    const pkgOptions = packages.filter((p) => !serviceId || !p.service_id || String(p.service_id) === serviceId);
    const isCustomQuote = !packageId;
    const due = b?.balance_due ?? 0;
    const canQuote = manage && !!b && ['ENQUIRY', 'QUOTED', 'ADVANCE_PENDING'].includes(b.status);

    return (
        <Drawer
            open={id !== null}
            onClose={onClose}
            width="lg:w-[90vw]"
            title={
                <span className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-ink-900 text-accent-400">{isNew ? <Plus className="size-5" /> : <Pencil className="size-4" />}</span>
                    <span className="min-w-0">
                        <span className="block leading-tight">{isNew ? 'New booking' : b ? b.booking_no : 'Booking'}</span>
                        {!isNew && <span className="block text-xs font-normal text-stone-500">{editable ? 'Edit booking' : locked ? 'Closed booking' : 'Booking details'}</span>}
                    </span>
                </span>
            }
            footer={
                <>
                    <Button variant="secondary" className="mr-auto" onClick={onClose}>
                        {editable || isNew ? 'Cancel' : 'Close'}
                    </Button>
                    {step > 0 && (
                        <Button variant="secondary" icon={<ChevronLeft className="size-4" />} onClick={() => setStep(step - 1)}>
                            Back
                        </Button>
                    )}
                    {step < visible.length - 1 && (
                        <Button variant="dark" onClick={() => setStep(step + 1)}>
                            Next
                        </Button>
                    )}
                    {(isNew || editable) && (
                        <Button loading={isSubmitting} disabled={!isNew && (!b || !isDirty)} onClick={submit}>
                            {isNew ? 'Create booking' : 'Save changes'}
                        </Button>
                    )}
                </>
            }
        >
            {!isNew && detail.isLoading ? (
                <p className="py-8 text-center text-sm text-stone-500">Loading…</p>
            ) : detail.isError ? (
                <p className="py-8 text-center text-sm text-red-600">Could not load this booking.</p>
            ) : (
                <form onSubmit={submit} noValidate className="-mx-5 -my-4 grid min-h-full gap-4 bg-[var(--portal-bg)] p-4 md:grid-cols-[16rem_minmax(0,1fr)]">
                    <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white p-2 shadow-[var(--soft-shadow)] md:sticky md:top-0 md:flex-col md:self-start md:overflow-visible md:p-3">
                        <p className="mb-1 hidden items-center gap-2 px-1 font-semibold text-stone-900 md:flex">
                            <Sparkles className="size-5 text-accent-600" />
                            Booking information
                        </p>
                        {visible.map((s, i) => (
                            <button
                                key={s.title}
                                type="button"
                                onClick={() => setStep(i)}
                                className={clsx(
                                    'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors',
                                    i === step ? 'bg-ink-900 text-accent-300 shadow-sm' : 'text-stone-700 hover:bg-accent-50',
                                    hasError(s.fields) && i !== step && 'ring-2 ring-rose-300',
                                )}
                            >
                                <span className={clsx('flex size-8 shrink-0 items-center justify-center rounded-lg', i === step ? 'bg-white/10' : 'bg-accent-50 text-accent-700')}>
                                    <s.icon className="size-4" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold">{s.title}</span>
                                    <span className={clsx('hidden truncate text-[11px] md:block', i === step ? 'text-accent-200/70' : 'text-stone-500')}>{s.hint}</span>
                                </span>
                            </button>
                        ))}
                        {!detailsOnly && !isNew && manage && b && !['COMPLETED', 'CANCELLED'].includes(b.status) && (
                            <button type="button" onClick={() => setCancelOpen(true)} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 md:mt-3">
                                <Trash2 className="size-4" />
                                Cancel booking
                            </button>
                        )}
                    </nav>

                    <div className="min-w-0 space-y-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[var(--soft-shadow)]">
                        <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                            <section.icon className="size-5 text-accent-600" />
                            {section.title}
                            <span className="ml-auto text-xs font-medium text-stone-500">
                                Step {step + 1} of {visible.length}
                            </span>
                        </h3>
                        <ol className="flex items-start">
                            {visible.map((s, i) => (
                                <li key={s.title} className={clsx('flex items-center', i < visible.length - 1 && 'flex-1')}>
                                    <button type="button" onClick={() => setStep(i)} aria-label={`Step ${i + 1}: ${s.title}`} title={s.title} className={clsx('flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors', hasError(s.fields) ? 'bg-rose-500 text-white' : i < step ? 'bg-accent-500 text-ink-900' : i === step ? 'bg-ink-900 text-accent-300 ring-4 ring-accent-200' : 'bg-stone-100 text-stone-500')}>
                                        {i < step && !hasError(s.fields) ? <Check className="size-3.5" /> : i + 1}
                                    </button>
                                    {i < visible.length - 1 && <span className={clsx('mx-2 h-0.5 flex-1 rounded-full', i < step ? 'bg-accent-400' : 'bg-stone-200')} />}
                                </li>
                            ))}
                        </ol>

                        {section.title === 'Customer' && (
                            <>
                                {b && (
                                    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4">
                                        <Avatar name={b.customer_name} className="size-20 rounded-full text-2xl" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-stone-900">{b.customer_name}</p>
                                            <p className="text-sm text-stone-500">{[b.customer_phone, b.customer_email].filter(Boolean).join(' · ') || 'No contact on file'}</p>
                                            <Link to={`/admin/customers?open=${b.customer_id}`} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:underline">
                                                <Link2 className="size-3.5" /> Open customer
                                            </Link>
                                        </div>
                                        <StatusBadge status={b.status} />
                                    </div>
                                )}
                                {isNew && (
                                    <Panel icon={<UserCircle2 className="size-4 text-sky-500" />} title="Choose customer">
                                        <CustomerPicker required value={customer?.id ?? null} onChange={(c) => (setCustomer(c), setCustomerError(''))} error={customerError} />
                                    </Panel>
                                )}
                                {!isNew && <p className="text-sm text-stone-500">The customer on a booking cannot be changed. Open their profile to update contact details.</p>}
                            </>
                        )}

                        {section.title === 'Event' && (
                            <fieldset disabled={!isNew && !editable} className="space-y-4">
                                {b && (
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <Stat icon={<CalendarDays className="size-4" />} label="Event date" value={date(b.event_date)} tone="bg-sky-50 text-sky-600" />
                                        <Stat icon={<MapPin className="size-4" />} label="Venue" value={b.venue || '—'} tone="bg-rose-50 text-rose-600" />
                                        <Stat icon={<Package className="size-4" />} label="Package" value={b.package_name ?? 'Custom'} tone="bg-amber-50 text-amber-600" />
                                        <Stat icon={<IndianRupee className="size-4" />} label="Balance due" value={money(due)} tone={due > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} />
                                    </div>
                                )}
                                {b && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StatusBadge status={b.status} />
                                        <span className="text-xs text-stone-500">
                                            {titleCase(b.source)} · created {dateTime(b.created_at)}
                                        </span>
                                        {b.event && (
                                            <Link to={`/admin/events/${b.event.id}`} className="ml-auto text-sm font-medium text-sky-700 hover:underline">
                                                Event {b.event.event_code} →
                                            </Link>
                                        )}
                                        {manage && ['CONFIRMED', 'IN_PROGRESS'].includes(b.status) && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                loading={act.isPending}
                                                onClick={async () => (await ask({ title: 'Mark as delivered?', message: 'All photos and albums have been handed over. If fully paid, the booking will be completed.', confirmLabel: 'Mark delivered', tone: 'primary' })) && act.mutate({ method: 'POST', path: `/api/bookings/${b.id}/deliver` })}
                                            >
                                                Mark delivered
                                            </Button>
                                        )}
                                    </div>
                                )}
                                <Panel icon={<CalendarDays className="size-4 text-sky-500" />} title="Event details">
                                    <FormGrid>
                                        <div>
                                            <Input label="Event type" required list="booking-event-types" {...register('eventType')} error={errors.eventType?.message} placeholder="e.g. Wedding" />
                                            <datalist id="booking-event-types">
                                                {EVENT_TYPES.map((t) => (
                                                    <option key={t} value={t} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <Input label="Event date" type="date" required min={isNew ? todayYmd() : undefined} {...register('eventDate')} error={errors.eventDate?.message} />
                                        <TimeInput12
                                            label="Start time"
                                            value={startTime}
                                            onChange={(val24) => setValue('startTime', val24, { shouldValidate: true, shouldDirty: true })}
                                            error={errors.startTime?.message}
                                        />
                                        <TimeInput12
                                            label="End time"
                                            value={endTime}
                                            onChange={(val24) => setValue('endTime', val24, { shouldValidate: true, shouldDirty: true })}
                                            error={errors.endTime?.message}
                                        />
                                        <Input label="Venue" wrapperClassName="sm:col-span-2" {...register('venue')} error={errors.venue?.message} placeholder="Venue name and city" />
                                        <Input label="Expected guests" inputMode="numeric" {...register('guests')} error={errors.guests?.message} />
                                    </FormGrid>
                                </Panel>
                            </fieldset>
                        )}

                        {section.title === 'Package' && (
                            <fieldset disabled={!isNew && !editable}>
                                <Panel icon={<Package className="size-4 text-amber-500" />} title="Service and package">
                                    <p className="mb-3 text-sm text-stone-500">{eventType ? `Suggested for ${eventType}. ` : ''}Choose a package, or leave it on “Custom / need a quotation” and enter the quote amount.</p>
                                    <FormGrid>
                                        <Select label="Service" {...register('serviceId')} placeholder="Not sure yet" options={services.map((s) => ({ value: s.id, label: s.name }))} error={errors.serviceId?.message} />
                                        <Select label="Package" {...register('packageId')} placeholder="Custom / need a quotation" options={pkgOptions.map((p) => ({ value: p.id, label: `${p.name} · ${money(p.price, true)}` }))} error={errors.packageId?.message} />
                                        {isCustomQuote && (
                                            <Input
                                                label="Custom quotation amount"
                                                required
                                                prefix="₹"
                                                inputMode="decimal"
                                                placeholder="e.g. 45000"
                                                {...register('quotedAmount')}
                                                error={errors.quotedAmount?.message}
                                                hint="Enter the quoted total for this booking. Advance is calculated at 30%."
                                            />
                                        )}
                                    </FormGrid>
                                </Panel>
                            </fieldset>
                        )}

                        {section.title === 'Notes' && (
                            <fieldset disabled={!isNew && !editable} className="space-y-4">
                                <Panel icon={<NotebookPen className="size-4 text-violet-500" />} title="Customer message">
                                    <Textarea label="Anything else we should know?" rows={4} {...register('message')} error={errors.message?.message} placeholder="Schedule, rituals, must-have shots, special requests…" />
                                </Panel>
                                <Panel icon={<NotebookPen className="size-4 text-amber-500" />} title="Internal notes">
                                    <Textarea label="Staff only" hint="Not shown to the customer." rows={4} {...register('internalNotes')} error={errors.internalNotes?.message} />
                                </Panel>
                            </fieldset>
                        )}

                        {section.title === 'Quotations' &&
                            (b ? (
                                <div>
                                    {canQuote && (
                                        <div className="mb-4 flex justify-end">
                                            <Button size="sm" icon={<FilePlus2 className="size-4" />} onClick={() => setBuilder({ q: null })}>
                                                Create quotation
                                            </Button>
                                        </div>
                                    )}
                                    {!b.quotations.length && <EmptyState title="No quotations" description={canQuote ? 'Create a quotation to send pricing and package details to the customer.' : ''} />}
                                    <div className="space-y-3">
                                        {b.quotations.map((qt) => (
                                            <div key={qt.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
                                                <QuotationView q={qt} />
                                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                                                    <span>Revision {qt.revision ?? 1}</span>
                                                    {qt.emailed_at && <span>Emailed {dateTime(qt.emailed_at)}</span>}
                                                    {qt.status !== 'DRAFT' && (
                                                        <button type="button" className="inline-flex items-center gap-1 text-brand-700" onClick={() => downloadAuthed(`/api/bookings/quotations/${qt.id}/pdf`, `${qt.quotation_no}.pdf`)}>
                                                            <FileDown className="size-3.5" /> PDF
                                                        </button>
                                                    )}
                                                </div>
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
                                                        <span className="mr-auto self-center text-xs text-stone-500">Customer can accept online. Record a manual decision:</span>
                                                        <Button size="sm" variant="secondary" onClick={() => act.mutate({ method: 'POST', path: `/api/bookings/quotations/${qt.id}/respond`, body: { decision: 'REJECT' } })}>
                                                            Mark declined
                                                        </Button>
                                                        <Button size="sm" variant="success" onClick={() => act.mutate({ method: 'POST', path: `/api/bookings/quotations/${qt.id}/respond`, body: { decision: 'ACCEPT' } })}>
                                                            Mark accepted
                                                        </Button>
                                                    </div>
                                                )}
                                                {manage && (qt.status === 'SENT' || qt.status === 'REJECTED') && (
                                                    <div className="mt-3 flex justify-end">
                                                        <Button size="sm" variant="secondary" onClick={() => act.mutate({ method: 'POST', path: `/api/bookings/quotations/${qt.id}/revise`, body: { note: 'Revised after customer review' } })}>
                                                            Save revision draft
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="rounded-2xl border-2 border-dashed border-stone-200 px-4 py-10 text-center text-sm text-stone-500">Quotations appear after the booking is created.</p>
                            ))}

                        {section.title === 'Finance' &&
                            (b ? (
                                <div className="space-y-4">
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <Stat icon={<IndianRupee className="size-4" />} label="Total" value={money(b.total_amount)} tone="bg-ink-900 text-accent-400" />
                                        <Stat icon={<Banknote className="size-4" />} label="Advance" value={money(b.advance_amount)} tone="bg-amber-50 text-amber-600" />
                                        <Stat icon={<Check className="size-4" />} label="Paid" value={money(b.paid_amount)} tone="bg-emerald-50 text-emerald-600" />
                                        <Stat icon={<IndianRupee className="size-4" />} label="Due" value={money(due)} tone={due > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} />
                                    </div>
                                    <Panel
                                        icon={<Banknote className="size-4 text-emerald-500" />}
                                        title="Payment history"
                                    >
                                        {can('payments.manage') && due > 0 && !['ENQUIRY', 'QUOTED', 'CANCELLED'].includes(b.status) && (
                                            <div className="mb-3 flex justify-end">
                                                <Button size="sm" icon={<Banknote className="size-4" />} onClick={() => setOffline(true)}>
                                                    Record payment
                                                </Button>
                                            </div>
                                        )}
                                        <PaymentList payments={b.payments || []} />
                                    </Panel>
                                </div>
                            ) : (
                                <p className="rounded-2xl border-2 border-dashed border-stone-200 px-4 py-10 text-center text-sm text-stone-500">Finance appears after the booking is created.</p>
                            ))}

                        {section.title === 'QR & links' && (
                            <div className="rounded-2xl border-2 border-dashed border-stone-200 px-4 py-10 text-center">
                                <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                                    <QrCode className="size-6" />
                                </span>
                                <p className="font-semibold text-stone-900">QR codes and upload links</p>
                                <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">Create upload links and security codes here, for example one for photographer upload and one for customer review.</p>
                            </div>
                        )}

                        {section.title === 'Team' && (
                            <div className="rounded-2xl border-2 border-dashed border-stone-200 px-4 py-10 text-center">
                                <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                                    <Users className="size-6" />
                                </span>
                                <p className="font-semibold text-stone-900">Team and assets</p>
                                <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">Assign photographers, editors and equipment from the linked event once this booking is confirmed.</p>
                                {b?.event && (
                                    <Link to={`/admin/events/${b.event.id}`} className="mt-4 inline-flex items-center justify-center rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-accent-300">
                                        Open event {b.event.event_code}
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </form>
            )}

            {b && (
                <>
                    <QuotationBuilder open={!!builder} bookingId={b.id} quotation={builder?.q ?? null} defaults={b.package_name && b.total_amount ? { description: `${b.package_name} - ${b.event_type}`, amount: b.total_amount } : null} onClose={() => setBuilder(null)} onSaved={() => (setBuilder(null), refresh())} />
                    <OfflinePaymentModal target={offline ? { bookingId: b.id } : null} due={b.balance_due} onClose={() => setOffline(false)} onSaved={() => (setOffline(false), refresh())} />
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
