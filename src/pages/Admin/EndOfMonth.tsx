// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 27-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { BarChart3, Briefcase, CalendarRange, IndianRupee, Users, Wallet } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, ColorListShell } from '../../components/ui';
import { DataTable, EmptyState, QueryState, StatusBadge } from '../../components/ui/Data';
import { Input, Textarea } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { useInvalidate } from '../../hooks';
import { api } from '../../services/api';
import { money, titleCase } from '../../utils/format';

function monthNow() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function Stat({ label, value, icon, tone }: { label: string; value: ReactNode; icon: ReactNode; tone: string }) {
    return (
        <div className={clsx('relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg', tone)}>
            <span className="pointer-events-none absolute -right-5 -top-5 size-20 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{label}</p>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">{icon}</span>
            </div>
            <p className="relative mt-2 truncate text-2xl font-bold tracking-tight">{value}</p>
        </div>
    );
}

type MonthPreview = {
    periodMonth: string;
    summary: {
        revenueTotal: number;
        refundsTotal: number;
        cashTotal: number;
        nonCashTotal: number;
        bookingsDue: number;
        payrollDraft: number;
        payrollPaid: number;
        commissionTotal: number;
        daysClosed: number;
        net: number;
    };
    memberShares: {
        id: number;
        staff_name: string;
        role: string;
        pay_basis: string;
        share_pct: number | null;
        commission_pct: number | null;
        event_title: string;
        event_code: string;
        event_id: number;
        booking_paid: number;
        booking_total: number;
        payout_status: string;
    }[];
    earnings: { id: number; staff_name: string; type: string; amount: number; event_title: string | null; earning_date: string }[];
    closing: { status: string; net: number } | null;
};

export default function AdminEndOfMonth() {
    const { can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const canManage = can('payments.manage');
    const [periodMonth, setPeriodMonth] = useState(monthNow());
    const [notes, setNotes] = useState('');

    const q = useQuery({
        queryKey: ['closing', 'month', periodMonth],
        queryFn: () => api.get<MonthPreview>('/api/closing/month', { periodMonth }),
    });

    const submit = useMutation({
        mutationFn: () => api.send('POST', '/api/closing/month', { periodMonth, notes: notes.trim() || null }),
        onSuccess: async (r) => {
            toast.success(r.message);
            await invalidate(['closing']);
        },
        onError: (e) => toast.error(e),
    });

    return (
        <div className="space-y-4">
            <ColorListShell
                icon={CalendarRange}
                tone="fuchsia"
                title="End of month"
                subtitle="Monthly revenue, payroll, commissions and member-wise event shares"
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Link to="/admin/closing/day" className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                            End of day
                        </Link>
                        <Link to="/admin/payroll" className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                            Payroll & commissions
                        </Link>
                        <Link to="/admin/reports" className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                            All reports
                        </Link>
                    </div>
                }
            >
                <div className="flex flex-wrap items-end gap-3 border-b border-stone-100 p-3 sm:p-4">
                    <Input label="Period" type="month" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} />
                </div>
                <QueryState query={q}>
                    {(d) => (
                        <div className="space-y-4 p-3 sm:p-4">
                            {d.closing && (
                                <p className="rounded-xl bg-fuchsia-50 px-3 py-2 text-sm text-fuchsia-900">
                                    Month status: <StatusBadge status={d.closing.status} /> · Net {money(d.closing.net)}
                                </p>
                            )}
                            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                                <Stat label="Revenue" value={money(d.summary.revenueTotal, true)} icon={<IndianRupee className="size-5" />} tone="from-emerald-500 to-teal-600" />
                                <Stat label="Cash / non-cash" value={`${money(d.summary.cashTotal, true)}`} icon={<Wallet className="size-5" />} tone="from-amber-400 to-orange-500" />
                                <Stat label="Payroll paid" value={money(d.summary.payrollPaid, true)} icon={<Briefcase className="size-5" />} tone="from-sky-500 to-cyan-600" />
                                <Stat label="Net" value={money(d.summary.net, true)} icon={<BarChart3 className="size-5" />} tone="from-violet-500 to-fuchsia-600" />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                                <div className="rounded-xl border border-stone-200 bg-white p-3">
                                    <p className="text-stone-500">Refunds</p>
                                    <p className="font-semibold">{money(d.summary.refundsTotal)}</p>
                                </div>
                                <div className="rounded-xl border border-stone-200 bg-white p-3">
                                    <p className="text-stone-500">Bookings still due</p>
                                    <p className="font-semibold">{money(d.summary.bookingsDue)}</p>
                                </div>
                                <div className="rounded-xl border border-stone-200 bg-white p-3">
                                    <p className="text-stone-500">Payroll draft</p>
                                    <p className="font-semibold">{money(d.summary.payrollDraft)}</p>
                                </div>
                                <div className="rounded-xl border border-stone-200 bg-white p-3">
                                    <p className="text-stone-500">Commission / share earnings</p>
                                    <p className="font-semibold">{money(d.summary.commissionTotal)}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-stone-200 overflow-hidden">
                                <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 font-semibold">
                                    <Users className="size-4 text-rose-500" /> Member-wise event shares
                                </div>
                                <DataTable
                                    rows={d.memberShares}
                                    rowKey={(r) => r.id}
                                    empty={<EmptyState title="No event team assignments this month" description="Assign staff on events with share or commission to see payouts here." />}
                                    columns={[
                                        {
                                            key: 'staff',
                                            header: 'Member',
                                            cell: (r) => (
                                                <div>
                                                    <p className="font-medium">{r.staff_name}</p>
                                                    <p className="text-xs text-stone-500">{titleCase(r.role)}</p>
                                                </div>
                                            ),
                                        },
                                        {
                                            key: 'event',
                                            header: 'Event',
                                            cell: (r) => (
                                                <Link to={`/admin/events/${r.event_id}`} className="text-sky-700 hover:underline">
                                                    {r.event_title}
                                                    <span className="block text-xs text-stone-500">{r.event_code}</span>
                                                </Link>
                                            ),
                                        },
                                        {
                                            key: 'basis',
                                            header: 'How paid',
                                            cell: (r) => (
                                                <span className="text-xs">
                                                    {titleCase(r.pay_basis)}
                                                    {r.pay_basis === 'SHARE' && r.share_pct != null ? ` · ${r.share_pct}%` : ''}
                                                    {r.pay_basis === 'COMMISSION' && r.commission_pct != null ? ` · ${r.commission_pct}%` : ''}
                                                </span>
                                            ),
                                        },
                                        { key: 'paid', header: 'Booking paid', cell: (r) => money(r.booking_paid) },
                                        { key: 'payout', header: 'Payout', cell: (r) => <StatusBadge status={r.payout_status} /> },
                                    ]}
                                />
                            </div>

                            <div className="rounded-2xl border border-stone-200 overflow-hidden">
                                <div className="border-b border-stone-100 px-4 py-3 font-semibold">Generated earnings</div>
                                <DataTable
                                    rows={d.earnings}
                                    rowKey={(r) => r.id}
                                    empty={<EmptyState title="No earnings generated yet" description="Use Payroll → Generate from events to create commission lines." />}
                                    columns={[
                                        { key: 'staff', header: 'Staff', cell: (r) => r.staff_name },
                                        { key: 'type', header: 'Type', cell: (r) => titleCase(r.type) },
                                        { key: 'event', header: 'Event', cell: (r) => r.event_title || '—' },
                                        { key: 'amt', header: 'Amount', cell: (r) => money(r.amount) },
                                    ]}
                                />
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                                <Textarea label="Closing notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                                <p className="text-xs text-stone-500">{d.summary.daysClosed} day closing(s) recorded this month. Days closed help audit cash before locking the month.</p>
                                {canManage && (
                                    <Button loading={submit.isPending} onClick={() => submit.mutate()}>
                                        Submit end of month
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </QueryState>
            </ColorListShell>
        </div>
    );
}
