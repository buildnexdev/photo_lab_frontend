import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { todayYmd } from '../lib/format';
import { Button } from './ui';

export type RangeKey = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_30_days' | 'custom';
export interface RangeValue {
    range: RangeKey;
    from?: string;
    to?: string;
}

const OPTIONS: { value: RangeKey; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This week' },
    { value: 'this_month', label: 'This month' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'custom', label: 'Custom' },
];

/** Date range presets; From/To inputs appear only for "Custom" and are validated before applying. */
export function RangeFilter({ value, onChange }: { value: RangeValue; onChange: (v: RangeValue) => void }) {
    const [from, setFrom] = useState(value.from ?? '');
    const [to, setTo] = useState(value.to ?? '');
    const [error, setError] = useState('');
    const applyCustom = () => {
        if (!from || !to) return setError('Choose both dates.');
        if (from > to) return setError('From must be on or before To.');
        setError('');
        onChange({ range: 'custom', from, to });
    };
    return (
        <div className="flex flex-wrap items-end gap-2">
            <div className="inline-flex flex-wrap rounded-lg border border-stone-300 bg-white p-0.5 shadow-sm" role="radiogroup" aria-label="Date range">
                {OPTIONS.map((o) => (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={value.range === o.value}
                        onClick={() => (o.value === 'custom' ? onChange({ range: 'custom', from: value.from, to: value.to }) : onChange({ range: o.value }))}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium sm:text-sm ${value.range === o.value ? 'bg-ink-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
            {value.range === 'custom' && (
                <div className="flex flex-wrap items-end gap-2">
                    <label className="text-xs text-stone-600">
                        From
                        <input type="date" value={from} max={to || todayYmd()} onChange={(e) => setFrom(e.target.value)} className="ml-1 h-9 rounded-lg border border-stone-300 px-2 text-sm" />
                    </label>
                    <label className="text-xs text-stone-600">
                        To
                        <input type="date" value={to} min={from || undefined} max={todayYmd()} onChange={(e) => setTo(e.target.value)} className="ml-1 h-9 rounded-lg border border-stone-300 px-2 text-sm" />
                    </label>
                    <Button size="sm" variant="dark" onClick={applyCustom}>
                        Apply
                    </Button>
                    {error && <span className="text-xs text-red-600">{error}</span>}
                </div>
            )}
        </div>
    );
}

/** Range kept in the URL (?range=&from=&to=) so reports can be shared and survive reloads. */
export function useRangeParams(fallback: RangeKey = 'this_month') {
    const [params, setParams] = useSearchParams();
    const raw = params.get('range') as RangeKey | null;
    const value: RangeValue = { range: raw && OPTIONS.some((o) => o.value === raw) ? raw : fallback, from: params.get('from') ?? undefined, to: params.get('to') ?? undefined };
    const setValue = (v: RangeValue) =>
        setParams(
            (prev) => {
                const p = new URLSearchParams(prev);
                p.set('range', v.range);
                if (v.range === 'custom' && v.from && v.to) {
                    p.set('from', v.from);
                    p.set('to', v.to);
                } else {
                    p.delete('from');
                    p.delete('to');
                }
                return p;
            },
            { replace: true },
        );
    return [value, setValue] as const;
}

export const rangeQuery = (v: RangeValue) => (v.range === 'custom' ? (v.from && v.to ? { range: 'custom', from: v.from, to: v.to } : null) : { range: v.range });
