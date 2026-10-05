import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { EventStatus } from './types';

/** Statuses in which non-managers may upload photos (mirrors the server rule). */
export const UPLOADABLE: EventStatus[] = ['LIVE', 'UPLOADING', 'PROCESSING'];

export type TaskStatus = 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'DONE';

/** A row of GET /api/events/mine: an event the signed-in staff member is assigned to. */
export interface Assignment {
    assignment_id: number;
    role: string;
    camera_label: string | null;
    task_status: TaskStatus;
    id: number;
    event_code: string;
    title: string;
    event_type: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    venue: string | null;
    status: EventStatus;
    customer_name: string;
    customer_phone: string | null;
    gallery_id: number | null;
    my_uploads: number;
    photo_count: number;
}

export function useMyAssignments(scope: 'upcoming' | 'all' = 'all') {
    return useQuery({ queryKey: ['events', 'mine', scope], queryFn: () => api.get<Assignment[]>('/api/events/mine', { scope }) });
}

export type EventAction = 'start' | 'stop' | 'process' | 'complete' | 'cancel' | 'reopen';

/** Mirrors the server's event state machine so only valid actions are offered. */
export const EVENT_ACTIONS: { action: EventAction; label: string; from: EventStatus[]; tone: 'primary' | 'secondary' | 'danger' | 'success'; confirm?: string }[] = [
    { action: 'start', label: 'Go live', from: ['UPCOMING', 'UPLOADING'], tone: 'primary', confirm: 'The gallery goes live and guests with the QR code will see photos as they are uploaded.' },
    { action: 'stop', label: 'Stop shoot', from: ['LIVE'], tone: 'secondary', confirm: 'Live shooting ends. Uploads can continue.' },
    { action: 'process', label: 'Move to processing', from: ['LIVE', 'UPLOADING'], tone: 'secondary' },
    { action: 'complete', label: 'Complete & publish', from: ['LIVE', 'UPLOADING', 'PROCESSING'], tone: 'success', confirm: 'The gallery will be published to the customer.' },
    { action: 'reopen', label: 'Reopen', from: ['COMPLETED'], tone: 'secondary' },
    { action: 'cancel', label: 'Cancel event', from: ['UPCOMING', 'LIVE', 'UPLOADING', 'PROCESSING'], tone: 'danger', confirm: 'All QR codes for this event will be revoked.' },
];

export const STAFF_ROLES = ['PHOTOGRAPHER', 'ASSISTANT', 'VIDEOGRAPHER', 'EDITOR', 'MANAGER', 'DELIVERY'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Which user role can fill which event staff role (used to filter the assignable list). */
export const STAFF_ROLE_SOURCE: Record<StaffRole, string | undefined> = {
    PHOTOGRAPHER: 'PHOTOGRAPHER',
    ASSISTANT: undefined,
    VIDEOGRAPHER: 'PHOTOGRAPHER',
    EDITOR: 'EDITOR_DESIGNER',
    MANAGER: 'MANAGER',
    DELIVERY: 'PRINTER_DELIVERY_STAFF',
};
