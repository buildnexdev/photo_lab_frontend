// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, applyFieldErrors } from '../lib/api';
import { useInvalidate } from '../lib/hooks';
import { EVENT_TYPES } from '../lib/validation';
import { CustomerPicker, type CustomerOption } from './CustomerPicker';
import { FormGrid, Input, Textarea } from './form';
import { Modal } from './overlay';
import { useToast } from './toast';
import { Button } from './ui';

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
    .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, { path: ['endTime'], message: 'End must be after start' });
type Form = z.infer<typeof schema>;

export function EventForm({ value, onClose, onSaved }: { value: EventFormValue | 'new' | null; onClose: () => void; onSaved: (id: number) => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const isNew = value === 'new';
    const [customer, setCustomer] = useState<CustomerOption | null>(null);
    const [customerError, setCustomerError] = useState('');
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<Form>({ resolver: zodResolver(schema) });

    useEffect(() => {
        if (!value) return;
        setCustomerError('');
        if (value === 'new') {
            setCustomer(null);
            reset({ title: '', eventType: '', eventDate: '', startTime: '', endTime: '', venue: '', notes: '' });
        } else {
            setCustomer({ id: value.customer_id, name: value.customer_name, phone: value.customer_phone ?? null, email: value.customer_email ?? null });
            reset({ title: value.title, eventType: value.event_type, eventDate: value.event_date, startTime: value.start_time?.slice(0, 5) ?? '', endTime: value.end_time?.slice(0, 5) ?? '', venue: value.venue ?? '', notes: value.notes ?? '' });
        }
    }, [value, reset]);

    const submit = handleSubmit(async (v) => {
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
        };
        try {
            const r = isNew ? await api.send<{ id: number }>('POST', '/api/events', body) : await api.send<{ id: number }>('PUT', `/api/events/${(value as EventFormValue).id}`, body);
            toast.success(r.message);
            await invalidate(['events']);
            onSaved(r.data.id);
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });

    return (
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
                    <Button loading={isSubmitting} onClick={submit}>
                        Save
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="space-y-4">
                {isNew && <p className="text-sm text-stone-500">Events for bookings are created automatically when the booking is confirmed. Use this for walk-in or complimentary shoots.</p>}
                <CustomerPicker required value={customer?.id ?? null} initial={customer} onChange={(c) => (setCustomer(c), setCustomerError(''))} error={customerError} />
                <FormGrid>
                    <Input label="Title" required wrapperClassName="sm:col-span-2" {...register('title')} error={errors.title?.message} placeholder="e.g. Priya & Arjun Wedding" />
                    <div>
                        <Input label="Event type" required list="event-types-admin" {...register('eventType')} error={errors.eventType?.message} />
                        <datalist id="event-types-admin">
                            {EVENT_TYPES.map((t) => (
                                <option key={t} value={t} />
                            ))}
                        </datalist>
                    </div>
                    <Input label="Date" type="date" required {...register('eventDate')} error={errors.eventDate?.message} />
                    <Input label="Start time" type="time" {...register('startTime')} error={errors.startTime?.message} />
                    <Input label="End time" type="time" {...register('endTime')} error={errors.endTime?.message} />
                    <Input label="Venue" wrapperClassName="sm:col-span-2" {...register('venue')} error={errors.venue?.message} />
                    <Textarea label="Notes for the team" wrapperClassName="sm:col-span-2" rows={3} {...register('notes')} error={errors.notes?.message} />
                </FormGrid>
            </form>
        </Modal>
    );
}
