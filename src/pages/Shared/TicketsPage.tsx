import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, IconButton } from '../../components/ui';
import { DataTable, EmptyState, Pagination, QueryState, StatusBadge, TableHeaderToolbar } from '../../components/ui/Data';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type TicketCategory = 'GENERAL' | 'ORDER' | 'PHOTO_REQUEST' | 'EVENT' | 'PAYMENT' | 'OTHER';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface Ticket {
    id: number;
    ticket_no: string;
    user_id: number | null;
    user_name: string | null;
    user_email: string | null;
    category: TicketCategory;
    subject: string;
    message: string | null;
    status: TicketStatus;
    priority: TicketPriority;
    created_at: string;
    updated_at: string;
}

interface TicketPage {
    items: Ticket[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

interface TicketMessage {
    id: number;
    user_id: number;
    user_name: string | null;
    message: string;
    is_staff: number;
    created_at: string;
}

type TicketDetail = Omit<Ticket, 'message'> & {
    messages: TicketMessage[];
};

interface TicketDraft {
    id: number | null;
    subject: string;
    category: TicketCategory;
    priority: TicketPriority;
    message: string;
    status: TicketStatus;
}

const blankDraft = (): TicketDraft => ({ id: null, subject: '', category: 'GENERAL', priority: 'MEDIUM', message: '', status: 'OPEN' });
const statusOptions = [
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'CLOSED', label: 'Closed' },
];
const categoryOptions = [
    { value: 'GENERAL', label: 'General' },
    { value: 'ORDER', label: 'Order' },
    { value: 'PHOTO_REQUEST', label: 'Photo request' },
    { value: 'EVENT', label: 'Event' },
    { value: 'PAYMENT', label: 'Payment' },
    { value: 'OTHER', label: 'Other' },
];
const priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
];

export default function TicketsPage() {
    const { hasRole } = useAuth();
    const isSuperAdmin = hasRole('SUPER_ADMIN');
    const toast = useToast();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [draft, setDraft] = useState<TicketDraft | null>(null);
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

    const ticketsQuery = useQuery({
        queryKey: ['tickets', page, search],
        queryFn: () => api.get<TicketPage>('/api/tickets', { page, pageSize: 20, search: search || undefined }),
    });
    const detailQuery = useQuery({
        queryKey: ['ticket', selectedTicketId],
        queryFn: () => api.get<TicketDetail>(`/api/tickets/${selectedTicketId}`),
        enabled: selectedTicketId !== null,
    });

    const save = useMutation({
        mutationFn: (ticket: TicketDraft) => {
            const body = { subject: ticket.subject, category: ticket.category, priority: ticket.priority, message: ticket.message, status: ticket.status };
            return ticket.id ? api.put(`/api/tickets/${ticket.id}`, body) : api.post('/api/tickets', body);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['tickets'] });
            await queryClient.invalidateQueries({ queryKey: ['ticket'] });
            setDraft(null);
            toast.success('Ticket saved');
        },
        onError: (error) => toast.error(error),
    });

    const remove = useMutation({
        mutationFn: (id: number) => api.del(`/api/tickets/${id}`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['tickets'] });
            setSelectedTicketId(null);
            toast.success('Ticket deleted');
        },
        onError: (error) => toast.error(error),
    });

    return (
        <div className="space-y-4">
            <Card padded={false} className="overflow-hidden">
                <TableHeaderToolbar
                    total={ticketsQuery.data?.total}
                    totalLabel="Tickets"
                    search={search}
                    onSearch={(value) => {
                        setSearch(value);
                        setPage(1);
                    }}
                    searchPlaceholder="Search tickets"
                    onAdd={() => setDraft(blankDraft())}
                    addLabel="Create ticket"
                />
                <QueryState query={ticketsQuery}>
                    {(result) => (
                        <>
                            <DataTable
                                rows={result.items}
                                rowKey={(ticket) => ticket.id}
                                empty={<EmptyState title="No tickets yet" description="Create a ticket to get help from the team." />}
                                columns={[
                                    { key: 'ticket', header: 'Ticket', cell: (ticket) => <div><p className="font-medium text-stone-900">{ticket.subject}</p><p className="mt-1 max-w-md truncate text-xs font-normal text-stone-500">{ticket.message || 'No description'}</p><p className="mt-1 text-[11px] font-normal text-stone-400">{ticket.ticket_no}</p></div> },
                                    ...(isSuperAdmin ? [{ key: 'requester', header: 'Created by', cell: (ticket: Ticket) => <div><p>{ticket.user_name}</p><p className="text-xs font-normal text-stone-500">{ticket.user_email || '—'}</p></div>, hideOnMobile: true }] : []),
                                    { key: 'category', header: 'Category', cell: (ticket) => ticket.category.replaceAll('_', ' ') },
                                    { key: 'priority', header: 'Priority', cell: (ticket) => <StatusBadge status={ticket.priority} /> },
                                    { key: 'status', header: 'Status', cell: (ticket) => <StatusBadge status={ticket.status} /> },
                                    { key: 'created', header: 'Created', cell: (ticket) => new Date(ticket.created_at).toLocaleDateString(), hideOnMobile: true },
                                    {
                                        key: 'actions',
                                        header: 'Actions',
                                        cell: (ticket) => (
                                            <div className="flex items-center gap-1">
                                                <IconButton label="View ticket" icon={<Eye className="size-4" />} onClick={() => setSelectedTicketId(ticket.id)} />
                                                <IconButton label="Edit ticket" icon={<Pencil className="size-4" />} onClick={() => setDraft({ id: ticket.id, subject: ticket.subject, category: ticket.category, priority: ticket.priority, message: ticket.message ?? '', status: ticket.status })} />
                                                <IconButton label="Delete ticket" tone="danger" icon={<Trash2 className="size-4" />} onClick={() => {
                                                    if (window.confirm(`Delete "${ticket.subject}"?`)) remove.mutate(ticket.id);
                                                }} />
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                            <Pagination page={result.page} totalPages={result.totalPages} total={result.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>

            {selectedTicketId !== null && (
                <Card title="Ticket details">
                    <QueryState query={detailQuery}>
                        {(ticket) => (
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="font-semibold text-stone-900">{ticket.subject}</h2>
                                        <p className="mt-1 text-sm text-stone-500">{ticket.ticket_no} · {ticket.category.replaceAll('_', ' ')} · {ticket.priority}</p>
                                    </div>
                                    <Button variant="secondary" onClick={() => setSelectedTicketId(null)}>Close</Button>
                                </div>
                                <div className="space-y-3">
                                    {ticket.messages.map((message) => (
                                        <div key={message.id} className="rounded-lg bg-stone-50 p-3">
                                            <div className="mb-2 flex justify-between gap-3 text-xs text-stone-500">
                                                <span>{message.user_name || (message.is_staff ? 'Staff' : 'User')}</span>
                                                <span>{new Date(message.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="whitespace-pre-wrap text-sm text-stone-800">{message.message}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </QueryState>
                </Card>
            )}

            {draft && (
                <Card title={draft.id ? 'Edit ticket' : 'Create ticket'}>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            save.mutate(draft);
                        }}
                    >
                        <Input label="Subject" required minLength={3} maxLength={180} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Select label="Category" value={draft.category} options={categoryOptions} onChange={(event) => setDraft({ ...draft, category: event.target.value as TicketCategory })} />
                            <Select label="Priority" value={draft.priority} options={priorityOptions} onChange={(event) => setDraft({ ...draft, priority: event.target.value as TicketPriority })} />
                        </div>
                        <Textarea label="Description" required minLength={3} maxLength={5000} rows={5} value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} />
                        <Select label="Status" value={draft.status} options={statusOptions} onChange={(event) => setDraft({ ...draft, status: event.target.value as TicketStatus })} />
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                            <Button type="submit" loading={save.isPending}>{draft.id ? 'Save changes' : 'Create ticket'}</Button>
                        </div>
                    </form>
                </Card>
            )}
        </div>
    );
}
