import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DataTable, EmptyState, QueryState, SearchInput, StatusBadge } from '../../components/data';
import { ButtonLink, Card, PageHeader, Tabs } from '../../components/ui';
import { UPLOADABLE, useMyAssignments } from '../../lib/events';
import { date, num, time, titleCase } from '../../lib/format';

export default function PhotographerEvents() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const scope = params.get('scope') === 'all' ? 'all' : 'upcoming';
    const search = params.get('search') ?? '';
    const q = useMyAssignments(scope);
    const setParam = (k: string, v: string) =>
        setParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                if (v) next.set(k, v);
                else next.delete(k);
                return next;
            },
            { replace: true },
        );
    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!q.data || !term) return q.data ?? [];
        return q.data.filter((r) => [r.title, r.event_code, r.customer_name, r.venue].some((v) => v?.toLowerCase().includes(term)));
    }, [q.data, search]);

    return (
        <div>
            <PageHeader title="My events" subtitle="Events you are assigned to. Open one for the live QR code and upload status." />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    value={scope}
                    onChange={(v) => setParam('scope', v === 'all' ? 'all' : '')}
                    tabs={[
                        { value: 'upcoming', label: 'Active & upcoming' },
                        { value: 'all', label: 'All' },
                    ]}
                />
                <SearchInput value={search} onChange={(v) => setParam('search', v)} placeholder="Search event, customer, venue…" className="w-full sm:w-72" />
            </div>
            <Card padded={false}>
                <QueryState query={q}>
                    {() => (
                        <DataTable
                            rows={rows}
                            rowKey={(r) => r.assignment_id}
                            onRowClick={(r) => navigate(`/photographer/event/${r.id}`)}
                            empty={<EmptyState title={search ? 'No matching events' : 'No events assigned'} description={search ? 'Try a different search.' : 'Your studio manager assigns you to events.'} />}
                            columns={[
                                { key: 'date', header: 'Date', cell: (r) => <span className="whitespace-nowrap">{date(r.event_date)}{r.start_time ? <span className="block text-xs text-stone-500">{time(r.start_time)}{r.end_time ? ` – ${time(r.end_time)}` : ''}</span> : null}</span> },
                                { key: 'event', header: 'Event', cell: (r) => <span><span className="font-medium">{r.title}</span><span className="block text-xs text-stone-500">{r.event_code} · {r.customer_name}</span></span> },
                                { key: 'venue', header: 'Venue', cell: (r) => r.venue ?? '—', hideOnMobile: true },
                                { key: 'role', header: 'Role', cell: (r) => `${titleCase(r.role)}${r.camera_label ? ` · ${r.camera_label}` : ''}`, hideOnMobile: true },
                                { key: 'photos', header: 'Photos', cell: (r) => <span className="whitespace-nowrap">{num(r.my_uploads)} / {num(r.photo_count)}</span>, hideOnMobile: true },
                                { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                {
                                    key: 'go',
                                    header: '',
                                    cell: (r) =>
                                        UPLOADABLE.includes(r.status) ? (
                                            <ButtonLink size="sm" to={`/photographer/upload?event=${r.id}`} onClick={(e) => e.stopPropagation()}>
                                                Upload
                                            </ButtonLink>
                                        ) : null,
                                },
                            ]}
                        />
                    )}
                </QueryState>
            </Card>
        </div>
    );
}
