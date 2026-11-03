// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 27-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Briefcase, CheckCircle2, Clock3, Percent, Plus, RefreshCw, Wallet } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, ColorListShell, Tabs } from '../../components/ui';
import { DataTable, EmptyState, QueryState, StatusBadge } from '../../components/ui/Data';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { Modal, useConfirm } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { useInvalidate } from '../../hooks';
import { api } from '../../services/api';
import { money, titleCase, toPaise, toRupees } from '../../utils/format';

type StaffRow = {
    id: number;
    name: string;
    role: string;
    designation: string | null;
    day_rate: number;
    monthly_salary: number;
    default_commission_pct: number;
    default_event_share_pct: number;
};

type PayrollRow = {
    id: number;
    payroll_no: string;
    staff_user_id: number;
    staff_name: string;
    staff_role: string;
    designation: string | null;
    period_month: string;
    amount: number;
    pay_type?: string;
    commission_pct?: number | null;
    status: string;
    paid_at: string | null;
    notes: string | null;
};

type ShareRow = {
    id: number;
    event_id: number;
    staff_user_id: number;
    staff_name: string;
    role: string;
    pay_basis: string;
    share_pct: number | null;
    commission_pct: number | null;
    day_rate_override: number | null;
    flat_amount: number | null;
    estimated_pay: number;
    booking_paid: number;
    booking_total: number;
    event_code: string;
    event_title: string;
    event_date: string;
    payout_status: string;
};

type EarningRow = {
    id: number;
    staff_name: string;
    type: string;
    amount: number;
    rate_pct: number | null;
    base_amount: number;
    event_title: string | null;
    event_code: string | null;
    earning_date: string;
};

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

const PAY_TYPES = [
    { value: 'MANUAL', label: 'Manual' },
    { value: 'SALARY', label: 'Salary' },
    { value: 'DAY_RATE', label: 'Day rate' },
    { value: 'COMMISSION', label: 'Commission' },
    { value: 'SHARE', label: 'Event share' },
    { value: 'MIXED', label: 'Mixed' },
];

export default function AdminPayroll() {
    const { can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const canManage = can('payments.manage') || can('staff.manage');
    const [tab, setTab] = useState<'payroll' | 'shares' | 'earnings'>('payroll');
    const [periodMonth, setPeriodMonth] = useState(monthNow());
    const [creating, setCreating] = useState(false);
    const [editingShare, setEditingShare] = useState<ShareRow | null>(null);
    const [staffUserId, setStaffUserId] = useState('');
    const [amount, setAmount] = useState('');
    const [payType, setPayType] = useState('MANUAL');
    const [commissionPct, setCommissionPct] = useState('');
    const [notes, setNotes] = useState('');
    const [shareForm, setShareForm] = useState({ payBasis: 'SHARE', sharePct: '', commissionPct: '', dayRateOverride: '', flatAmount: '' });

    const staffQ = useQuery({
        queryKey: ['payroll', 'staff'],
        queryFn: () => api.get<StaffRow[]>('/api/payroll/staff'),
        enabled: creating,
    });
    const listQ = useQuery({
        queryKey: ['payroll', periodMonth],
        queryFn: () => api.get<{ items: PayrollRow[]; summary: { draft: number; paid: number; totalPaid: number } }>('/api/payroll', { periodMonth }),
        enabled: tab === 'payroll',
    });
    const sharesQ = useQuery({
        queryKey: ['payroll', 'shares', periodMonth],
        queryFn: () => api.get<ShareRow[]>('/api/payroll/shares', { periodMonth }),
        enabled: tab === 'shares',
    });
    const earningsQ = useQuery({
        queryKey: ['payroll', 'earnings', periodMonth],
        queryFn: () => api.get<EarningRow[]>('/api/payroll/earnings', { periodMonth }),
        enabled: tab === 'earnings',
    });

    const selectedStaff = useMemo(() => (staffQ.data ?? []).find((s) => String(s.id) === staffUserId), [staffQ.data, staffUserId]);

    const create = useMutation({
        mutationFn: () =>
            api.send('POST', '/api/payroll', {
                staffUserId: Number(staffUserId),
                periodMonth,
                amount: toPaise(amount),
                payType,
                commissionPct: commissionPct === '' ? null : Number(commissionPct),
                notes: notes.trim() || null,
            }),
        onSuccess: async (r) => {
            toast.success(r.message);
            setCreating(false);
            setStaffUserId('');
            setAmount('');
            setNotes('');
            setCommissionPct('');
            setPayType('MANUAL');
            await invalidate(['payroll']);
        },
        onError: (e) => toast.error(e),
    });

    const generate = useMutation({
        mutationFn: () => api.send('POST', '/api/payroll/generate', { periodMonth }),
        onSuccess: async (r) => {
            toast.success(r.message);
            await invalidate(['payroll'], ['closing']);
            setTab('payroll');
        },
        onError: (e) => toast.error(e),
    });

    const act = useMutation({
        mutationFn: ({ id, action }: { id: number; action: 'pay' | 'cancel' }) => api.send('POST', `/api/payroll/${id}/${action}`),
        onSuccess: async (r) => {
            toast.success(r.message);
            await invalidate(['payroll']);
        },
        onError: (e) => toast.error(e),
    });

    const saveShare = useMutation({
        mutationFn: () =>
            api.send('PUT', `/api/payroll/shares/${editingShare!.id}`, {
                payBasis: shareForm.payBasis,
                sharePct: shareForm.sharePct === '' ? null : Number(shareForm.sharePct),
                commissionPct: shareForm.commissionPct === '' ? null : Number(shareForm.commissionPct),
                dayRateOverride: shareForm.dayRateOverride === '' ? null : toPaise(shareForm.dayRateOverride),
                flatAmount: shareForm.flatAmount === '' ? null : toPaise(shareForm.flatAmount),
            }),
        onSuccess: async (r) => {
            toast.success(r.message);
            setEditingShare(null);
            await invalidate(['payroll']);
        },
        onError: (e) => toast.error(e),
    });

    return (
        <div className="space-y-4">
            <ColorListShell
                icon={Briefcase}
                tone="amber"
                title="Payroll"
                subtitle="Salaries, day rates, commissions and member-wise event revenue share"
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Link to="/admin/closing/day" className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                            End of day
                        </Link>
                        <Link to="/admin/closing/month" className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                            End of month
                        </Link>
                        {canManage && (
                            <>
                                <Button size="sm" variant="secondary" icon={<RefreshCw className="size-4" />} loading={generate.isPending} onClick={() => generate.mutate()}>
                                    Generate from events
                                </Button>
                                <Button
                                    size="sm"
                                    icon={<Plus className="size-4" />}
                                    onClick={() => {
                                        setCreating(true);
                                        setAmount('');
                                        setNotes('');
                                        setStaffUserId('');
                                        setPayType('MANUAL');
                                        setCommissionPct('');
                                    }}
                                >
                                    Add payroll
                                </Button>
                            </>
                        )}
                    </div>
                }
            >
                <div className="flex flex-wrap items-end gap-3 border-b border-stone-100 p-3 sm:p-4">
                    <Input label="Pay period" type="month" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} />
                    <div className="flex-1" />
                    <Tabs
                        value={tab}
                        onChange={(t) => setTab(t as typeof tab)}
                        tabs={[
                            { value: 'payroll', label: 'Payroll entries' },
                            { value: 'shares', label: 'Event member shares' },
                            { value: 'earnings', label: 'Commissions ledger' },
                        ]}
                    />
                </div>

                {tab === 'payroll' && (
                    <QueryState query={listQ}>
                        {(d) => (
                            <>
                                <div className="grid grid-cols-2 gap-3 p-3 sm:p-4 xl:grid-cols-3">
                                    <Stat label="Draft (due)" value={money(d.summary.draft, true)} icon={<Clock3 className="size-5" />} tone="from-amber-400 to-orange-500" />
                                    <Stat label="Paid this month" value={money(d.summary.paid, true)} icon={<CheckCircle2 className="size-5" />} tone="from-emerald-500 to-teal-600" />
                                    <Stat label="Entries" value={d.items.length} icon={<Wallet className="size-5" />} tone="from-violet-500 to-fuchsia-600" />
                                </div>
                                <DataTable
                                    rows={d.items}
                                    rowKey={(r) => r.id}
                                    empty={<EmptyState title="No payroll for this month" description="Add a manual entry, or generate from event shares and commissions." />}
                                    columns={[
                                        {
                                            key: 'no',
                                            header: 'Payroll',
                                            cell: (r) => (
                                                <div>
                                                    <p className="font-medium text-stone-900">{r.payroll_no}</p>
                                                    <p className="text-xs text-stone-500">{titleCase(r.pay_type || 'MANUAL')}</p>
                                                </div>
                                            ),
                                        },
                                        {
                                            key: 'staff',
                                            header: 'Staff',
                                            cell: (r) => (
                                                <div>
                                                    <p className="font-medium text-stone-900">{r.staff_name}</p>
                                                    <p className="text-xs text-stone-500">
                                                        {titleCase(String(r.staff_role || '').split(',')[0] || '')}
                                                        {r.designation ? ` · ${r.designation}` : ''}
                                                    </p>
                                                </div>
                                            ),
                                        },
                                        { key: 'amount', header: 'Amount', cell: (r) => money(r.amount, true) },
                                        { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                        {
                                            key: 'actions',
                                            header: '',
                                            cell: (r) =>
                                                canManage && r.status === 'DRAFT' ? (
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            loading={act.isPending}
                                                            onClick={async () => {
                                                                if (await ask({ title: 'Mark as paid?', message: `${r.staff_name} · ${money(r.amount)}`, confirmLabel: 'Mark paid' })) act.mutate({ id: r.id, action: 'pay' });
                                                            }}
                                                        >
                                                            Mark paid
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-rose-600"
                                                            onClick={async () => {
                                                                if (await ask({ title: 'Cancel payroll?', message: r.payroll_no, confirmLabel: 'Cancel', tone: 'danger' })) act.mutate({ id: r.id, action: 'cancel' });
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : null,
                                        },
                                    ]}
                                />
                            </>
                        )}
                    </QueryState>
                )}

                {tab === 'shares' && (
                    <QueryState query={sharesQ}>
                        {(rows) => (
                            <div className="space-y-3 p-3 sm:p-4">
                                <p className="text-sm text-stone-600">
                                    Each event team member can be paid by <strong>day rate</strong>, <strong>revenue share %</strong>, <strong>commission %</strong>, or a <strong>flat amount</strong>. Estimated pay uses booking amount paid so far.
                                </p>
                                <DataTable
                                    rows={rows}
                                    rowKey={(r) => r.id}
                                    empty={<EmptyState title="No event assignments this month" description="Assign staff on an event and set how they share payment." />}
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
                                                    <span className="block text-xs text-stone-500">
                                                        {r.event_code} · {r.event_date}
                                                    </span>
                                                </Link>
                                            ),
                                        },
                                        {
                                            key: 'basis',
                                            header: 'Share rule',
                                            cell: (r) => (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium">
                                                    <Percent className="size-3.5 text-amber-600" />
                                                    {titleCase(r.pay_basis)}
                                                    {r.pay_basis === 'SHARE' && r.share_pct != null ? ` ${r.share_pct}%` : ''}
                                                    {r.pay_basis === 'COMMISSION' && r.commission_pct != null ? ` ${r.commission_pct}%` : ''}
                                                </span>
                                            ),
                                        },
                                        { key: 'base', header: 'Booking paid', cell: (r) => money(r.booking_paid) },
                                        { key: 'est', header: 'Est. pay', cell: (r) => <span className="font-semibold text-emerald-700">{money(r.estimated_pay)}</span> },
                                        { key: 'st', header: 'Payout', cell: (r) => <StatusBadge status={r.payout_status} /> },
                                        {
                                            key: 'edit',
                                            header: '',
                                            cell: (r) =>
                                                canManage ? (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => {
                                                            setEditingShare(r);
                                                            setShareForm({
                                                                payBasis: r.pay_basis || 'DAY_RATE',
                                                                sharePct: r.share_pct != null ? String(r.share_pct) : '',
                                                                commissionPct: r.commission_pct != null ? String(r.commission_pct) : '',
                                                                dayRateOverride: r.day_rate_override ? toRupees(r.day_rate_override) : '',
                                                                flatAmount: r.flat_amount ? toRupees(r.flat_amount) : '',
                                                            });
                                                        }}
                                                    >
                                                        Edit share
                                                    </Button>
                                                ) : null,
                                        },
                                    ]}
                                />
                            </div>
                        )}
                    </QueryState>
                )}

                {tab === 'earnings' && (
                    <QueryState query={earningsQ}>
                        {(rows) => (
                            <DataTable
                                rows={rows}
                                rowKey={(r) => r.id}
                                empty={<EmptyState title="No commission lines yet" description="Click Generate from events to create earnings from member shares." />}
                                columns={[
                                    { key: 'staff', header: 'Staff', cell: (r) => r.staff_name },
                                    { key: 'type', header: 'Type', cell: (r) => titleCase(r.type) },
                                    { key: 'event', header: 'Event', cell: (r) => r.event_title || '—' },
                                    { key: 'base', header: 'Base', cell: (r) => money(r.base_amount) },
                                    { key: 'pct', header: '%', cell: (r) => (r.rate_pct != null ? `${r.rate_pct}%` : '—') },
                                    { key: 'amt', header: 'Earning', cell: (r) => money(r.amount, true) },
                                ]}
                            />
                        )}
                    </QueryState>
                )}
            </ColorListShell>

            <Modal
                open={creating}
                onClose={() => setCreating(false)}
                title="Add payroll entry"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setCreating(false)}>
                            Cancel
                        </Button>
                        <Button
                            loading={create.isPending}
                            onClick={() => {
                                if (!staffUserId) return toast.error('Choose a staff member');
                                if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) return toast.error('Enter a valid amount');
                                create.mutate();
                            }}
                        >
                            Create
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input label="Pay period" type="month" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} />
                    <Select
                        label="Staff"
                        required
                        value={staffUserId}
                        onChange={(e) => {
                            setStaffUserId(e.target.value);
                            const s = (staffQ.data ?? []).find((x) => String(x.id) === e.target.value);
                            if (s?.monthly_salary) {
                                setAmount(toRupees(s.monthly_salary));
                                setPayType('SALARY');
                            } else if (s?.day_rate) {
                                setAmount(toRupees(s.day_rate));
                                setPayType('DAY_RATE');
                            }
                            if (s?.default_commission_pct) setCommissionPct(String(s.default_commission_pct));
                        }}
                        placeholder={staffQ.isLoading ? 'Loading…' : 'Choose…'}
                        options={(staffQ.data ?? []).map((s) => ({
                            value: s.id,
                            label: `${s.name}${s.day_rate ? ` · day ${money(s.day_rate)}` : ''}${s.monthly_salary ? ` · salary ${money(s.monthly_salary)}` : ''}`,
                        }))}
                    />
                    <Select label="Pay type" value={payType} onChange={(e) => setPayType(e.target.value)} options={PAY_TYPES} />
                    {(payType === 'COMMISSION' || payType === 'SHARE') && (
                        <Input label="Commission / share %" type="number" min={0} max={100} step="0.01" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} />
                    )}
                    <Input label="Amount (₹)" required prefix="₹" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} hint={selectedStaff?.day_rate ? `Day rate on file: ${money(selectedStaff.day_rate)}` : undefined} />
                    <Textarea label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                </div>
            </Modal>

            <Modal
                open={!!editingShare}
                onClose={() => setEditingShare(null)}
                title="Event member share"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setEditingShare(null)}>
                            Cancel
                        </Button>
                        <Button loading={saveShare.isPending} onClick={() => saveShare.mutate()}>
                            Save share
                        </Button>
                    </>
                }
            >
                {editingShare && (
                    <div className="space-y-4">
                        <p className="text-sm text-stone-600">
                            {editingShare.staff_name} on <strong>{editingShare.event_title}</strong>
                        </p>
                        <Select
                            label="How this member is paid"
                            value={shareForm.payBasis}
                            onChange={(e) => setShareForm({ ...shareForm, payBasis: e.target.value })}
                            options={[
                                { value: 'DAY_RATE', label: 'Day rate' },
                                { value: 'SHARE', label: 'Revenue share %' },
                                { value: 'COMMISSION', label: 'Commission %' },
                                { value: 'FLAT', label: 'Flat amount' },
                                { value: 'NONE', label: 'No payout' },
                            ]}
                        />
                        {shareForm.payBasis === 'SHARE' && <Input label="Share of booking paid (%)" type="number" min={0} max={100} step="0.01" value={shareForm.sharePct} onChange={(e) => setShareForm({ ...shareForm, sharePct: e.target.value })} />}
                        {shareForm.payBasis === 'COMMISSION' && <Input label="Commission (%)" type="number" min={0} max={100} step="0.01" value={shareForm.commissionPct} onChange={(e) => setShareForm({ ...shareForm, commissionPct: e.target.value })} />}
                        {shareForm.payBasis === 'DAY_RATE' && <Input label="Day rate override (₹)" type="number" min={0} step="0.01" value={shareForm.dayRateOverride} onChange={(e) => setShareForm({ ...shareForm, dayRateOverride: e.target.value })} hint="Leave blank to use staff day rate" />}
                        {shareForm.payBasis === 'FLAT' && <Input label="Flat amount (₹)" type="number" min={0} step="0.01" value={shareForm.flatAmount} onChange={(e) => setShareForm({ ...shareForm, flatAmount: e.target.value })} />}
                    </div>
                )}
            </Modal>
            {dialog}
        </div>
    );
}
