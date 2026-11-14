// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 13-11-2026
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Banknote,
    BookOpen,
    Briefcase,
    Building,
    Calendar,
    Camera,
    CheckCircle,
    Coffee,
    CreditCard,
    Download,
    Edit3,
    Filter,
    Frame,
    Image as ImageIcon,
    Megaphone,
    Minus,
    Plus,
    Printer,
    Receipt,
    Search,
    Trash2,
    Truck,
    Users,
    Wallet,
    X,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Card, ColorListShell } from '../../components/ui';
import { Input, Textarea } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { date, money, toPaise, toRupees } from '../../utils/format';
import './DayToDayExpenses.scss';

interface FinanceTransaction {
    financeTransactionID?: number;
    id?: number;
    transaction_no: string;
    type: 'INCOME' | 'EXPENSE';
    category: string;
    amount: number; // in paise
    payment_method: string | null;
    reference_no: string | null;
    description: string;
    transaction_date: string;
    created_at?: string;
}

interface FinanceSummary {
    totalIncome: number;
    totalExpense: number;
    netAmount: number;
    todayIncome: number;
    todayExpense: number;
    todayNet: number;
    categoryBreakdown: { category: string; type: string; total: number; count: number }[];
    paymentMethodBreakdown: { payment_method: string; type: string; total: number; count: number }[];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    'Frames & Raw Materials': Frame,
    'Photo Albums & Printing Lab': Printer,
    'Studio Rent & Maintenance': Building,
    'Electricity & Utility Bills': Zap,
    'Camera & Lighting Equipment': Camera,
    'Freelancer & Crew Payout': Users,
    'Staff Salary & Advances': Briefcase,
    'Food, Tea & Refreshments': Coffee,
    'Travel, Fuel & Transport': Truck,
    'Marketing, Ads & Social Media': Megaphone,
    'Packaging & Courier Charges': Truck,
    'Software & Cloud Subscriptions': Zap,
    'Miscellaneous Expenses': Receipt,
    'Event Booking Advance': Calendar,
    'Event Final Balance': CheckCircle,
    'Photo Frames & Art Store': Frame,
    'Flush Mount Albums': BookOpen,
    'Prints & Passport Photos': ImageIcon,
    'Studio Portrait Sessions': Camera,
    'Commercial & Brand Shoots': Briefcase,
    'Other Income': Banknote,
};

const PAYMENT_METHODS = [
    { id: 'CASH', label: 'Cash', colorClass: 'cash' },
    { id: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)', colorClass: 'upi' },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT', colorClass: 'bank' },
    { id: 'CARD', label: 'Debit / Credit Card', colorClass: 'card' },
    { id: 'CHEQUE', label: 'Cheque', colorClass: 'cheque' },
];

function formatYMD(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function DayToDayExpenses() {
    const { can } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const canManage = can('payments.manage');

    // Quick range presets
    const [rangePreset, setRangePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'all' | 'custom'>('month');
    const todayStr = useMemo(() => formatYMD(new Date()), []);

    const dateRange = useMemo(() => {
        const now = new Date();
        if (rangePreset === 'today') {
            return { start: todayStr, end: todayStr };
        }
        if (rangePreset === 'yesterday') {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            const s = formatYMD(y);
            return { start: s, end: s };
        }
        if (rangePreset === 'week') {
            const first = new Date(now);
            first.setDate(now.getDate() - now.getDay());
            return { start: formatYMD(first), end: todayStr };
        }
        if (rangePreset === 'month') {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start: formatYMD(first), end: todayStr };
        }
        if (rangePreset === 'last_month') {
            const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const last = new Date(now.getFullYear(), now.getMonth(), 0);
            return { start: formatYMD(first), end: formatYMD(last) };
        }
        return { start: undefined, end: undefined };
    }, [rangePreset, todayStr]);

    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const activeStart = rangePreset === 'custom' ? (customStart || undefined) : dateRange.start;
    const activeEnd = rangePreset === 'custom' ? (customEnd || undefined) : dateRange.end;

    // Filters
    const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state for Add/Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTxn, setEditingTxn] = useState<FinanceTransaction | null>(null);

    // Form inputs inside modal
    const [modalType, setModalType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
    const [amountRupees, setAmountRupees] = useState('');
    const [txnCategory, setTxnCategory] = useState('');
    const [txnCustomCategory, setTxnCustomCategory] = useState('');
    const [txnPaymentMethod, setTxnPaymentMethod] = useState('CASH');
    const [txnReference, setTxnReference] = useState('');
    const [txnDescription, setTxnDescription] = useState('');
    const [txnDate, setTxnDate] = useState(todayStr);

    // Data Queries
    const { data: categoriesData } = useQuery({
        queryKey: ['finance', 'categories'],
        queryFn: () => api.get<{ EXPENSE: { name: string; icon: string }[]; INCOME: { name: string; icon: string }[] }>('/api/finance/categories'),
    });

    const { data: summary, isLoading: isSummaryLoading } = useQuery<FinanceSummary>({
        queryKey: ['finance', 'summary', activeStart, activeEnd],
        queryFn: () => api.get<FinanceSummary>('/api/finance/summary', { startDate: activeStart, endDate: activeEnd }),
    });

    const { data: transactions = [], isLoading: isTxnLoading } = useQuery<FinanceTransaction[]>({
        queryKey: ['finance', 'transactions', activeStart, activeEnd, filterType, selectedCategory, selectedPaymentMethod, searchQuery],
        queryFn: () =>
            api.get<FinanceTransaction[]>('/api/finance/transactions', {
                startDate: activeStart,
                endDate: activeEnd,
                type: filterType === 'ALL' ? undefined : filterType,
                category: selectedCategory === 'All' ? undefined : selectedCategory,
                paymentMethod: selectedPaymentMethod === 'All' ? undefined : selectedPaymentMethod,
                search: searchQuery.trim() || undefined,
            }),
    });

    // Mutations
    const saveMutation = useMutation({
        mutationFn: (payload: any) => api.send('POST', '/api/finance/transactions', payload),
        onSuccess: (res: any) => {
            toast.success(res.message || 'Transaction saved successfully');
            queryClient.invalidateQueries({ queryKey: ['finance'] });
            closeModal();
        },
        onError: (err: any) => {
            toast.error(err);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.send('DELETE', `/api/finance/transactions/${id}`),
        onSuccess: () => {
            toast.success('Transaction deleted');
            queryClient.invalidateQueries({ queryKey: ['finance'] });
        },
        onError: (err: any) => {
            toast.error(err);
        },
    });

    // Modal helpers
    const openAddModal = (defaultType: 'EXPENSE' | 'INCOME') => {
        setEditingTxn(null);
        setModalType(defaultType);
        setAmountRupees('');
        const defaults = categoriesData ? (defaultType === 'EXPENSE' ? categoriesData.EXPENSE : categoriesData.INCOME) : [];
        setTxnCategory(defaults[0]?.name || '');
        setTxnCustomCategory('');
        setTxnPaymentMethod('CASH');
        setTxnReference('');
        setTxnDescription('');
        setTxnDate(todayStr);
        setIsModalOpen(true);
    };

    const openEditModal = (txn: FinanceTransaction) => {
        setEditingTxn(txn);
        setModalType(txn.type);
        setAmountRupees(String(toRupees(txn.amount)));
        setTxnCategory(txn.category);
        setTxnCustomCategory('');
        setTxnPaymentMethod(txn.payment_method || 'CASH');
        setTxnReference(txn.reference_no || '');
        setTxnDescription(txn.description || '');
        setTxnDate(txn.transaction_date ? txn.transaction_date.slice(0, 10) : todayStr);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTxn(null);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(amountRupees);
        if (isNaN(amt) || amt <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        const categoryFinal = txnCategory === 'Custom' ? txnCustomCategory.trim() : txnCategory.trim();
        if (!categoryFinal) {
            toast.error('Please select or specify a category');
            return;
        }

        if (!txnDescription.trim()) {
            toast.error('Please add a short note or description');
            return;
        }

        const id = editingTxn ? (editingTxn.id || editingTxn.financeTransactionID) : undefined;

        saveMutation.mutate({
            id,
            type: modalType,
            category: categoryFinal,
            amount: toPaise(amt),
            paymentMethod: txnPaymentMethod,
            referenceNo: txnReference.trim() || undefined,
            description: txnDescription.trim(),
            transactionDate: txnDate,
        });
    };

    // Group transactions by date
    const groupedTransactions = useMemo(() => {
        const groups: Record<string, { date: string; items: FinanceTransaction[]; totalIncome: number; totalExpense: number }> = {};

        transactions.forEach((txn) => {
            const d = txn.transaction_date ? txn.transaction_date.slice(0, 10) : 'Unknown';
            if (!groups[d]) {
                groups[d] = { date: d, items: [], totalIncome: 0, totalExpense: 0 };
            }
            groups[d].items.push(txn);
            if (txn.type === 'INCOME') {
                groups[d].totalIncome += Number(txn.amount);
            } else {
                groups[d].totalExpense += Number(txn.amount);
            }
        });

        return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }, [transactions]);

    // CSV Export
    const handleExportCsv = () => {
        if (!transactions.length) {
            toast.info('No transactions to export in this range.');
            return;
        }

        const headers = ['Date', 'Transaction No', 'Type', 'Category', 'Amount (INR)', 'Payment Mode', 'Reference No', 'Notes'];
        const rows = transactions.map((t) => [
            t.transaction_date?.slice(0, 10) || '',
            t.transaction_no || '',
            t.type,
            `"${(t.category || '').replace(/"/g, '""')}"`,
            (Number(t.amount) / 100).toFixed(2),
            t.payment_method || 'CASH',
            `"${(t.reference_no || '').replace(/"/g, '""')}"`,
            `"${(t.description || '').replace(/"/g, '""')}"`,
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `buildnex_expenses_${activeStart || 'all'}_to_${activeEnd || 'today'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Expense report downloaded as CSV');
    };

    const currentCategoryList = useMemo(() => {
        if (!categoriesData) return [];
        return modalType === 'EXPENSE' ? categoriesData.EXPENSE : categoriesData.INCOME;
    }, [categoriesData, modalType]);

    return (
        <ColorListShell
            icon={Receipt}
            tone="emerald"
            title="Day-to-day Expenses & Cash Flow"
            subtitle="Track daily studio spending, material purchases, client advances, and net studio cash in hand"
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={handleExportCsv}>
                        <Download className="mr-1.5 size-4" /> Export CSV
                    </Button>
                    {canManage && (
                        <>
                            <button
                                type="button"
                                onClick={() => openAddModal('EXPENSE')}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-rose-500 hover:to-red-400 active:scale-95"
                            >
                                <Minus className="size-4 stroke-[3]" /> Add Expense
                            </button>
                            <button
                                type="button"
                                onClick={() => openAddModal('INCOME')}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-emerald-500 hover:to-teal-400 active:scale-95"
                            >
                                <Plus className="size-4 stroke-[3]" /> Add Income
                            </button>
                        </>
                    )}
                </div>
            }
        >
            <div className="day-expenses p-4 space-y-5">

            {/* Quick Time Range Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Period:</span>
                    {[
                        { id: 'today', label: 'Today' },
                        { id: 'yesterday', label: 'Yesterday' },
                        { id: 'week', label: 'This Week' },
                        { id: 'month', label: 'This Month' },
                        { id: 'last_month', label: 'Last Month' },
                        { id: 'all', label: 'All Time' },
                        { id: 'custom', label: 'Custom Range' },
                    ].map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setRangePreset(p.id as any)}
                            className={clsx(
                                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                                rangePreset === p.id
                                    ? 'bg-stone-900 text-white shadow-sm'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900',
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {rangePreset === 'custom' && (
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="h-8 text-xs"
                        />
                        <span className="text-stone-400">to</span>
                        <Input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                )}
            </div>

            {/* Top Stat Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Net Balance */}
                <div
                    className={clsx(
                        'stat-card-glow',
                        (summary?.netAmount ?? 0) >= 0
                            ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
                            : 'bg-gradient-to-br from-rose-600 to-red-700',
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Net Balance (Cash in Hand)</span>
                        <span className="rounded-xl bg-white/20 p-2 text-white">
                            <Wallet className="size-5" />
                        </span>
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight">
                        {summary ? money(summary.netAmount) : '—'}
                    </p>
                    <p className="mt-1 text-xs text-white/75">
                        Inflow minus expenses for selected period
                    </p>
                </div>

                {/* Total Income */}
                <div className="stat-card-glow bg-gradient-to-br from-sky-600 to-indigo-700">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Total Inflow</span>
                        <span className="rounded-xl bg-white/20 p-2 text-white">
                            <ArrowDownLeft className="size-5" />
                        </span>
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight">
                        {summary ? money(summary.totalIncome) : '—'}
                    </p>
                    <p className="mt-1 text-xs text-white/75">Client advances, frame & album sales</p>
                </div>

                {/* Total Expenses */}
                <div className="stat-card-glow bg-gradient-to-br from-amber-600 to-rose-700">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Total Expenses</span>
                        <span className="rounded-xl bg-white/20 p-2 text-white">
                            <ArrowUpRight className="size-5" />
                        </span>
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight">
                        {summary ? money(summary.totalExpense) : '—'}
                    </p>
                    <p className="mt-1 text-xs text-white/75">Materials, printing, rent, team payouts</p>
                </div>

                {/* Today's Cash Flow */}
                <div className="stat-card-glow bg-gradient-to-br from-purple-600 to-violet-800">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Today's Activity</span>
                        <span className="rounded-xl bg-white/20 p-2 text-white">
                            <Calendar className="size-5" />
                        </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold tracking-tight">
                        {summary ? money(summary.todayNet) : '—'}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-white/80">
                        <span>+{summary ? money(summary.todayIncome) : '0'}</span>
                        <span>•</span>
                        <span>-{summary ? money(summary.todayExpense) : '0'}</span>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 items-center gap-2">
                    <div className="relative flex-1 max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                        <Input
                            placeholder="Search note, category, or reference..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 text-sm"
                        />
                    </div>

                    {/* Filter Type Pills */}
                    <div className="inline-flex rounded-xl bg-stone-100 p-1 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setFilterType('ALL')}
                            className={clsx('rounded-lg px-3 py-1.5 transition-all', filterType === 'ALL' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-600 hover:text-stone-900')}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('EXPENSE')}
                            className={clsx('rounded-lg px-3 py-1.5 transition-all', filterType === 'EXPENSE' ? 'bg-rose-500 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900')}
                        >
                            Expenses
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('INCOME')}
                            className={clsx('rounded-lg px-3 py-1.5 transition-all', filterType === 'INCOME' ? 'bg-emerald-500 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900')}
                        >
                            Income
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-xs focus:outline-hidden"
                    >
                        <option value="All">All Categories</option>
                        {categoriesData?.EXPENSE.map((c) => (
                            <option key={`exp-${c.name}`} value={c.name}>
                                [Expense] {c.name}
                            </option>
                        ))}
                        {categoriesData?.INCOME.map((c) => (
                            <option key={`inc-${c.name}`} value={c.name}>
                                [Income] {c.name}
                            </option>
                        ))}
                    </select>

                    {/* Payment Mode Filter */}
                    <select
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-xs focus:outline-hidden"
                    >
                        <option value="All">All Payment Modes</option>
                        {PAYMENT_METHODS.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Content: Ledger Feed + Category Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left 2 Cols: Grouped Ledger */}
                <div className="space-y-4 lg:col-span-2">
                    <Card className="overflow-hidden border border-stone-200 p-0 shadow-sm">
                        <div className="border-b border-stone-200 bg-stone-50 px-5 py-3 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                                Daily Ledger & Activity ({transactions.length} records)
                            </span>
                            <span className="text-xs text-stone-500">
                                Sorted by newest first
                            </span>
                        </div>

                        {isTxnLoading ? (
                            <div className="p-12 text-center text-sm text-stone-500">
                                Loading day-to-day transactions...
                            </div>
                        ) : groupedTransactions.length === 0 ? (
                            <div className="p-12 text-center">
                                <Receipt className="mx-auto size-12 text-stone-300 stroke-1" />
                                <h3 className="mt-3 text-base font-semibold text-stone-800">No transactions recorded</h3>
                                <p className="mt-1 text-xs text-stone-500">
                                    Click "+ Add Expense" or "+ Add Income" above to log today's transactions.
                                </p>
                            </div>
                        ) : (
                            <div>
                                {groupedTransactions.map((group) => {
                                    const isToday = group.date === todayStr;
                                    const dateObj = new Date(group.date);
                                    const formattedDate = dateObj.toLocaleDateString('en-IN', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    });

                                    return (
                                        <div key={group.date} className="border-b border-stone-100 last:border-b-0">
                                            {/* Date Group Header */}
                                            <div className="date-group-header">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-stone-900">
                                                        {isToday ? 'Today' : formattedDate}
                                                    </span>
                                                    {isToday && (
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                                            {formattedDate}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-xs">
                                                    {group.totalIncome > 0 && (
                                                        <span className="font-semibold text-emerald-600">
                                                            +{money(group.totalIncome)}
                                                        </span>
                                                    )}
                                                    {group.totalExpense > 0 && (
                                                        <span className="font-semibold text-rose-600">
                                                            -{money(group.totalExpense)}
                                                        </span>
                                                    )}
                                                    <span className="font-bold text-stone-700">
                                                        Net: {money(group.totalIncome - group.totalExpense)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Item Rows */}
                                            <div className="divide-y divide-stone-100">
                                                {group.items.map((txn) => {
                                                    const isIncome = txn.type === 'INCOME';
                                                    const IconComponent = CATEGORY_ICONS[txn.category] || (isIncome ? ArrowDownLeft : ArrowUpRight);
                                                    const txnId = txn.id || txn.financeTransactionID || 0;

                                                    return (
                                                        <div key={txn.transaction_no || txnId} className="txn-row group">
                                                            <div className="flex items-start gap-3 min-w-0">
                                                                <div
                                                                    className={clsx(
                                                                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                                                                        isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
                                                                    )}
                                                                >
                                                                    <IconComponent className="size-5" />
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold text-stone-900 text-sm truncate">
                                                                            {txn.category}
                                                                        </span>
                                                                        <span
                                                                            className={clsx(
                                                                                'payment-badge',
                                                                                (txn.payment_method || 'CASH').toLowerCase().includes('upi')
                                                                                    ? 'upi'
                                                                                    : (txn.payment_method || 'CASH').toLowerCase().includes('bank')
                                                                                      ? 'bank'
                                                                                      : (txn.payment_method || 'CASH').toLowerCase().includes('card')
                                                                                        ? 'card'
                                                                                        : 'cash',
                                                                            )}
                                                                        >
                                                                            {txn.payment_method || 'CASH'}
                                                                        </span>
                                                                    </div>

                                                                    <p className="mt-0.5 text-xs text-stone-600 line-clamp-1">
                                                                        {txn.description}
                                                                    </p>

                                                                    {txn.reference_no && (
                                                                        <p className="mt-0.5 text-[11px] text-stone-400">
                                                                            Ref / Bill: {txn.reference_no}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                                <span
                                                                    className={clsx(
                                                                        'text-base font-bold tracking-tight',
                                                                        isIncome ? 'text-emerald-600' : 'text-rose-600',
                                                                    )}
                                                                >
                                                                    {isIncome ? '+' : '-'} {money(txn.amount)}
                                                                </span>

                                                                {canManage && (
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openEditModal(txn)}
                                                                            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                                                                            title="Edit transaction"
                                                                        >
                                                                            <Edit3 className="size-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (window.confirm('Delete this transaction?')) {
                                                                                    deleteMutation.mutate(txnId);
                                                                                }
                                                                            }}
                                                                            className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Col: Category Breakdown & Expense Insights */}
                <div className="space-y-4">
                    <Card className="border border-stone-200 p-5 shadow-xs">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                            Expense Categories Breakdown
                        </h4>

                        <div className="mt-4 space-y-3">
                            {summary?.categoryBreakdown
                                .filter((c) => c.type === 'EXPENSE')
                                .slice(0, 8)
                                .map((cat) => {
                                    const totalExp = summary.totalExpense || 1;
                                    const pct = Math.min(100, Math.round((cat.total / totalExp) * 100));
                                    const IconComponent = CATEGORY_ICONS[cat.category] || Receipt;

                                    return (
                                        <div key={cat.category} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1.5 font-medium text-stone-700">
                                                    <IconComponent className="size-3.5 text-stone-400" />
                                                    {cat.category}
                                                </span>
                                                <span className="font-semibold text-stone-900">
                                                    {money(cat.total)} ({pct}%)
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                                                <div
                                                    className="h-full rounded-full bg-rose-500 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}

                            {(!summary || summary.categoryBreakdown.filter((c) => c.type === 'EXPENSE').length === 0) && (
                                <p className="py-4 text-center text-xs text-stone-400">
                                    No expense categorization data yet.
                                </p>
                            )}
                        </div>
                    </Card>

                    <Card className="border border-stone-200 p-5 shadow-xs">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                            Payment Accounts Distribution
                        </h4>

                        <div className="mt-4 space-y-2.5">
                            {summary?.paymentMethodBreakdown.map((pm) => (
                                <div key={`${pm.payment_method}-${pm.type}`} className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-stone-600">
                                        {pm.payment_method} ({pm.count} txns)
                                    </span>
                                    <span className={clsx('font-bold', pm.type === 'INCOME' ? 'text-emerald-600' : 'text-stone-800')}>
                                        {money(pm.total)}
                                    </span>
                                </div>
                            ))}

                            {(!summary || summary.paymentMethodBreakdown.length === 0) && (
                                <p className="py-4 text-center text-xs text-stone-400">
                                    No payment method data recorded.
                                </p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Day-to-Day Expenses Modal: Add / Edit Transaction */}
            <Modal
                open={isModalOpen}
                onClose={closeModal}
                title={editingTxn ? 'Edit Transaction' : 'Record Transaction'}
                size="lg"
            >
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    {/* Big Type Selector */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setModalType('EXPENSE');
                                const defaults = categoriesData?.EXPENSE || [];
                                if (!defaults.some((c) => c.name === txnCategory)) {
                                    setTxnCategory(defaults[0]?.name || '');
                                }
                            }}
                            className={clsx('modal-type-btn', modalType === 'EXPENSE' ? 'active-expense' : 'inactive')}
                        >
                            <Minus className="size-5 stroke-[3]" /> Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setModalType('INCOME');
                                const defaults = categoriesData?.INCOME || [];
                                if (!defaults.some((c) => c.name === txnCategory)) {
                                    setTxnCategory(defaults[0]?.name || '');
                                }
                            }}
                            className={clsx('modal-type-btn', modalType === 'INCOME' ? 'active-income' : 'inactive')}
                        >
                            <Plus className="size-5 stroke-[3]" /> Income
                        </button>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                            Amount (₹) *
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-stone-400">
                                ₹
                            </span>
                            <input
                                type="number"
                                step="any"
                                min="1"
                                placeholder="0.00"
                                value={amountRupees}
                                onChange={(e) => setAmountRupees(e.target.value)}
                                required
                                autoFocus
                                className={clsx(
                                    'w-full rounded-2xl border-2 py-3 pl-10 pr-4 text-2xl font-black transition-all outline-hidden',
                                    modalType === 'EXPENSE'
                                        ? 'border-rose-200 text-rose-700 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                                        : 'border-emerald-200 text-emerald-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10',
                                )}
                            />
                        </div>
                    </div>

                    {/* Transaction Date */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                                Transaction Date *
                            </label>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setTxnDate(todayStr)}
                                    className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 underline"
                                >
                                    Today
                                </button>
                                <span className="text-stone-300">•</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const y = new Date();
                                        y.setDate(y.getDate() - 1);
                                        setTxnDate(formatYMD(y));
                                    }}
                                    className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 underline"
                                >
                                    Yesterday
                                </button>
                            </div>
                        </div>
                        <Input
                            type="date"
                            value={txnDate}
                            onChange={(e) => setTxnDate(e.target.value)}
                            required
                        />
                    </div>

                    {/* Category Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                            Select Category *
                        </label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                            {currentCategoryList.map((cat) => {
                                const isSelected = txnCategory === cat.name;
                                const IconComponent = CATEGORY_ICONS[cat.name] || TagIcon;

                                return (
                                    <button
                                        key={cat.name}
                                        type="button"
                                        onClick={() => setTxnCategory(cat.name)}
                                        className={clsx(
                                            'category-chip',
                                            isSelected && (modalType === 'EXPENSE' ? 'selected-expense' : 'selected-income'),
                                        )}
                                    >
                                        <IconComponent className="size-3.5" />
                                        <span>{cat.name}</span>
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => setTxnCategory('Custom')}
                                className={clsx(
                                    'category-chip',
                                    txnCategory === 'Custom' && (modalType === 'EXPENSE' ? 'selected-expense' : 'selected-income'),
                                )}
                            >
                                <span>+ Custom Category</span>
                            </button>
                        </div>

                        {txnCategory === 'Custom' && (
                            <Input
                                placeholder="Type your custom category name..."
                                value={txnCustomCategory}
                                onChange={(e) => setTxnCustomCategory(e.target.value)}
                                className="mt-2"
                                required
                            />
                        )}
                    </div>

                    {/* Payment Mode Selector */}
                    <div>
                        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                            Payment Mode / Account
                        </label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {PAYMENT_METHODS.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setTxnPaymentMethod(m.id)}
                                    className={clsx(
                                        'rounded-xl border p-2.5 text-xs font-semibold text-left transition-all',
                                        txnPaymentMethod === m.id
                                            ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                                    )}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Note / Description */}
                    <div>
                        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                            Note / Description *
                        </label>
                        <Textarea
                            placeholder="e.g. Purchased 10 wooden frames 12x18 from wholesale, or Advance payment for Mehendi shoot"
                            value={txnDescription}
                            onChange={(e) => setTxnDescription(e.target.value)}
                            rows={2}
                            required
                        />
                    </div>

                    {/* Reference / Voucher # */}
                    <div>
                        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                            Bill / Invoice / UPI Reference No. (Optional)
                        </label>
                        <Input
                            placeholder="e.g. INV-9821 or UPI-402910"
                            value={txnReference}
                            onChange={(e) => setTxnReference(e.target.value)}
                        />
                    </div>

                    {/* Modal Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                        <Button type="button" variant="secondary" onClick={closeModal}>
                            Cancel
                        </Button>
                        <button
                            type="submit"
                            disabled={saveMutation.isPending}
                            className={clsx(
                                'rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50',
                                modalType === 'EXPENSE'
                                    ? 'bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400',
                            )}
                        >
                            {saveMutation.isPending ? 'Saving...' : editingTxn ? 'Update Transaction' : 'Save Transaction'}
                        </button>
                    </div>
                </form>
            </Modal>
            </div>
        </ColorListShell>
    );
}

function TagIcon(props: any) {
    return <Receipt {...props} />;
}
