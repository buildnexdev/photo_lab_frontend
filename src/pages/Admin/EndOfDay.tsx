// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 27-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { CalendarDays, CheckCircle2, Clock3, IndianRupee, Wallet } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, ColorListShell } from '../../components/ui';
import { DataTable, EmptyState, QueryState, StatusBadge } from '../../components/ui/Data';
import { Input, Textarea } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { useInvalidate } from '../../hooks';
import { api } from '../../services/api';
import { date, money, titleCase, toPaise, toRupees } from '../../utils/format';

function todayYmd() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

type DayPreview = {
    closeDate: string;
    system: { cash: number; upi: number; card: number; bank: number; other: number; refunds: number; paymentCount: number; netCollected: number };
    payments: { id: number; payment_no: string; purpose: string; amount: number; method: string | null; status: string }[];
    events: { id: number; event_code: string; title: string; status: string; team_size: number; booking_total: number; booking_paid: number }[];
    closing: { status: string; counted_cash: number; variance: number; notes: string | null } | null;
};

export default function AdminEndOfDay() {
    const { can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const canManage = can('payments.manage');
    const [closeDate, setCloseDate] = useState(todayYmd());
    const [openingFloat, setOpeningFloat] = useState('0');
    const [countedCash, setCountedCash] = useState('');
    const [notes, setNotes] = useState('');

    const q = useQuery({
        queryKey: ['closing', 'day', closeDate],
        queryFn: () => api.get<DayPreview>('/api/closing/day', { date: closeDate }),
    });
    const historyQ = useQuery({
        queryKey: ['closing', 'day', 'history'],
        queryFn: () => api.get<{ close_date: string; status: string; variance: number; system_cash: number; counted_cash: number }[]>('/api/closing/day/history'),
    });

    useEffect(() => {
        if (q.data?.closing) {
            setCountedCash(toRupees(q.data.closing.counted_cash));
            setNotes(q.data.closing.notes ?? '');
        } else if (q.data) {
            setCountedCash(toRupees(q.data.system.cash));
        }
    }, [q.data]);

    const submit = useMutation({
        mutationFn: () =>
            api.send('POST', '/api/closing/day', {
                closeDate,
                openingFloat: toPaise(openingFloat || 0),
                countedCash: toPaise(countedCash || 0),
                notes: notes.trim() || null,
            }),
        onSuccess: async (r) => {
            toast.success(r.message);
            await invalidate(['closing']);
        },
        onError: (e) => toast.error(e),
    });

    const variancePreview = q.data
        ? toPaise(countedCash || 0) - (toPaise(openingFloat || 0) + q.data.system.cash)
        : 0;

    return (
        <div className="space-y-4">
            <ColorListShell
                icon={CalendarDays}
                tone="sky"
                title="End of day"
                subtitle="Cash reconciliation, payments collected today and events on this date"
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Link to="/admin/closing/month" className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                            End of month
                        </Link>
                        <Link to="/admin/payroll" className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                            Payroll
                        </Link>
                    </div>
                }
            >
                <div className="flex flex-wrap items-end gap-3 border-b border-stone-100 p-3 sm:p-4">
                    <Input label="Close date" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
                </div>
                <QueryState query={q}>
                    {(d) => (
                        <div className="space-y-4 p-3 sm:p-4">
                            {d.closing && (
                                <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800">
                                    Closing status: <StatusBadge status={d.closing.status} /> · Variance {money(d.closing.variance)}
                                </p>
                            )}
                            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                                <Stat label="Net collected" value={money(d.system.netCollected, true)} icon={<Wallet className="size-5" />} tone="from-emerald-500 to-teal-600" />
                                <Stat label="System cash" value={money(d.system.cash, true)} icon={<IndianRupee className="size-5" />} tone="from-amber-400 to-orange-500" />
                                <Stat label="UPI / card / bank" value={money(d.system.upi + d.system.card + d.system.bank, true)} icon={<CheckCircle2 className="size-5" />} tone="from-sky-500 to-cyan-600" />
                                <Stat label="Payments" value={d.system.paymentCount} icon={<Clock3 className="size-5" />} tone="from-violet-500 to-fuchsia-600" />
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 space-y-3">
                                    <h3 className="font-semibold text-stone-900">Cash count</h3>
                                    <Input label="Opening float (₹)" type="number" min={0} step="0.01" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} />
                                    <Input label="Counted cash (₹)" required type="number" min={0} step="0.01" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} />
                                    <p className={clsx('text-sm font-medium', variancePreview === 0 ? 'text-emerald-700' : 'text-rose-700')}>
                                        Variance preview: {money(variancePreview)}
                                    </p>
                                    <Textarea label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                                    {canManage && (
                                        <Button loading={submit.isPending} onClick={() => submit.mutate()}>
                                            Submit end of day
                                        </Button>
                                    )}
                                </div>
                                <div className="rounded-2xl border border-stone-200 overflow-hidden">
                                    <div className="border-b border-stone-100 px-4 py-3 font-semibold text-stone-900">Method split</div>
                                    <ul className="divide-y divide-stone-100 text-sm">
                                        {[
                                            ['Cash', d.system.cash],
                                            ['UPI', d.system.upi],
                                            ['Card', d.system.card],
                                            ['Bank', d.system.bank],
                                            ['Other', d.system.other],
                                            ['Refunds', d.system.refunds],
                                        ].map(([label, amt]) => (
                                            <li key={String(label)} className="flex justify-between px-4 py-2.5">
                                                <span className="text-stone-600">{label}</span>
                                                <span className="font-semibold text-stone-900">{money(Number(amt))}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-stone-200 overflow-hidden">
                                <div className="border-b border-stone-100 px-4 py-3 font-semibold">Payments today</div>
                                <DataTable
                                    rows={d.payments}
                                    rowKey={(r) => r.id}
                                    empty={<EmptyState title="No payments on this date" />}
                                    columns={[
                                        { key: 'no', header: 'Payment', cell: (r) => <span className="font-medium">{r.payment_no}</span> },
                                        { key: 'purpose', header: 'Purpose', cell: (r) => titleCase(r.purpose) },
                                        { key: 'method', header: 'Method', cell: (r) => titleCase(r.method || '—') },
                                        { key: 'amount', header: 'Amount', cell: (r) => money(r.amount) },
                                        { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                    ]}
                                />
                            </div>
                            <div className="rounded-2xl border border-stone-200 overflow-hidden">
                                <div className="border-b border-stone-100 px-4 py-3 font-semibold">Events on this date</div>
                                <DataTable
                                    rows={d.events}
                                    rowKey={(r) => r.id}
                                    empty={<EmptyState title="No events scheduled" />}
                                    columns={[
                                        {
                                            key: 'ev',
                                            header: 'Event',
                                            cell: (r) => (
                                                <Link to={`/admin/events/${r.id}`} className="font-medium text-sky-700 hover:underline">
                                                    {r.title}
                                                    <span className="block text-xs text-stone-500">{r.event_code}</span>
                                                </Link>
                                            ),
                                        },
                                        { key: 'team', header: 'Team', cell: (r) => r.team_size },
                                        { key: 'paid', header: 'Booking paid', cell: (r) => `${money(r.booking_paid)} / ${money(r.booking_total)}` },
                                        { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                    ]}
                                />
                            </div>
                        </div>
                    )}
                </QueryState>
            </ColorListShell>
            {historyQ.data && historyQ.data.length > 0 && (
                <ColorListShell icon={Clock3} tone="violet" title="Recent day closings">
                    <DataTable
                        rows={historyQ.data}
                        rowKey={(r) => r.close_date}
                        columns={[
                            { key: 'd', header: 'Date', cell: (r) => date(r.close_date) },
                            { key: 'sys', header: 'System cash', cell: (r) => money(r.system_cash) },
                            { key: 'cnt', header: 'Counted', cell: (r) => money(r.counted_cash) },
                            { key: 'var', header: 'Variance', cell: (r) => money(r.variance) },
                            { key: 'st', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                        ]}
                    />
                </ColorListShell>
            )}
        </div>
    );
}
