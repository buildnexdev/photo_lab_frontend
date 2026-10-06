// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026 
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable, EmptyState, Pagination, QueryState, SearchInput } from '../../components/data';
import { Input, Select } from '../../components/form';
import { Modal } from '../../components/overlay';
import { Card, KeyValue, PageHeader } from '../../components/ui';
import { api, type Paged } from '../../lib/api';
import { dateTime, parseJson, titleCase } from '../../lib/format';
import { useListParams } from '../../lib/hooks';

interface AuditRow {
    id: number;
    user_id: number | null;
    user_name: string | null;
    user_email: string | null;
    action: string;
    module: string;
    record_id: string | null;
    ip: string | null;
    user_agent: string | null;
    metadata: unknown;
    created_at: string;
}

export default function AdminAuditLogs() {
    const { page, search, filters, setPage, setSearch, setFilter } = useListParams(['module', 'from', 'to'] as const);
    const [open, setOpen] = useState<AuditRow | null>(null);
    const rangeError = !!(filters.from && filters.to && filters.from > filters.to);
    const q = useQuery({
        queryKey: ['audit', page, search, filters],
        queryFn: () => api.get<Paged<AuditRow> & { modules: string[] }>('/api/audit-logs', { page, pageSize: 50, search, module: filters.module, from: filters.from, to: filters.to }),
        placeholderData: (p) => p,
        enabled: !rangeError,
    });
    const meta = open ? parseJson<Record<string, unknown> | null>(open.metadata, null) : null;
    return (
        <div>
            <PageHeader title="Audit logs" subtitle="Who did what and when: sign-ins, payments, permission changes, QR revocations, deletions and more." />
            <Card padded={false}>
                <div className="flex flex-wrap items-end gap-3 border-b border-stone-100 p-4">
                    <SearchInput value={search} onChange={setSearch} placeholder="Action, record or user" className="w-full max-w-xs" />
                    <Select wrapperClassName="w-44" aria-label="Module" value={filters.module} onChange={(e) => setFilter('module', e.target.value)} placeholder="All modules" options={(q.data?.modules ?? []).map((m) => ({ value: m, label: titleCase(m) }))} />
                    <Input wrapperClassName="w-40" label="From" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
                    <Input wrapperClassName="w-40" label="To" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} error={rangeError ? 'Must be after From' : undefined} />
                </div>
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                onRowClick={setOpen}
                                empty={<EmptyState title="No activity matches these filters" />}
                                columns={[
                                    { key: 'when', header: 'When', cell: (r) => <span className="whitespace-nowrap">{dateTime(r.created_at)}</span> },
                                    { key: 'who', header: 'User', cell: (r) => r.user_name ?? <span className="text-stone-400">System</span> },
                                    { key: 'action', header: 'Action', cell: (r) => <span className="font-mono text-xs">{r.action}</span> },
                                    { key: 'module', header: 'Module', cell: (r) => titleCase(r.module), hideOnMobile: true },
                                    { key: 'record', header: 'Record', cell: (r) => r.record_id ?? '—', hideOnMobile: true },
                                    { key: 'ip', header: 'IP', cell: (r) => r.ip ?? '—', hideOnMobile: true },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
            <Modal open={!!open} onClose={() => setOpen(null)} title={open?.action ?? ''} size="lg">
                {open && (
                    <div className="space-y-4">
                        <KeyValue
                            items={[
                                ['When', dateTime(open.created_at)],
                                ['User', open.user_name ? `${open.user_name}${open.user_email ? ` (${open.user_email})` : ''}` : 'System'],
                                ['Module', titleCase(open.module)],
                                ['Record', open.record_id],
                                ['IP address', open.ip],
                                ['Device', open.user_agent],
                            ]}
                        />
                        {meta && Object.keys(meta).length > 0 && (
                            <div>
                                <h3 className="mb-2 text-sm font-semibold">Details</h3>
                                <pre className="max-h-80 overflow-auto rounded-lg bg-stone-900 p-3 text-xs text-stone-100">{JSON.stringify(meta, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
