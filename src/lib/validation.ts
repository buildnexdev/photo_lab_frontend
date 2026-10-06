// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { z } from 'zod';
import { todayYmd } from './format';

export const phoneRule = z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,16}$/, 'Enter a valid phone number');

export const optionalPhone = z
    .string()
    .trim()
    .refine((v) => !v || /^\+?[0-9\s-]{8,16}$/.test(v), 'Enter a valid phone number');

export const emailRule = z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(190);

export const passwordRule = z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(72, 'Use at most 72 characters')
    .regex(/[A-Za-z]/, 'Include at least one letter')
    .regex(/\d/, 'Include at least one number');

/** Rupee amount typed in a form (converted to paise before sending). */
export const rupees = (opts: { min?: number; required?: boolean } = {}) =>
    z
        .string()
        .trim()
        .refine((v) => (opts.required === false ? true : v !== ''), 'Required')
        .refine((v) => v === '' || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= (opts.min ?? 0)), `Enter an amount${opts.min ? ` of at least ₹${opts.min}` : ''} (up to 2 decimals)`);

export const bookingDetailsSchema = z
    .object({
        serviceId: z.string().optional(),
        packageId: z.string().optional(),
        eventType: z.string().trim().min(2, 'Tell us the type of event').max(60),
        eventDate: z
            .string()
            .min(1, 'Choose the event date')
            .refine((v) => v >= todayYmd(), 'The date cannot be in the past'),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        venue: z.string().trim().max(255).optional(),
        guests: z
            .string()
            .optional()
            .refine((v) => !v || (/^\d+$/.test(v) && Number(v) <= 100000), 'Enter a number'),
        message: z.string().trim().max(3000).optional(),
    })
    .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, { path: ['endTime'], message: 'End time must be after the start time' });

export type BookingDetailsForm = z.infer<typeof bookingDetailsSchema>;

export const bookingPayload = (v: BookingDetailsForm) => ({
    serviceId: v.serviceId ? Number(v.serviceId) : null,
    packageId: v.packageId ? Number(v.packageId) : null,
    eventType: v.eventType,
    eventDate: v.eventDate,
    startTime: v.startTime || null,
    endTime: v.endTime || null,
    venue: v.venue || null,
    guests: v.guests ? Number(v.guests) : null,
    message: v.message || null,
});

export const EVENT_TYPES = ['Wedding', 'Engagement', 'Pre-wedding', 'Reception', 'Birthday', 'Baby shower', 'Corporate event', 'Portrait session', 'Maternity', 'Product shoot', 'Other'];
