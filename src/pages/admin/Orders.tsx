import { useQuery } from '@tanstack/react-query';
import { DataTable, EmptyState, Pagination, QueryState, SearchInput, StatusBadge } from '../../components/data';
import { Select } from '../../components/form';
import { OrderManageDrawer } from '../../components/OrderManageDrawer';
import { Card, PageHeader } from '../../components/ui';
import { api, type Paged } from '../../lib/api';
import { date, money, titleCase } from '../../lib/format';
import { useListParams, useOpenParam } from '../../lib/hooks';
import { ORDER_STATUSES, ORDER_TYPE_LABELS, ORDER_TYPES, type OrderRow } from '../../lib/types';

export function OrdersTable({ base, title, subtitle }: { base: 'admin' | 'delivery'; title: string; subtitle: string }) {
    const { page, search, filters, setPage, setSearch, setFilter } = useListParams(['status', 'type'] as const);
    const [openId, setOpenId] = useOpenParam();
    const q = useQuery({
        queryKey: ['orders', 'staff', page, search, filters],
        queryFn: () => api.get<Paged<OrderRow>>('/api/orders', { page, pageSize: 25, search, status: filters.status, type: filters.type }),
        placeholderData: (p) => p,
    });
    return (
        <div>
            <PageHeader title={title} subtitle={subtitle} />
            <Card padded={false}>
                <div className="flex flex-wrap gap-3 border-b border-stone-100 p-4">
                    <SearchInput value={search} onChange={setSearch} placeholder="Order no., customer or phone" className="w-full max-w-xs" />
                    <Select wrapperClassName="w-44" aria-label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="All statuses" options={ORDER_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                    <Select wrapperClassName="w-44" aria-label="Type" value={filters.type} onChange={(e) => setFilter('type', e.target.value)} placeholder="All types" options={ORDER_TYPES.map((t) => ({ value: t, label: ORDER_TYPE_LABELS[t] }))} />
                </div>
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                onRowClick={(r) => setOpenId(r.id)}
                                empty={<EmptyState title="No orders match these filters" />}
                                columns={[
                                    {
                                        key: 'no',
                                        header: 'Order',
                                        cell: (r) => (
                                            <div>
                                                <p className="font-medium text-stone-900">{r.order_no}</p>
                                                <p className="text-xs text-stone-500">
                                                    {ORDER_TYPE_LABELS[r.type]} · {r.item_count} item(s)
                                                </p>
                                            </div>
                                        ),
                                    },
                                    { key: 'customer', header: 'Customer', cell: (r) => r.customer_name },
                                    { key: 'event', header: 'Event', cell: (r) => r.event_title ?? '—', hideOnMobile: true },
                                    { key: 'date', header: 'Placed', cell: (r) => date(r.created_at), hideOnMobile: true },
                                    { key: 'delivery', header: 'Delivery', cell: (r) => (r.delivery_status ? <StatusBadge status={r.delivery_status} /> : titleCase(r.delivery_method)), hideOnMobile: true },
                                    { key: 'total', header: 'Total', cell: (r) => money(r.total) },
                                    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} label={r.status === 'CREATED' ? 'Unpaid' : undefined} /> },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
            <OrderManageDrawer id={openId} onClose={() => setOpenId(null)} links={base} />
        </div>
    );
}

export default function AdminOrders() {
    return <OrdersTable base="admin" title="Orders" subtitle="HD downloads, prints, frames, canvases, albums and packages." />;
}
