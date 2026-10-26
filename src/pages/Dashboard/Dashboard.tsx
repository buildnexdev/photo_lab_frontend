// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { BarChart3, CalendarCheck, CalendarClock, Clock, Download, Eye, IndianRupee, Inbox, PieChart as PieIcon, ShoppingBag, TrendingUp, Users, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChartCard, DonutChart, HBarChart, TrendChart, VIVID_COLORS } from '../../components/ui/Charts';
import { EmptyState, ErrorState, Loading, StatusBadge } from '../../components/ui/Data';
import { RangeFilter, rangeQuery, useRangeParams } from '../../components/ui/RangeFilter';
import { Card, PageHeader } from '../../components/ui';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { date, dateTime, money, num, time, titleCase, todayYmd } from '../../utils/format';
import './Dashboard.scss';

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

const KPI_GRADIENTS = {
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
    amber: 'from-amber-400 to-orange-500 shadow-orange-500/25',
    ink: 'from-zinc-800 to-zinc-950 shadow-zinc-900/25',
    rose: 'from-rose-500 to-pink-600 shadow-rose-500/25',
    indigo: 'from-indigo-500 to-blue-600 shadow-indigo-500/25',
    violet: 'from-violet-500 to-fuchsia-600 shadow-violet-500/25',
    sky: 'from-sky-500 to-cyan-600 shadow-sky-500/25',
    gold: 'from-[#e6c97a] to-[#9c7a30] shadow-[#9c7a30]/25',
    lime: 'from-lime-500 to-green-600 shadow-green-500/25',
    orange: 'from-orange-500 to-red-500 shadow-red-500/25',
} as const;

function KpiCard({ label, value, hint, icon, tone, onClick }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone: keyof typeof KPI_GRADIENTS; onClick?: () => void }) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={clsx(
                'group relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left text-white shadow-lg transition-transform duration-200',
                KPI_GRADIENTS[tone],
                onClick && 'cursor-pointer hover:-translate-y-0.5',
            )}
        >
            <span className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/10" />
            <span className="pointer-events-none absolute -bottom-8 right-6 size-16 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-3">
                <p className="line-clamp-2 text-[11px] font-semibold uppercase leading-snug tracking-wider text-white/80">{label}</p>
                <span className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25 backdrop-blur-sm', tone === 'ink' && 'text-[#e6c97a]')}>{icon}</span>
            </div>
            <p className="relative mt-2 truncate text-2xl font-bold tracking-tight">{value}</p>
            {hint && <p className="relative mt-1 line-clamp-1 text-xs font-medium text-white/80">{hint}</p>}
        </Tag>
    );
}

function ListHeading({ title, icon, color }: { title: string; icon: ReactNode; color: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg text-white shadow-sm" style={{ background: color }}>
                {icon}
            </span>
            <h2 className="font-semibold text-stone-900">{title}</h2>
        </div>
    );
}

const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { can, user } = useAuth();
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
        <div className="dashboard-page space-y-4">
            <section className="dashboard-hero relative overflow-hidden rounded-2xl p-4 text-white sm:p-5">
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e6c97a]">Performance snapshot</p>
                        <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
                            {greeting()}, {user?.name?.split(' ')[0] ?? 'there'}
                        </h2>
                        <p className="mt-1 text-sm text-white/70">
                            {d ? `${d.range.label} · ${date(d.range.from)} – ${date(d.range.to)}` : 'Studio performance at a glance'}
                        </p>
                    </div>
                    <div className="dashboard-hero__filter">
                        <RangeFilter value={range} onChange={setRange} />
                    </div>
                </div>
                {!rq && <p className="relative mt-3 text-sm text-white/70">Choose a custom date range and press Apply.</p>}
            </section>
            {q.isLoading && <Loading />}
            {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
            {d && (
                <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <KpiCard label="Today's revenue" value={money(d.cards.todaysRevenue, true)} hint={`${d.cards.todaysPayments} payments today`} icon={<IndianRupee className="size-5" />} tone="emerald" onClick={() => navigate(`/admin/payments?from=${todayYmd()}&to=${todayYmd()}`)} />
                        <KpiCard label={`Revenue · ${d.range.label}`} value={money(d.cards.rangeRevenue, true)} hint="Selected period" icon={<TrendingUp className="size-5" />} tone="indigo" onClick={() => navigate('/admin/reports?type=revenue')} />
                        <KpiCard label="Total revenue" value={money(d.cards.totalRevenue, true)} hint="All time, net of refunds" icon={<Wallet className="size-5" />} tone="ink" />
                        <KpiCard label="Pending payments" value={money(d.cards.pendingPayments, true)} hint={`${d.cards.pendingPaymentBookings} bookings with balance`} icon={<Clock className="size-5" />} tone="rose" onClick={() => navigate('/admin/bookings')} />
                        <KpiCard label="Bookings" value={num(d.cards.rangeBookings)} hint={`${num(d.cards.totalBookings)} all time`} icon={<CalendarCheck className="size-5" />} tone="sky" onClick={() => navigate('/admin/bookings')} />
                        <KpiCard label="New enquiries" value={num(d.cards.newEnquiries)} hint="Awaiting quotation" icon={<Inbox className="size-5" />} tone="violet" onClick={() => navigate('/admin/bookings?status=ENQUIRY')} />
                        <KpiCard label="Upcoming events" value={num(d.cards.upcomingEvents)} hint={d.cards.activeEvents ? `${d.cards.activeEvents} live / in progress` : 'Nothing live right now'} icon={<CalendarClock className="size-5" />} tone="amber" onClick={() => navigate('/admin/events?status=UPCOMING')} />
                        <KpiCard label="Customers" value={num(d.cards.totalCustomers)} hint={`${num(d.cards.newCustomers)} new in period`} icon={<Users className="size-5" />} tone="gold" onClick={() => navigate('/admin/customers')} />
                        <KpiCard label="Photo sales" value={num(d.cards.photoSales)} hint={`${money(d.cards.photoSalesAmount, true)} · ${num(d.cards.paidDownloads)} downloads`} icon={<Download className="size-5" />} tone="lime" onClick={() => navigate('/admin/reports?type=photo-sales')} />
                        <KpiCard label="Open orders" value={num(d.cards.pendingOrders)} hint={d.cards.unpaidOrders ? `${d.cards.unpaidOrders} awaiting payment` : 'All paid'} icon={<ShoppingBag className="size-5" />} tone="orange" onClick={() => navigate('/admin/orders')} />
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        <ChartCard title={`Revenue · ${money(sum(d.charts.revenue, 'revenue'), true)}`} empty={!sum(d.charts.revenue, 'revenue')} accent={VIVID_COLORS[0]} icon={<IndianRupee className="size-4" />}>
                            <TrendChart data={d.charts.revenue} dataKey="revenue" isMoney label="Revenue" color={VIVID_COLORS[0]} />
                        </ChartCard>
                        <ChartCard title={`Bookings · ${sum(d.charts.bookings, 'bookings')}`} empty={!sum(d.charts.bookings, 'bookings')} accent={VIVID_COLORS[1]} icon={<CalendarCheck className="size-4" />}>
                            <TrendChart data={d.charts.bookings} dataKey="bookings" kind="bar" color={VIVID_COLORS[1]} label="Bookings" />
                        </ChartCard>
                        <ChartCard title="Payments by status" empty={!d.charts.payments.length} accent={VIVID_COLORS[5]} icon={<PieIcon className="size-4" />}>
                            <DonutChart data={d.charts.payments as unknown as Record<string, unknown>[]} nameKey="status" valueKey="count" colors={VIVID_COLORS} />
                        </ChartCard>
                        <ChartCard title={`Photo views · ${num(sum(d.charts.photoViews, 'views'))}`} empty={!sum(d.charts.photoViews, 'views')} accent={VIVID_COLORS[2]} icon={<Eye className="size-4" />}>
                            <TrendChart data={d.charts.photoViews} dataKey="views" kind="line" color={VIVID_COLORS[2]} label="Views" />
                        </ChartCard>
                        <ChartCard title={`Photo downloads · ${num(sum(d.charts.photoDownloads, 'downloads'))}`} empty={!sum(d.charts.photoDownloads, 'downloads')} accent={VIVID_COLORS[3]} icon={<Download className="size-4" />}>
                            <TrendChart data={d.charts.photoDownloads} dataKey="downloads" kind="bar" color={VIVID_COLORS[3]} label="Downloads" />
                        </ChartCard>
                        <ChartCard title="Event performance (revenue)" empty={!d.charts.eventPerformance.length} accent={VIVID_COLORS[4]} icon={<BarChart3 className="size-4" />}>
                            <HBarChart data={d.charts.eventPerformance as unknown as Record<string, unknown>[]} labelKey="title" valueKey="revenue" isMoney color={VIVID_COLORS[4]} />
                        </ChartCard>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-3">
                        <Card title={<ListHeading title="Upcoming events" icon={<CalendarClock className="size-4" />} color={VIVID_COLORS[4]} />} padded={false} actions={<Link to="/admin/events" className="link text-sm">All</Link>}>
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
                        <Card title={<ListHeading title="Latest bookings" icon={<CalendarCheck className="size-4" />} color={VIVID_COLORS[1]} />} padded={false} actions={<Link to="/admin/bookings" className="link text-sm">All</Link>}>
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
                        <Card title={<ListHeading title="Latest payments" icon={<Wallet className="size-4" />} color={VIVID_COLORS[0]} />} padded={false} actions={<Link to="/admin/payments" className="link text-sm">All</Link>}>
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
