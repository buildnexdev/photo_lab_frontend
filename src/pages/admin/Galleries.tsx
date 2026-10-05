import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { DataTable, EmptyState, Pagination, QueryState, SearchInput, StatusBadge } from '../../components/data';
import { Select } from '../../components/form';
import { Card, PageHeader } from '../../components/ui';
import { api, type Paged } from '../../lib/api';
import { date, num, titleCase } from '../../lib/format';
import { useListParams } from '../../lib/hooks';
import { GALLERY_STATUSES } from '../../lib/types';

interface GalleryListRow {
    id: number;
    title: string;
    status: string;
    watermark_enabled: number;
    allow_download: number;
    expires_at: string | null;
    event_id: number;
    event_code: string;
    event_title: string;
    event_date: string;
    customer_name: string;
    photo_count: number;
    published_count: number;
    active_qr: number;
    opens: number;
}

export default function AdminGalleries() {
    const navigate = useNavigate();
    const { page, search, filters, setPage, setSearch, setFilter } = useListParams(['status'] as const);
    const q = useQuery({
        queryKey: ['galleries', 'admin', page, search, filters],
        queryFn: () => api.get<Paged<GalleryListRow>>('/api/galleries', { page, pageSize: 25, search, status: filters.status }),
        placeholderData: (p) => p,
    });
    return (
        <div>
            <PageHeader title="Galleries" subtitle="Visibility, watermarking, albums and QR access for every event gallery." />
            <Card padded={false}>
                <div className="flex flex-wrap items-end gap-3 border-b border-stone-100 p-4">
                    <SearchInput value={search} onChange={setSearch} placeholder="Gallery, event or customer" className="w-full max-w-xs" />
                    <Select wrapperClassName="w-44" aria-label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="All statuses" options={GALLERY_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                </div>
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                onRowClick={(r) => navigate(`/admin/galleries/${r.id}`)}
                                empty={<EmptyState title="No galleries found" description="A gallery is created automatically with every event." />}
                                columns={[
                                    {
                                        key: 'title',
                                        header: 'Gallery',
                                        cell: (r) => (
                                            <div>
                                                <p className="font-medium text-stone-900">{r.title}</p>
                                                <p className="text-xs text-stone-500">
                                                    {r.event_code} · {date(r.event_date)} · {r.customer_name}
                                                </p>
                                            </div>
                                        ),
                                    },
                                    { key: 'photos', header: 'Published', cell: (r) => `${num(r.published_count)} / ${num(r.photo_count)}` },
                                    { key: 'qr', header: 'Active QR', cell: (r) => num(r.active_qr), hideOnMobile: true },
                                    { key: 'opens', header: 'Opens', cell: (r) => num(r.opens), hideOnMobile: true },
                                    { key: 'wm', header: 'Protection', cell: (r) => `${r.watermark_enabled ? 'Watermark' : 'No watermark'}${r.allow_download ? '' : ' · no downloads'}`, hideOnMobile: true },
                                    { key: 'exp', header: 'Expires', cell: (r) => (r.expires_at ? date(r.expires_at) : 'Never'), hideOnMobile: true },
                                    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
        </div>
    );
}
