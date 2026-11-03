// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 27-10-2026
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, BarChart3, CalendarCheck, Camera, Download, Images, IndianRupee, ShoppingBag, Users, Wallet } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { ChartCard, TrendChart } from '../../components/ui/Charts';
import { DataTable, EmptyState, QueryState } from '../../components/ui/Data';
import { RangeFilter, rangeQuery, useRangeParams } from '../../components/ui/RangeFilter';
import { useToast } from '../../components/ui/Toast';
import { Button, Card, ColorListShell } from '../../components/ui';
import { api, downloadAuthed } from '../../services/api';
import { date, dateTime, money, num, titleCase } from '../../utils/format';
import './Reports.scss';

const REPORTS = [
    { type: 'revenue', label: 'Revenue', hint: 'Collections and booked value', icon: IndianRupee, tile: 'nq-icon-tile--emerald' },
    { type: 'bookings', label: 'Bookings', hint: 'Enquiries to confirmed', icon: CalendarCheck, tile: 'nq-icon-tile--amber' },
    { type: 'payments', label: 'Payments', hint: 'Success, pending, refunds', icon: Wallet, tile: 'nq-icon-tile--sky' },
    { type: 'events', label: 'Events', hint: 'Shoots by status', icon: Camera, tile: 'nq-icon-tile--rose' },
    { type: 'event-performance', label: 'Event performance', hint: 'Opens, views, downloads', icon: BarChart3, tile: 'nq-icon-tile--violet' },
    { type: 'photo-sales', label: 'Photo sales', hint: 'Print and digital orders', icon: ShoppingBag, tile: 'nq-icon-tile--orange' },
    { type: 'downloads', label: 'Downloads', hint: 'HD delivery activity', icon: Images, tile: 'nq-icon-tile--cyan' },
    { type: 'customers', label: 'Customers', hint: 'New and paying clients', icon: Users, tile: 'nq-icon-tile--fuchsia' },
    { type: 'staff', label: 'Staff performance', hint: 'Assignments and output', icon: Users, tile: 'nq-icon-tile--gold' },
] as const;
type ReportType = (typeof REPORTS)[number]['type'];

const MONEY_KEYS = new Set(['revenue', 'refunds', 'averagePerDay', 'bookedValue', 'collected', 'pending', 'refunded', 'amount', 'spend', 'photo_revenue', 'total']);
const SUMMARY_LABELS: Record<string, string> = { conversionPercent: 'Conversion %', averagePerDay: 'Average per day', bookedValue: 'Booked value', newCustomers: 'New customers', payingCustomers: 'Paying customers', photosSold: 'Photos sold' };

interface Report {
    type: ReportType;
    title: string;
    range: { from: string; to: string; label: string };
    summary: Record<string, number>;
    series?: ({ day: string } & Record<string, number | string>)[];
    breakdown?: { label: string; rows: Record<string, unknown>[] }[];
    columns: { key: string; label: string; kind?: 'money' | 'date' | 'datetime' | 'number' }[];
    rows: Record<string, unknown>[];
}

function cell(value: unknown, kind?: string) {
    if (value === null || value === undefined || value === '') return '—';
    if (kind === 'money') return money(Number(value));
    if (kind === 'date') return date(String(value));
    if (kind === 'datetime') return dateTime(String(value));
    if (kind === 'number') return num(Number(value));
    return String(value);
}

const ROW_LIMIT = 200;
const REPORT_TONES = ['from-emerald-500 to-teal-600', 'from-sky-500 to-cyan-600', 'from-amber-400 to-orange-500', 'from-violet-500 to-fuchsia-600', 'from-rose-500 to-pink-600', 'from-zinc-800 to-zinc-950'] as const;

function ReportStat({ label, value, tone }: { label: string; value: ReactNode; tone: string }) {
    return (
        <div className={clsx('relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg', tone)}>
            <span className="pointer-events-none absolute -right-5 -top-5 size-20 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-3">
                <p className="line-clamp-2 text-[11px] font-semibold uppercase leading-snug tracking-wider text-white/80">{label}</p>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25">
                    <BarChart3 className="size-5" />
                </span>
            </div>
            <p className="relative mt-2 truncate text-2xl font-bold tracking-tight">{value}</p>
        </div>
    );
}

export default function AdminReports() {
    const toast = useToast();
    const [params, setParams] = useSearchParams();
    const typeParam = params.get('type');
    const type = (REPORTS.some((r) => r.type === typeParam) ? typeParam : null) as ReportType | null;
    const [range, setRange] = useRangeParams('this_month');
    const rq = rangeQuery(range);
    const [exporting, setExporting] = useState(false);
    const q = useQuery({
        queryKey: ['reports', type, rq],
        queryFn: () => api.get<Report>(`/api/reports/${type}`, rq ?? undefined),
        enabled: !!type && !!rq,
        placeholderData: (p) => (p?.type === type ? p : undefined),
    });
    const exportCsv = async () => {
        if (!rq || !type) return;
        setExporting(true);
        try {
            await downloadAuthed(`/api/reports/${type}`, `${type}-report.csv`, { ...rq, format: 'csv' });
        } catch (e) {
            toast.error(e);
        } finally {
            setExporting(false);
        }
    };
    const setType = (t: ReportType | null) =>
        setParams(
            (prev) => {
                const p = new URLSearchParams(prev);
                if (t) p.set('type', t);
                else p.delete('type');
                return p;
            },
            { replace: true },
        );

    if (!type) {
        return (
            <div className="space-y-4">
                <ColorListShell icon={BarChart3} tone="fuchsia" title="All reports" subtitle="Open any report to filter by date, view charts and export CSV">
                    <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
                        {REPORTS.map((r) => {
                            const Icon = r.icon;
                            return (
                                <button
                                    key={r.type}
                                    type="button"
                                    onClick={() => setType(r.type)}
                                    className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
                                >
                                    <span className={clsx('nq-icon-tile', r.tile)} aria-hidden>
                                        <Icon className="size-4" strokeWidth={2.4} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-semibold text-stone-900">{r.label}</span>
                                        <span className="mt-0.5 block text-xs text-stone-500">{r.hint}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </ColorListShell>
            </div>
        );
    }

    const meta = REPORTS.find((r) => r.type === type)!;
    return (
        <div className="space-y-4">
            <ColorListShell
                icon={BarChart3}
                tone="fuchsia"
                title={meta.label}
                subtitle={q.data ? `${q.data.title} · ${q.data.range.label}` : meta.hint}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" icon={<ArrowLeft className="size-4" />} onClick={() => setType(null)}>
                            All reports
                        </Button>
                        <Button variant="secondary" size="sm" icon={<Download className="size-4" />} loading={exporting} disabled={!rq} onClick={exportCsv}>
                            Export CSV
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-wrap gap-2 border-b border-stone-100 p-3 sm:p-4">
                    {REPORTS.map((r) => (
                        <button key={r.type} type="button" onClick={() => setType(r.type)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${type === r.type ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-sm' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'}`}>
                            {r.label}
                        </button>
                    ))}
                </div>
                <div className="border-b border-stone-100 p-3 sm:p-4">
                    <RangeFilter value={range} onChange={setRange} />
                </div>
                <div className="p-3 sm:p-4">
                    {!rq ? (
                        <EmptyState title="Choose a date range" description="Pick both dates and press Apply." />
                    ) : (
                        <QueryState query={q}>
                            {(r) => {
                                const metric = r.series?.length ? (Object.keys(r.series[0]).find((k) => k !== 'day' && MONEY_KEYS.has(k)) ?? Object.keys(r.series[0]).find((k) => k !== 'day')) : undefined;
                                return (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                                            {Object.entries(r.summary).map(([k, v], i) => (
                                                <ReportStat key={k} label={SUMMARY_LABELS[k] ?? titleCase(k.replace(/([A-Z])/g, '_$1'))} value={MONEY_KEYS.has(k) ? money(v, true) : num(v)} tone={REPORT_TONES[i % REPORT_TONES.length]} />
                                            ))}
                                        </div>
                                        {metric && r.series && (
                                            <ChartCard title={`${titleCase(metric)} by day`} empty={!r.series.some((p) => Number(p[metric]) > 0)}>
                                                <TrendChart data={r.series} dataKey={metric} isMoney={MONEY_KEYS.has(metric)} label={titleCase(metric)} kind={MONEY_KEYS.has(metric) ? 'area' : 'bar'} />
                                            </ChartCard>
                                        )}
                                        {r.breakdown && r.breakdown.length > 0 && (
                                            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                                                {r.breakdown.map((b) => {
                                                    const keys = b.rows.length ? Object.keys(b.rows[0]) : [];
                                                    return (
                                                        <Card key={b.label} title={b.label} padded={false}>
                                                            <DataTable
                                                                rows={b.rows}
                                                                rowKey={(row) => keys.map((k) => String(row[k])).join('|')}
                                                                empty={<p className="p-4 text-sm text-stone-500">No data</p>}
                                                                columns={keys.map((k) => ({
                                                                    key: k,
                                                                    header: titleCase(k),
                                                                    cell: (row: Record<string, unknown>) => (k === 'label' || k === 'status' ? titleCase(String(row[k] ?? '—')) : MONEY_KEYS.has(k) ? money(Number(row[k] ?? 0)) : typeof row[k] === 'number' || /^\d+$/.test(String(row[k])) ? num(Number(row[k])) : cell(row[k])),
                                                                }))}
                                                            />
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <Card title={`Details${r.rows.length > ROW_LIMIT ? ` (first ${ROW_LIMIT} of ${num(r.rows.length)} — export CSV for all)` : ''}`} padded={false}>
                                            <div className="overflow-x-auto">
                                                <DataTable
                                                    rows={r.rows.slice(0, ROW_LIMIT)}
                                                    rowKey={(row) => r.columns.map((c) => String(row[c.key])).join('|') + String(r.rows.indexOf(row))}
                                                    empty={<EmptyState title="No records in this period" />}
                                                    columns={r.columns.map((c) => ({ key: c.key, header: c.label, cell: (row: Record<string, unknown>) => (c.key === 'status' || c.key === 'purpose' ? titleCase(String(row[c.key] ?? '')) || '—' : cell(row[c.key], c.kind)) }))}
                                                />
                                            </div>
                                        </Card>
                                    </div>
                                );
                            }}
                        </QueryState>
                    )}
                </div>
            </ColorListShell>
        </div>
    );
}
