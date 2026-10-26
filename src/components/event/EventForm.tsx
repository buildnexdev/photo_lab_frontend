/*
 * Developer by: Buildnexdev.in
 * Developer : Nandhakumar@gmail.com
 * Last Edited : 26-10-2026
 */
import clsx from 'clsx';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CalendarDays, Clock, MapPin, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, applyFieldErrors } from '../../services/api';
import { useInvalidate } from '../../hooks';
import { EVENT_TYPES } from '../../helpers/validation';
import { CustomerPicker, type CustomerOption } from '../customer/CustomerPicker';
import { FormGrid, Input, Textarea } from '../ui/Form';
import { Modal } from '../ui/Overlay';
import { useToast } from '../ui/Toast';
import { Button, TimeInput12 } from '../ui';
import { date, time } from '../../utils/format';

/*
 * EVENT FORM VALUE
 */
export interface EventFormValue {
    id: number;
    customer_id: number;
    customer_name: string;
    customer_phone?: string | null;
    customer_email?: string | null;
    booking_id: number | null;
    title: string;
    event_type: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    venue: string | null;
    notes?: string | null;
}

interface SameDayEvent {
    id: number;
    event_code: string;
    title: string;
    event_type: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    venue: string | null;
    customer_name: string;
    status: string;
}

/*
 * EVENT FORM SCHEMA
 */
const schema = z
    .object({
        title: z.string().trim().min(2, 'Enter a title').max(160),
        eventType: z.string().trim().min(2, 'Enter the event type').max(60),
        eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
        startTime: z.string(),
        endTime: z.string(),
        venue: z.string().trim().max(255),
        notes: z.string().trim().max(3000),
    })
    .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, {
        path: ['endTime'],
        message: 'End time must be after start time',
    });

/*
 * EVENT FORM TYPE
 */
type Form = z.infer<typeof schema>;

/*
 * EVENT FORM COMPONENT
 */
export function EventForm({
    value,
    onClose,
    onSaved,
}: {
    value: EventFormValue | 'new' | null;
    onClose: () => void;
    onSaved: (id: number) => void;
}) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const isNew = value === 'new';
    const [customer, setCustomer] = useState<CustomerOption | null>(null);
    const [customerError, setCustomerError] = useState('');
    const [slot, setSlot] = useState('');

    // Confirmation modal state for existing events on the same date
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [conflictingEvents, setConflictingEvents] = useState<SameDayEvent[]>([]);
    const [pendingFormValues, setPendingFormValues] = useState<Form | null>(null);
    const [checkingConflicts, setCheckingConflicts] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setError,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<Form>({ resolver: zodResolver(schema) });

    const eventDate = watch('eventDate');
    const startTime = watch('startTime');
    const endTime = watch('endTime');

    useEffect(() => {
        if (!value) return;
        setCustomerError('');
        setConfirmModalOpen(false);
        setConflictingEvents([]);
        setPendingFormValues(null);

        if (value === 'new') {
            setCustomer(null);
            reset({ title: '', eventType: '', eventDate: '', startTime: '', endTime: '', venue: '', notes: '' });
        } else {
            setCustomer({
                id: value.customer_id,
                name: value.customer_name,
                phone: value.customer_phone ?? null,
                email: value.customer_email ?? null,
            });
            reset({
                title: value.title,
                eventType: value.event_type,
                eventDate: value.event_date,
                startTime: value.start_time?.slice(0, 5) ?? '',
                endTime: value.end_time?.slice(0, 5) ?? '',
                venue: value.venue ?? '',
                notes: value.notes ?? '',
            });
        }
    }, [value, reset]);

    useEffect(() => {
        if (!eventDate || !startTime || !endTime || endTime <= startTime) {
            setSlot('');
            return;
        }
        const timer = window.setTimeout(() => {
            const excludeEventId = value && typeof value === 'object' ? value.id : undefined;
            api.get<{ available: boolean; conflicts: { label: string; start_time?: string; end_time?: string }[] }>(
                '/api/events/availability',
                { date: eventDate, start: startTime, end: endTime, excludeEventId },
            )
                .then((r) => {
                    if (r.available) {
                        setSlot('This time is free.');
                    } else {
                        const conflictDetails = r.conflicts
                            .map((c) => {
                                const timeStr = c.start_time
                                    ? ` (${time(c.start_time)}${c.end_time ? ` – ${time(c.end_time)}` : ''})`
                                    : '';
                                return `${c.label}${timeStr}`;
                            })
                            .join(', ');
                        setSlot(`Already booked: ${conflictDetails}`);
                    }
                })
                .catch(() => setSlot(''));
        }, 300);
        return () => window.clearTimeout(timer);
    }, [eventDate, startTime, endTime, value]);

    /*
     * PERFORM SAVE
     */
    const saveEvent = async (v: Form, force: boolean) => {
        if (!customer) return setCustomerError('Choose a customer');
        const body = {
            customerId: customer.id,
            bookingId: isNew ? null : (value as EventFormValue).booking_id,
            title: v.title,
            eventType: v.eventType,
            eventDate: v.eventDate,
            startTime: v.startTime || undefined,
            endTime: v.endTime || undefined,
            venue: v.venue || null,
            notes: v.notes || null,
            force,
        };
        try {
            const r = isNew
                ? await api.send<{ id: number }>('POST', '/api/events', body)
                : await api.send<{ id: number }>('PUT', `/api/events/${(value as EventFormValue).id}`, body);
            toast.success(r.message);
            await invalidate(['events']);
            setConfirmModalOpen(false);
            setPendingFormValues(null);
            onSaved(r.data.id);
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    };

    /*
     * SUBMIT HANDLER: CHECKS SAME-DATE CONFLICTS FIRST
     */
    const submit = handleSubmit(async (v) => {
        if (!customer) return setCustomerError('Choose a customer');

        // Check if there are other events scheduled on that same date
        setCheckingConflicts(true);
        try {
            const excludeEventId = value && typeof value === 'object' ? value.id : undefined;
            const res = await api.get<{ items: SameDayEvent[] }>('/api/events', {
                from: v.eventDate,
                to: v.eventDate,
                perPage: 50,
            });
            const existing = (res.items || []).filter(
                (item) => item.id !== excludeEventId && item.status !== 'CANCELLED',
            );

            if (existing.length > 0) {
                setConflictingEvents(existing);
                setPendingFormValues(v);
                setConfirmModalOpen(true);
                setCheckingConflicts(false);
                return;
            }
        } catch (err) {
            console.error('Failed checking existing events on date:', err);
        }
        setCheckingConflicts(false);

        // No conflicting events on date -> save immediately
        await saveEvent(v, false);
    });

    return (
        <>
            <Modal
                open={!!value}
                onClose={onClose}
                title={isNew ? 'New event' : 'Edit event'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button loading={isSubmitting || checkingConflicts} onClick={submit}>
                            Save
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} noValidate className="space-y-4">
                    {isNew && (
                        <p className="text-sm text-stone-500">
                            Events for bookings are created automatically when the booking is confirmed. Use this for walk-in or complimentary shoots.
                        </p>
                    )}
                    <CustomerPicker
                        required
                        value={customer?.id ?? null}
                        initial={customer}
                        onChange={(c) => {
                            setCustomer(c);
                            setCustomerError('');
                        }}
                        error={customerError}
                    />
                    <FormGrid>
                        <Input
                            label="Title"
                            required
                            wrapperClassName="sm:col-span-2"
                            {...register('title')}
                            error={errors.title?.message}
                            placeholder="e.g. Priya & Arjun Wedding"
                        />
                        <div>
                            <Input
                                label="Event type"
                                required
                                list="event-types-admin"
                                {...register('eventType')}
                                error={errors.eventType?.message}
                            />
                            <datalist id="event-types-admin">
                                {EVENT_TYPES.map((t) => (
                                    <option key={t} value={t} />
                                ))}
                            </datalist>
                        </div>
                        <Input
                            label="Date"
                            type="date"
                            required
                            {...register('eventDate')}
                            error={errors.eventDate?.message}
                        />
                        <TimeInput12
                            label="Start time"
                            value={startTime}
                            onChange={(val24) => setValue('startTime', val24, { shouldValidate: true })}
                            error={errors.startTime?.message}
                        />
                        <TimeInput12
                            label="End time"
                            value={endTime}
                            onChange={(val24) => setValue('endTime', val24, { shouldValidate: true })}
                            error={errors.endTime?.message}
                        />
                        {slot && (
                            <p
                                className={`sm:col-span-2 flex items-center gap-2 text-sm ${
                                    slot.startsWith('This time') ? 'text-emerald-700' : 'text-amber-700'
                                }`}
                            >
                                <AlertCircle className="size-4" /> {slot}
                            </p>
                        )}
                        <Input
                            label="Venue"
                            wrapperClassName="sm:col-span-2"
                            {...register('venue')}
                            error={errors.venue?.message}
                        />
                        <Textarea
                            label="Notes for the team"
                            wrapperClassName="sm:col-span-2"
                            rows={3}
                            {...register('notes')}
                            error={errors.notes?.message}
                        />
                    </FormGrid>
                </form>
            </Modal>

            {/* CONFIRMATION MODAL WHEN SAME-DATE EVENT ALREADY EXISTS */}
            <Modal
                open={confirmModalOpen}
                onClose={() => {
                    setConfirmModalOpen(false);
                    setPendingFormValues(null);
                }}
                title="Event Already Scheduled on this Date"
                size="lg"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setConfirmModalOpen(false);
                                setPendingFormValues(null);
                            }}
                        >
                            Change Date
                        </Button>
                        <Button
                            loading={isSubmitting}
                            onClick={() => {
                                if (pendingFormValues) {
                                    saveEvent(pendingFormValues, true);
                                }
                            }}
                        >
                            Proceed & Save
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                        <AlertCircle className="size-5 shrink-0 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold text-amber-950">
                                {conflictingEvents.length} event{conflictingEvents.length > 1 ? 's are' : ' is'} already scheduled on{' '}
                                {pendingFormValues?.eventDate ? date(pendingFormValues.eventDate) : 'this date'}.
                            </p>
                            <p className="mt-1 text-amber-800">
                                Review the scheduled events below. If you want to proceed and save this event on the same date, click <strong>Proceed & Save</strong>. Otherwise, click <strong>Change Date</strong> to pick another date.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {conflictingEvents.map((ev) => {
                            const hasTimeOverlap =
                                !!pendingFormValues?.startTime &&
                                !!pendingFormValues?.endTime &&
                                !!ev.start_time &&
                                !!ev.end_time &&
                                pendingFormValues.startTime < ev.end_time.slice(0, 5) &&
                                pendingFormValues.endTime > ev.start_time.slice(0, 5);

                            return (
                                <div
                                    key={ev.id}
                                    className={clsx(
                                        'rounded-lg border p-3 text-sm transition-all',
                                        hasTimeOverlap
                                            ? 'border-red-300 bg-red-50/70 ring-1 ring-red-300'
                                            : 'border-stone-200 bg-stone-50',
                                    )}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="font-semibold text-stone-900 flex items-center gap-2">
                                            <span>{ev.title}</span>
                                            <span className="text-xs px-2 py-0.5 rounded font-medium bg-stone-200 text-stone-700">
                                                {ev.event_code}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded font-medium bg-brand-50 text-brand-700">
                                                {ev.event_type}
                                            </span>
                                        </div>
                                        {hasTimeOverlap && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                                Overlapping Time
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-stone-600">
                                        <div className="flex items-center gap-1.5">
                                            <UserRound className="size-3.5 text-stone-400" />
                                            <span>
                                                Customer: <strong className="text-stone-700">{ev.customer_name}</strong>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="size-3.5 text-stone-400" />
                                            <span>
                                                Time:{' '}
                                                <strong className="text-stone-700">
                                                    {ev.start_time
                                                        ? `${time(ev.start_time)}${ev.end_time ? ` – ${time(ev.end_time)}` : ''}`
                                                        : 'Full Day / Untimed'}
                                                </strong>
                                            </span>
                                        </div>
                                        {ev.venue && (
                                            <div className="flex items-center gap-1.5 truncate">
                                                <MapPin className="size-3.5 text-stone-400" />
                                                <span className="truncate">
                                                    Venue: <strong className="text-stone-700">{ev.venue}</strong>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>
        </>
    );
}
