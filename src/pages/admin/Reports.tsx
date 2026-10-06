// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ChartCard, TrendChart } from '../../components/charts';
import { DataTable, EmptyState, QueryState, StatCard } from '../../components/data';
import { RangeFilter, rangeQuery, useRangeParams } from '../../components/RangeFilter';
import { useToast } from '../../components/toast';
import { Button, Card, PageHeader } from '../../components/ui';
import { api, downloadAuthed } from '../../lib/api';
import { date, dateTime, money, num, titleCase } from '../../lib/format';

const REPORTS = [
    { type: 'revenue', label: 'Revenue' },
    { type: 'bookings', label: 'Bookings' },
    { type: 'payments', label: 'Payments' },
    { type: 'events', label: 'Events' },
    { type: 'event-performance', label: 'Event performance' },
    { type: 'photo-sales', label: 'Photo sales' },
    { type: 'downloads', label: 'Downloads' },
    { type: 'customers', label: 'Customers' },
    { type: 'staff', label: 'Staff performance' },
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

export default function AdminReports() {
    const toast = useToast();
    const [params, setParams] = useSearchParams();
    const type = (REPORTS.some((r) => r.type === params.get('type')) ? params.get('type') : 'revenue') as ReportType;
    const [range, setRange] = useRangeParams('this_month');
    const rq = rangeQuery(range);
    const [exporting, setExporting] = useState(false);
    const q = useQuery({
        queryKey: ['reports', type, rq],
        queryFn: () => api.get<Report>(`/api/reports/${type}`, rq ?? undefined),
        enabled: !!rq,
        placeholderData: (p) => (p?.type === type ? p : undefined),
    });
    const exportCsv = async () => {
        if (!rq) return;
        setExporting(true);
        try {
            await downloadAuthed(`/api/reports/${type}`, `${type}-report.csv`, { ...rq, format: 'csv' });
        } catch (e) {
            toast.error(e);
        } finally {
            setExporting(false);
        }
    };
    const setType = (t: ReportType) =>
        setParams(
            (prev) => {
                const p = new URLSearchParams(prev);
                p.set('type', t);
                return p;
            },
            { replace: true },
        );
    return (
        <div>
            <PageHeader
                title="Reports"
                subtitle={q.data ? `${q.data.title} · ${q.data.range.label}` : 'Business performance by period.'}
                actions={
                    <Button variant="secondary" icon={<Download className="size-4" />} loading={exporting} disabled={!rq} onClick={exportCsv}>
                        Export CSV
                    </Button>
                }
            />
            <div className="mb-4 flex flex-wrap gap-2">
                {REPORTS.map((r) => (
                    <button key={r.type} type="button" onClick={() => setType(r.type)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${type === r.type ? 'bg-ink-900 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'}`}>
                        {r.label}
                    </button>
                ))}
            </div>
            <div className="mb-6">
                <RangeFilter value={range} onChange={setRange} />
            </div>
            {!rq ? (
                <EmptyState title="Choose a date range" description="Pick both dates and press Apply." />
            ) : (
                <QueryState query={q}>
                    {(r) => {
                        const metric = r.series?.length ? (Object.keys(r.series[0]).find((k) => k !== 'day' && MONEY_KEYS.has(k)) ?? Object.keys(r.series[0]).find((k) => k !== 'day')) : undefined;
                        return (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                                    {Object.entries(r.summary).map(([k, v]) => (
                                        <StatCard key={k} label={SUMMARY_LABELS[k] ?? titleCase(k.replace(/([A-Z])/g, '_$1'))} value={MONEY_KEYS.has(k) ? money(v, true) : num(v)} />
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
    );
}
