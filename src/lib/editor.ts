// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/** A row of GET /api/photos/editor/queue: the editor's assigned photos grouped by event. */
export interface EditorQueueRow {
    event_id: number;
    event_title: string;
    event_code: string;
    event_date: string;
    customer_name: string;
    editing: number;
    edited: number;
    approved: number;
    total: number;
}

export function useEditorQueue(enabled = true) {
    return useQuery({ queryKey: ['photos', 'editor-queue'], queryFn: () => api.get<EditorQueueRow[]>('/api/photos/editor/queue'), enabled });
}
