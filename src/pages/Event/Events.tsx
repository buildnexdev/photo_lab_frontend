// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DataTable, EmptyState, Pagination, QueryState, StatusBadge, TableHeaderToolbar } from '../../components/ui/Data';
import { EventForm } from '../../components/event/EventForm';
import { Input, Select } from '../../components/ui/Form';
import { Card } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { api, type Paged } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { date, time, titleCase } from '../../utils/format';
import { useListParams, useViewMode } from '../../hooks';
import { EVENT_STATUSES, type EventRow } from '../../types';
import './Events.scss';

export default function AdminEvents() {
    const { can } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const { page, search, filters, setPage, setSearch, setFilter } = useListParams(['status', 'from', 'to'] as const);
    const [viewMode, setViewMode] = useViewMode();
    const [creating, setCreating] = useState(false);
    const rangeError = !!(filters.from && filters.to && filters.from > filters.to);
    const q = useQuery({
        queryKey: ['events', 'admin', page, search, filters],
        queryFn: () => api.get<Paged<EventRow>>('/api/events', { page, pageSize: 25, search, status: filters.status, from: filters.from, to: filters.to, sort: 'date', order: 'desc' }),
        placeholderData: (p) => p,
        enabled: !rangeError,
    });
    return (
        <div>
            <Card padded={false} className="overflow-hidden">
                <TableHeaderToolbar
                    total={q.data?.total}
                    totalLabel="Events"
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder="Title, code, venue or customer"
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onAdd={can('events.manage') ? () => setCreating(true) : undefined}
                    addLabel="New Event"
                    extraFilters={
                        <div className="flex flex-wrap items-center gap-2">
                            <Select wrapperClassName="w-40" aria-label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="All statuses" options={EVENT_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                            <Input wrapperClassName="w-36" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
                            <Input wrapperClassName="w-36" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} error={rangeError ? 'Must be after From' : undefined} />
                        </div>
                    }
                />
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                onRowClick={(r) => navigate(`/admin/events/${r.id}`)}
                                viewMode={viewMode}
                                empty={<EmptyState title="No events match these filters" />}
                                columns={[
                                    {
                                        key: 'title',
                                        header: 'Event',
                                        cell: (r) => (
                                            <div className="flex items-center gap-3">
                                                {r.cover_url ? (
                                                    <img
                                                        src={r.cover_url}
                                                        alt=""
                                                        className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-stone-200/80 shadow-xs"
                                                    />
                                                ) : (
                                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                                                        <CalendarDays className="size-5" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-stone-900 truncate">{r.title}</p>
                                                    <p className="text-xs text-stone-500">
                                                        {r.event_code} · {r.event_type}
                                                    </p>
                                                </div>
                                            </div>
                                        ),
                                    },
                                    { key: 'date', header: 'Date', cell: (r) => `${date(r.event_date)}${r.start_time ? ` · ${time(r.start_time)}${r.end_time ? ` – ${time(r.end_time)}` : ''}` : ''}` },
                                    { key: 'customer', header: 'Customer', cell: (r) => r.customer_name, hideOnMobile: true },
                                    { key: 'team', header: 'Photographers', cell: (r) => r.photographers ?? <span className="text-red-600">Unassigned</span>, hideOnMobile: true },
                                    { key: 'photos', header: 'Photos', cell: (r) => r.photo_count, hideOnMobile: true },
                                    {
                                        key: 'link',
                                        header: 'Customer Link',
                                        cell: (r) => {
                                            const link = r.qr_token ? `${window.location.origin}/g/${r.qr_token}` : r.public_url;
                                            if (!link) return <span className="text-xs text-stone-400">—</span>;
                                            return (
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        title="Copy customer gallery link"
                                                        className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(link);
                                                            toast.success('Customer gallery link copied!');
                                                        }}
                                                    >
                                                        <Copy className="size-3 text-stone-500" />
                                                        Copy
                                                    </button>
                                                    <a
                                                        href={link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title="Open customer gallery"
                                                        className="inline-flex size-6 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 shadow-xs hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                    >
                                                        <ExternalLink className="size-3" />
                                                    </a>
                                                </div>
                                            );
                                        },
                                        hideOnMobile: true,
                                    },
                                    { key: 'pay', header: 'Payment', cell: (r) => (r.payment_status === 'N/A' ? '—' : <StatusBadge status={r.payment_status} />), hideOnMobile: true },
                                    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
            <EventForm value={creating ? 'new' : null} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/admin/events/${id}`)} />
        </div>
    );
}
