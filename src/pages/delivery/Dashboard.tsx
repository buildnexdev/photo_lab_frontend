import { useQuery } from '@tanstack/react-query';
import { ClipboardList, PackageCheck, Printer, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { DataTable, EmptyState, QueryState, StatCard, StatusBadge } from '../../components/data';
import { Card, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { num, relative, titleCase } from '../../lib/format';

interface DashboardData {
    print: { status: string; kind: string; n: number }[];
    delivery: { status: string; method: string; n: number }[];
    mine: { prints: number; deliveries: number } | null;
    readyOrders: { id: number; order_no: string; type: string; delivery_method: string; updated_at: string; customer_name: string; customer_phone: string | null; delivery_id: number | null; delivery_status: string | null }[];
}

const sum = (rows: { status: string; n: number }[], statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + Number(r.n), 0);

export default function DeliveryDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const q = useQuery({ queryKey: ['delivery', 'dashboard'], queryFn: () => api.get<DashboardData>('/api/delivery/dashboard'), refetchInterval: 60_000 });
    return (
        <div>
            <PageHeader title={`Hello, ${user?.name.split(' ')[0] ?? ''}`} subtitle="Today's production and delivery work." />
            <QueryState query={q}>
                {(d) => {
                    const kinds = ['PRINT', 'FRAME', 'CANVAS', 'ALBUM'].map((k) => ({ kind: k, n: d.print.filter((r) => r.kind === k && ['QUEUED', 'PRINTING', 'PRINTED'].includes(r.status)).reduce((s, r) => s + Number(r.n), 0) }));
                    return (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <StatCard label="Waiting to print" value={num(sum(d.print, ['QUEUED']))} icon={<ClipboardList className="size-5" />} tone="sky" onClick={() => navigate('/delivery/printing?status=QUEUED')} />
                                <StatCard label="Printing now" value={num(sum(d.print, ['PRINTING', 'PRINTED']))} icon={<Printer className="size-5" />} tone="violet" onClick={() => navigate('/delivery/printing')} />
                                <StatCard label="Ready to hand over" value={num(sum(d.delivery, ['READY']))} icon={<PackageCheck className="size-5" />} tone="emerald" onClick={() => navigate('/delivery/dispatch?status=READY')} />
                                <StatCard label="Out for delivery" value={num(sum(d.delivery, ['DISPATCHED', 'IN_TRANSIT']))} icon={<Truck className="size-5" />} tone="brand" onClick={() => navigate('/delivery/dispatch?status=DISPATCHED')} />
                            </div>
                            <div className="grid gap-6 lg:grid-cols-3">
                                <Card
                                    title="Ready orders"
                                    className="lg:col-span-2"
                                    padded={false}
                                    actions={
                                        <Link to="/delivery/dispatch" className="text-sm text-brand-700 hover:underline">
                                            Dispatch board
                                        </Link>
                                    }
                                >
                                    <DataTable
                                        rows={d.readyOrders}
                                        rowKey={(r) => r.id}
                                        onRowClick={(r) => navigate(`/delivery/dispatch?search=${encodeURIComponent(r.order_no)}`)}
                                        empty={<EmptyState title="No orders waiting" description="Orders appear here when all their printing is done." />}
                                        columns={[
                                            { key: 'no', header: 'Order', cell: (r) => <span className="font-medium">{r.order_no}</span> },
                                            { key: 'customer', header: 'Customer', cell: (r) => <span>{r.customer_name}<span className="block text-xs text-stone-500">{r.customer_phone}</span></span> },
                                            { key: 'method', header: 'Method', cell: (r) => titleCase(r.delivery_method), hideOnMobile: true },
                                            { key: 'since', header: 'Ready since', cell: (r) => relative(r.updated_at), hideOnMobile: true },
                                            { key: 'status', header: 'Delivery', cell: (r) => (r.delivery_status ? <StatusBadge status={r.delivery_status} /> : '—') },
                                        ]}
                                    />
                                </Card>
                                <div className="space-y-6">
                                    <Card title="Assigned to me">
                                        <dl className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <dt className="text-stone-500">Print jobs</dt>
                                                <dd>
                                                    <Link to="/delivery/printing?mine=1" className="font-semibold text-brand-700 hover:underline">
                                                        {num(d.mine?.prints)}
                                                    </Link>
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-stone-500">Deliveries</dt>
                                                <dd>
                                                    <Link to="/delivery/dispatch?mine=1" className="font-semibold text-brand-700 hover:underline">
                                                        {num(d.mine?.deliveries)}
                                                    </Link>
                                                </dd>
                                            </div>
                                        </dl>
                                    </Card>
                                    <Card title="In production by type">
                                        <dl className="space-y-2 text-sm">
                                            {kinds.map((k) => (
                                                <div key={k.kind} className="flex justify-between">
                                                    <dt className="text-stone-500">{titleCase(k.kind)}</dt>
                                                    <dd className="font-semibold">{num(k.n)}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    );
                }}
            </QueryState>
        </div>
    );
}
