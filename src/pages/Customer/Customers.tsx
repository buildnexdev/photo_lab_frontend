// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 25-10-2026
import { useQuery } from '@tanstack/react-query';
import { UserCheck } from 'lucide-react';
import { useState } from 'react';
import { DataTable, EmptyState, Pagination, QueryState, TableHeaderToolbar } from '../../components/ui/Data';
import { Card } from '../../components/ui';
import { CustomerDrawer } from '../../components/customer/CustomerDrawer';
import { api, type Paged } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { date, money, titleCase } from '../../utils/format';
import { useListParams, useOpenParam, useViewMode } from '../../hooks';
import './Customers.scss';

interface CustomerRow {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    source: string;
    user_id: number | null;
    created_at: string;
    bookings: number;
    events: number;
    lifetime_value: number;
}

export default function AdminCustomers() {
    const { can } = useAuth();
    const { page, search, setPage, setSearch } = useListParams();
    const [openId, setOpenId] = useOpenParam();
    const [viewMode, setViewMode] = useViewMode();
    const [creating, setCreating] = useState(false);
    const q = useQuery({ queryKey: ['customers', 'list', page, search], queryFn: () => api.get<Paged<CustomerRow>>('/api/customers', { page, pageSize: 25, search }), placeholderData: (p) => p });

    return (
        <div>
            <Card padded={false} className="overflow-hidden">
                <TableHeaderToolbar
                    total={q.data?.total}
                    totalLabel="Customers"
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder="Search name, phone, email or city"
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onAdd={can('customers.manage') ? () => setCreating(true) : undefined}
                    addLabel="Add Customer"
                />
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                onRowClick={(r) => setOpenId(r.id)}
                                viewMode={viewMode}
                                empty={<EmptyState title={search ? 'No customers match your search' : 'No customers yet'} />}
                                columns={[
                                    {
                                        key: 'name',
                                        header: 'Customer',
                                        cell: (r) => (
                                            <div>
                                                <p className="flex items-center gap-1.5 font-medium text-stone-900">
                                                    {r.name} {r.user_id && <UserCheck className="size-3.5 text-emerald-600" aria-label="Has an online account" />}
                                                </p>
                                                <p className="text-xs text-stone-500">{[r.phone, r.email].filter(Boolean).join(' Â· ')}</p>
                                            </div>
                                        ),
                                    },
                                    { key: 'city', header: 'City', cell: (r) => r.city ?? 'â€”', hideOnMobile: true },
                                    { key: 'bookings', header: 'Bookings', cell: (r) => r.bookings, hideOnMobile: true },
                                    { key: 'events', header: 'Events', cell: (r) => r.events, hideOnMobile: true },
                                    { key: 'ltv', header: 'Lifetime value', cell: (r) => money(r.lifetime_value) },
                                    { key: 'source', header: 'Source', cell: (r) => titleCase(r.source), hideOnMobile: true },
                                    { key: 'since', header: 'Since', cell: (r) => date(r.created_at), hideOnMobile: true },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
            <CustomerDrawer
                id={creating ? 'new' : openId}
                onClose={() => (creating ? setCreating(false) : setOpenId(null))}
                onCreated={(id) => {
                    setCreating(false);
                    setOpenId(id);
                }}
            />
        </div>
    );
}

