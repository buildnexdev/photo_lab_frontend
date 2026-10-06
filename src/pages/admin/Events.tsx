// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DataTable, EmptyState, Pagination, QueryState, StatusBadge, TableHeaderToolbar } from '../../components/data';
import { EventForm } from '../../components/EventForm';
import { Input, Select } from '../../components/form';
import { Card } from '../../components/ui';
import { api, type Paged } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { date, time, titleCase } from '../../lib/format';
import { useListParams, useViewMode } from '../../lib/hooks';
import { EVENT_STATUSES, type EventRow } from '../../lib/types';

export default function AdminEvents() {
    const { can } = useAuth();
    const navigate = useNavigate();
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
                                            <div>
                                                <p className="font-medium text-stone-900">{r.title}</p>
                                                <p className="text-xs text-stone-500">
                                                    {r.event_code} · {r.event_type}
                                                </p>
                                            </div>
                                        ),
                                    },
                                    { key: 'date', header: 'Date', cell: (r) => `${date(r.event_date)}${r.start_time ? ` · ${time(r.start_time)}` : ''}` },
                                    { key: 'customer', header: 'Customer', cell: (r) => r.customer_name, hideOnMobile: true },
                                    { key: 'team', header: 'Photographers', cell: (r) => r.photographers ?? <span className="text-red-600">Unassigned</span>, hideOnMobile: true },
                                    { key: 'photos', header: 'Photos', cell: (r) => r.photo_count, hideOnMobile: true },
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
