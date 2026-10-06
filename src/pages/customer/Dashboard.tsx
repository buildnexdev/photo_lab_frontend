// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CalendarCheck, CreditCard, Images, ShoppingBag, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { EmptyState, QueryState, StatCard, StatusBadge } from '../../components/data';
import { ButtonLink, Card, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { date, money, titleCase } from '../../lib/format';
import { ORDER_TYPE_LABELS, type BookingStatus, type OrderType } from '../../lib/types';

interface PortalDashboard {
    summary: { bookings: number; balance_due: number; active_orders: number; unpaid_orders: number; proofs_to_review: number; unread: number };
    bookings: { id: number; booking_no: string; event_type: string; event_date: string; status: BookingStatus; total_amount: number; paid_amount: number; package_name: string | null }[];
    events: { id: number; title: string; event_date: string; status: string; gallery_id: number | null; gallery_status: string | null; photo_count: number }[];
    galleries: { id: number; title: string; status: string; event_title: string; event_date: string; photo_count: number; cover_url: string | null }[];
    orders: { id: number; order_no: string; type: OrderType; status: string; total: number; created_at: string }[];
    payments: { id: number; payment_no: string; purpose: string; amount: number; status: string; paid_at: string | null; created_at: string }[];
}

export default function CustomerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const q = useQuery({ queryKey: ['portal', 'dashboard'], queryFn: () => api.get<PortalDashboard>('/api/portal/dashboard') });
    return (
        <div>
            <PageHeader title={`Hello, ${user?.name.split(' ')[0] ?? 'there'}`} subtitle="Everything about your shoots in one place." actions={<ButtonLink to="/customer/bookings?new=1">Book a shoot</ButtonLink>} />
            <QueryState query={q}>
                {(d) => (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <StatCard label="Bookings" value={d.summary.bookings} icon={<CalendarCheck className="size-5" />} tone="brand" onClick={() => navigate('/customer/bookings')} />
                            <StatCard label="Balance due" value={money(d.summary.balance_due)} icon={<Wallet className="size-5" />} tone={d.summary.balance_due > 0 ? 'rose' : 'emerald'} onClick={() => navigate('/customer/bookings')} />
                            <StatCard label="Active orders" value={d.summary.active_orders} hint={d.summary.unpaid_orders ? `${d.summary.unpaid_orders} awaiting payment` : undefined} icon={<ShoppingBag className="size-5" />} tone="sky" onClick={() => navigate('/customer/orders')} />
                            <StatCard label="Album proofs to review" value={d.summary.proofs_to_review} icon={<BookOpen className="size-5" />} tone="violet" onClick={() => navigate('/customer/events')} />
                        </div>

                        {d.galleries.length > 0 && (
                            <Card title="Your galleries" actions={<Link to="/customer/galleries" className="link text-sm">View all</Link>}>
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                    {d.galleries.map((g) => (
                                        <Link key={g.id} to={`/customer/galleries/${g.id}`} className="group overflow-hidden rounded-lg border border-stone-200">
                                            <div className="aspect-[4/3] bg-stone-100">
                                                {g.cover_url ? <img src={g.cover_url} alt="" draggable={false} className="protected-img size-full object-cover transition-transform group-hover:scale-105" /> : <Images className="m-auto size-full p-10 text-stone-300" />}
                                            </div>
                                            <div className="p-3">
                                                <p className="truncate font-medium">{g.title}</p>
                                                <p className="text-xs text-stone-500">
                                                    {date(g.event_date)} · {g.photo_count} photos
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </Card>
                        )}

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card title="Recent bookings" actions={<Link to="/customer/bookings" className="link text-sm">All bookings</Link>} padded={false}>
                                {d.bookings.length ? (
                                    <ul className="divide-y divide-stone-100">
                                        {d.bookings.map((b) => (
                                            <li key={b.id}>
                                                <Link to={`/customer/bookings?open=${b.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 sm:px-5">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">
                                                            {b.event_type} · {date(b.event_date)}
                                                        </p>
                                                        <p className="text-xs text-stone-500">
                                                            {b.booking_no}
                                                            {b.package_name && ` · ${b.package_name}`}
                                                        </p>
                                                    </div>
                                                    <StatusBadge status={b.status} />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <EmptyState title="No bookings yet" action={<ButtonLink to="/customer/bookings?new=1" size="sm">Book a shoot</ButtonLink>} />
                                )}
                            </Card>
                            <Card title="Recent orders" actions={<Link to="/customer/orders" className="link text-sm">All orders</Link>} padded={false}>
                                {d.orders.length ? (
                                    <ul className="divide-y divide-stone-100">
                                        {d.orders.map((o) => (
                                            <li key={o.id}>
                                                <Link to={`/customer/orders?open=${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 sm:px-5">
                                                    <div>
                                                        <p className="font-medium">{ORDER_TYPE_LABELS[o.type]}</p>
                                                        <p className="text-xs text-stone-500">
                                                            {o.order_no} · {money(o.total)}
                                                        </p>
                                                    </div>
                                                    <StatusBadge status={o.status} />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <EmptyState title="No orders yet" description="Buy HD photos or order prints from your gallery." />
                                )}
                            </Card>
                        </div>
                        <Card title="Recent payments" actions={<Link to="/customer/payments" className="link text-sm">All payments</Link>} padded={false}>
                            {d.payments.length ? (
                                <ul className="divide-y divide-stone-100">
                                    {d.payments.map((p) => (
                                        <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                                            <div>
                                                <p className="font-medium">
                                                    {money(p.amount)} <span className="font-normal text-stone-500">· {titleCase(p.purpose)}</span>
                                                </p>
                                                <p className="text-xs text-stone-500">
                                                    {p.payment_no} · {date(p.paid_at ?? p.created_at)}
                                                </p>
                                            </div>
                                            <StatusBadge status={p.status} />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState icon={<CreditCard className="size-10" />} title="No payments yet" />
                            )}
                        </Card>
                    </div>
                )}
            </QueryState>
        </div>
    );
}
