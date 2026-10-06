// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, type Paged } from '../lib/api';
import { Field } from './form';

export interface CustomerOption {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    city?: string | null;
}

/** Searchable customer selector (server-side search, debounced). */
export function CustomerPicker({ value, onChange, error, label = 'Customer', required, initial }: { value: number | null; onChange: (c: CustomerOption | null) => void; error?: string; label?: string; required?: boolean; initial?: CustomerOption | null }) {
    const [selected, setSelected] = useState<CustomerOption | null>(initial ?? null);
    const [term, setTerm] = useState('');
    const [debounced, setDebounced] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(term.trim()), 300);
        return () => clearTimeout(t);
    }, [term]);
    useEffect(() => {
        if (!value) setSelected(null);
    }, [value]);
    useEffect(() => {
        if (initial) setSelected(initial);
    }, [initial]);
    useEffect(() => {
        const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const q = useQuery({
        queryKey: ['customers', 'picker', debounced],
        queryFn: () => api.get<Paged<CustomerOption>>('/api/customers', { search: debounced || undefined, pageSize: 10 }),
        enabled: open,
        staleTime: 30_000,
    });

    if (selected && value) {
        return (
            <Field label={label} required={required} error={error}>
                <div className="flex h-10 items-center justify-between rounded-lg border border-stone-300 bg-stone-50 px-3 text-sm">
                    <span className="truncate">
                        <span className="font-medium">{selected.name}</span>
                        <span className="text-stone-500"> · {selected.phone ?? selected.email}</span>
                    </span>
                    <button
                        type="button"
                        className="rounded p-1 text-stone-500 hover:bg-stone-200"
                        aria-label="Change customer"
                        onClick={() => {
                            setSelected(null);
                            onChange(null);
                        }}
                    >
                        <X className="size-4" />
                    </button>
                </div>
            </Field>
        );
    }

    return (
        <Field label={label} required={required} error={error}>
            <div className="relative" ref={ref}>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                <input
                    value={term}
                    onChange={(e) => {
                        setTerm(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search by name, phone or email"
                    aria-invalid={!!error || undefined}
                    className={`h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 ${error ? 'border-red-400' : 'border-stone-300'}`}
                />
                {open && (
                    <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                        {q.isLoading && <li className="px-3 py-2 text-sm text-stone-500">Searching…</li>}
                        {q.isError && <li className="px-3 py-2 text-sm text-red-600">Could not load customers.</li>}
                        {q.data && !q.data.items.length && <li className="px-3 py-2 text-sm text-stone-500">No customers found. Add them under Customers first.</li>}
                        {q.data?.items.map((c) => (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-50"
                                    onClick={() => {
                                        setSelected(c);
                                        onChange(c);
                                        setOpen(false);
                                        setTerm('');
                                    }}
                                >
                                    <span className="font-medium">{c.name}</span>
                                    <span className="block text-xs text-stone-500">{[c.phone, c.email, c.city].filter(Boolean).join(' · ')}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Field>
    );
}
