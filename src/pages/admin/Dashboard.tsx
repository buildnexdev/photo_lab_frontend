// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CalendarClock, Clock, Download, IndianRupee, Inbox, ShoppingBag, TrendingUp, Users, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ChartCard, DonutChart, HBarChart, TrendChart, CHART_COLORS } from '../../components/charts';
import { EmptyState, ErrorState, Loading, StatCard, StatusBadge } from '../../components/data';
import { RangeFilter, rangeQuery, useRangeParams } from '../../components/RangeFilter';
import { Card, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { date, dateTime, money, num, time, titleCase, todayYmd } from '../../lib/format';

type Point = { day: string } & Record<string, number | string>;
interface DashboardData {
    range: { from: string; to: string; label: string };
    cards: Record<
        'totalRevenue' | 'rangeRevenue' | 'todaysRevenue' | 'todaysPayments' | 'pendingPayments' | 'pendingPaymentBookings' | 'totalBookings' | 'rangeBookings' | 'newEnquiries' | 'upcomingEvents' | 'activeEvents' | 'totalCustomers' | 'newCustomers' | 'photoSales' | 'photoSalesAmount' | 'paidDownloads' | 'pendingOrders' | 'unpaidOrders',
        number
    >;
    charts: {
        revenue: Point[];
        bookings: Point[];
        payments: { status: string; count: number; amount: number }[];
        photoViews: Point[];
        photoDownloads: Point[];
        eventPerformance: { id: number; title: string; views: number; downloads: number; revenue: number }[];
    };
    recent: {
        bookings: { id: number; booking_no: string; event_type: string; event_date: string; status: string; total_amount: number; customer_name: string }[];
        payments: { id: number; payment_no: string; purpose: string; amount: number; status: string; paid_at: string | null; created_at: string; customer_name: string }[];
        upcomingEvents: { id: number; event_code: string; title: string; event_date: string; start_time: string | null; venue: string | null; status: string; customer_name: string; staff_count: number }[];
    };
}

const sum = (pts: Point[], k: string) => pts.reduce((s, p) => s + Number(p[k] ?? 0), 0);

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { can } = useAuth();
    const [range, setRange] = useRangeParams('this_month');
    const rq = rangeQuery(range);
    const q = useQuery({
        queryKey: ['reports', 'dashboard', rq],
        queryFn: () => api.get<DashboardData>('/api/reports/dashboard', rq ?? undefined),
        enabled: !!rq && can('dashboard.view', 'reports.view'),
        placeholderData: (p) => p,
        refetchInterval: 120_000,
    });

    if (!can('dashboard.view', 'reports.view')) {
        return (
            <div>
                <PageHeader title="Welcome" subtitle="Use the menu to get to your work." />
                <EmptyState title="Your role does not include the business dashboard" />
            </div>
        );
    }

    const d = q.data;
    return (
        <div className="space-y-6">
            <PageHeader title="Dashboard" subtitle={d ? `${d.range.label} · ${date(d.range.from)} – ${date(d.range.to)}` : 'Studio performance at a glance'} actions={<RangeFilter value={range} onChange={setRange} />} />
            {!rq && <p className="text-sm text-stone-500">Choose a custom date range and press Apply.</p>}
            {q.isLoading && <Loading />}
            {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
            {d && (
                <>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                        <StatCard label="Today's revenue" value={money(d.cards.todaysRevenue, true)} hint={`${d.cards.todaysPayments} payments today`} icon={<IndianRupee className="size-5" />} tone="emerald" onClick={() => navigate(`/admin/payments?from=${todayYmd()}&to=${todayYmd()}`)} />
                        <StatCard label={`Revenue · ${d.range.label}`} value={money(d.cards.rangeRevenue, true)} icon={<TrendingUp className="size-5" />} tone="brand" onClick={() => navigate('/admin/reports?type=revenue')} />
                        <StatCard label="Total revenue" value={money(d.cards.totalRevenue, true)} hint="All time, net of refunds" icon={<Wallet className="size-5" />} tone="stone" />
                        <StatCard label="Pending payments" value={money(d.cards.pendingPayments, true)} hint={`${d.cards.pendingPaymentBookings} bookings with balance`} icon={<Clock className="size-5" />} tone="rose" onClick={() => navigate('/admin/bookings')} />
                        <StatCard label="Bookings" value={num(d.cards.rangeBookings)} hint={`${num(d.cards.totalBookings)} all time`} icon={<CalendarCheck className="size-5" />} tone="sky" onClick={() => navigate('/admin/bookings')} />
                        <StatCard label="New enquiries" value={num(d.cards.newEnquiries)} hint="Awaiting quotation" icon={<Inbox className="size-5" />} tone="violet" onClick={() => navigate('/admin/bookings?status=ENQUIRY')} />
                        <StatCard label="Upcoming events" value={num(d.cards.upcomingEvents)} hint={d.cards.activeEvents ? `${d.cards.activeEvents} live / in progress` : undefined} icon={<CalendarClock className="size-5" />} tone="sky" onClick={() => navigate('/admin/events?status=UPCOMING')} />
                        <StatCard label="Customers" value={num(d.cards.totalCustomers)} hint={`${num(d.cards.newCustomers)} new in period`} icon={<Users className="size-5" />} tone="stone" onClick={() => navigate('/admin/customers')} />
                        <StatCard label="Photo sales" value={num(d.cards.photoSales)} hint={`${money(d.cards.photoSalesAmount, true)} · ${num(d.cards.paidDownloads)} downloads`} icon={<Download className="size-5" />} tone="emerald" onClick={() => navigate('/admin/reports?type=photo-sales')} />
                        <StatCard label="Open orders" value={num(d.cards.pendingOrders)} hint={d.cards.unpaidOrders ? `${d.cards.unpaidOrders} awaiting payment` : 'All paid'} icon={<ShoppingBag className="size-5" />} tone="brand" onClick={() => navigate('/admin/orders')} />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <ChartCard title={`Revenue · ${money(sum(d.charts.revenue, 'revenue'), true)}`} empty={!sum(d.charts.revenue, 'revenue')}>
                            <TrendChart data={d.charts.revenue} dataKey="revenue" isMoney label="Revenue" />
                        </ChartCard>
                        <ChartCard title={`Bookings · ${sum(d.charts.bookings, 'bookings')}`} empty={!sum(d.charts.bookings, 'bookings')}>
                            <TrendChart data={d.charts.bookings} dataKey="bookings" kind="bar" color={CHART_COLORS[1]} label="Bookings" />
                        </ChartCard>
                        <ChartCard title="Payments by status" empty={!d.charts.payments.length}>
                            <DonutChart data={d.charts.payments as unknown as Record<string, unknown>[]} nameKey="status" valueKey="count" />
                        </ChartCard>
                        <ChartCard title={`Photo views · ${num(sum(d.charts.photoViews, 'views'))}`} empty={!sum(d.charts.photoViews, 'views')}>
                            <TrendChart data={d.charts.photoViews} dataKey="views" kind="line" color={CHART_COLORS[3]} label="Views" />
                        </ChartCard>
                        <ChartCard title={`Photo downloads · ${num(sum(d.charts.photoDownloads, 'downloads'))}`} empty={!sum(d.charts.photoDownloads, 'downloads')}>
                            <TrendChart data={d.charts.photoDownloads} dataKey="downloads" kind="bar" color={CHART_COLORS[2]} label="Downloads" />
                        </ChartCard>
                        <ChartCard title="Event performance (revenue)" empty={!d.charts.eventPerformance.length}>
                            <HBarChart data={d.charts.eventPerformance as unknown as Record<string, unknown>[]} labelKey="title" valueKey="revenue" isMoney />
                        </ChartCard>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-3">
                        <Card title="Upcoming events" padded={false} actions={<Link to="/admin/events" className="link text-sm">All</Link>}>
                            {d.recent.upcomingEvents.length ? (
                                <ul className="divide-y divide-stone-100">
                                    {d.recent.upcomingEvents.map((e) => (
                                        <li key={e.id}>
                                            <Link to={`/admin/events/${e.id}`} className="block px-4 py-3 hover:bg-stone-50">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="truncate font-medium">{e.title}</p>
                                                    <StatusBadge status={e.status} />
                                                </div>
                                                <p className="text-xs text-stone-500">
                                                    {date(e.event_date)}
                                                    {e.start_time && ` · ${time(e.start_time)}`} · {e.customer_name} · {e.staff_count ? `${e.staff_count} staff` : <span className="text-red-600">no staff assigned</span>}
                                                </p>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState title="No upcoming events" />
                            )}
                        </Card>
                        <Card title="Latest bookings" padded={false} actions={<Link to="/admin/bookings" className="link text-sm">All</Link>}>
                            {d.recent.bookings.length ? (
                                <ul className="divide-y divide-stone-100">
                                    {d.recent.bookings.map((b) => (
                                        <li key={b.id}>
                                            <Link to={`/admin/bookings?open=${b.id}`} className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-stone-50">
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">{b.customer_name}</p>
                                                    <p className="text-xs text-stone-500">
                                                        {b.booking_no} · {b.event_type} · {date(b.event_date)}
                                                    </p>
                                                </div>
                                                <StatusBadge status={b.status} />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState title="No bookings yet" />
                            )}
                        </Card>
                        <Card title="Latest payments" padded={false} actions={<Link to="/admin/payments" className="link text-sm">All</Link>}>
                            {d.recent.payments.length ? (
                                <ul className="divide-y divide-stone-100">
                                    {d.recent.payments.map((p) => (
                                        <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">
                                                    {money(p.amount)} · {p.customer_name}
                                                </p>
                                                <p className="text-xs text-stone-500">
                                                    {titleCase(p.purpose)} · {dateTime(p.paid_at ?? p.created_at)}
                                                </p>
                                            </div>
                                            <StatusBadge status={p.status} />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState title="No payments yet" />
                            )}
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
