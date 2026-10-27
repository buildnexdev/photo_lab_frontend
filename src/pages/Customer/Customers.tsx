// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 27-10-2026
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { CalendarDays, IndianRupee, LayoutGrid, List, MapPin, Phone, UserPlus, UserRound, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { CustomerDrawer } from '../../components/customer/CustomerDrawer';
import { PageFooter } from '../../components/staff/StaffDirectory';
import { Avatar } from '../../components/staff/staffCommon';
import { EmptyState, QueryState, SearchInput } from '../../components/ui/Data';
import { api, type Paged } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { date, money, titleCase } from '../../utils/format';
import { useListParams, useOpenParam, useViewMode } from '../../hooks';
import './Customers.scss';

const PAGE_SIZE = 25;

const CARD_TONES = [
    { bar: 'from-sky-400 to-cyan-500', icon: 'bg-sky-50 text-sky-600', chip: 'bg-sky-50 text-sky-700' },
    { bar: 'from-violet-400 to-fuchsia-500', icon: 'bg-violet-50 text-violet-600', chip: 'bg-violet-50 text-violet-700' },
    { bar: 'from-amber-400 to-orange-500', icon: 'bg-amber-50 text-amber-600', chip: 'bg-amber-50 text-amber-700' },
    { bar: 'from-emerald-400 to-teal-500', icon: 'bg-emerald-50 text-emerald-600', chip: 'bg-emerald-50 text-emerald-700' },
    { bar: 'from-rose-400 to-pink-500', icon: 'bg-rose-50 text-rose-600', chip: 'bg-rose-50 text-rose-700' },
];

interface CustomerRow {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    source: string;
    user_id: number | null;
    created_at: string;
    bookings: number;
    events: number;
    lifetime_value: number;
}

export default function AdminCustomers() {
    const { can } = useAuth();
    const { page, search, setPage, setSearch } = useListParams();
    const [openId, setOpenId] = useOpenParam();
    const [viewMode, setViewMode] = useViewMode();
    const [creating, setCreating] = useState(false);
    const manage = can('customers.manage');
    const q = useQuery({
        queryKey: ['customers', 'list', page, search],
        queryFn: () => api.get<Paged<CustomerRow>>('/api/customers', { page, pageSize: PAGE_SIZE, search }),
        placeholderData: (p) => p,
    });

    return (
        <div>
            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[var(--soft-shadow)]">
                <header className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-4 py-3">
                    <div className="mr-1 flex items-center gap-2.5">
                        <span className="nq-icon-tile nq-icon-tile--emerald" aria-hidden>
                            <UserRound className="size-5" strokeWidth={2.25} />
                        </span>
                        <div className="leading-tight">
                            <p className="font-display text-base font-semibold tracking-tight text-stone-900">Customers</p>
                            <p className="text-xs text-stone-500">{q.data?.total ?? 0} total</p>
                        </div>
                    </div>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, email or city" className="min-w-[12rem] flex-1" inputClassName="rounded-full" />
                    <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5" role="radiogroup" aria-label="View">
                        {(['table', 'grid'] as const).map((v) => (
                            <button
                                key={v}
                                type="button"
                                role="radio"
                                aria-checked={viewMode === v}
                                aria-label={v === 'table' ? 'Table view' : 'Grid view'}
                                title={v === 'table' ? 'Table view' : 'Grid view'}
                                onClick={() => setViewMode(v)}
                                className={clsx('inline-flex size-8 items-center justify-center rounded-md transition-colors', viewMode === v ? 'bg-white text-ink-900 shadow-sm' : 'text-stone-500 hover:text-stone-800')}
                            >
                                {v === 'table' ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
                            </button>
                        ))}
                    </div>
                    {manage && (
                        <button type="button" onClick={() => setCreating(true)} aria-label="Add customer" title="Add customer" className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-500 text-ink-900 shadow-sm transition-colors hover:bg-accent-400">
                            <UserPlus className="size-5" />
                        </button>
                    )}
                </header>

                <QueryState query={q}>
                    {(d) =>
                        !d.items.length ? (
                            <EmptyState title={search ? 'No customers match your search' : 'No customers yet'} />
                        ) : (
                            <>
                                {viewMode === 'table' ? (
                                    <div className="overflow-x-auto p-4">
                                        <table className="customers-table w-full min-w-[960px] text-sm">
                                            <thead>
                                                <tr>
                                                    <th className="w-14">S.No</th>
                                                    <th>Customer</th>
                                                    <th>City</th>
                                                    <th className="text-center">Bookings</th>
                                                    <th className="text-center">Events</th>
                                                    <th className="text-right">Lifetime value</th>
                                                    <th>Source</th>
                                                    <th>Since</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {d.items.map((r, i) => (
                                                    <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer">
                                                        <td className="text-stone-500">{(d.page - 1) * PAGE_SIZE + i + 1}</td>
                                                        <td>
                                                            <div className="flex items-center gap-2.5">
                                                                <Avatar name={r.name} className="size-8 rounded-full text-[11px]" />
                                                                <div className="min-w-0">
                                                                    <p className="flex items-center gap-1.5 truncate font-medium text-stone-900">
                                                                        {r.name}
                                                                        {r.user_id ? <UserCheck className="size-3.5 shrink-0 text-emerald-600" aria-label="Has an online account" /> : null}
                                                                    </p>
                                                                    <p className="truncate text-xs text-stone-500">
                                                                        {r.phone ? (
                                                                            <span className="inline-flex items-center gap-1">
                                                                                <Phone className="size-3 text-emerald-500" />
                                                                                {r.phone}
                                                                            </span>
                                                                        ) : null}
                                                                        {r.phone && r.email ? ' · ' : null}
                                                                        {r.email ?? (!r.phone ? '—' : null)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {r.city ? (
                                                                <span className="inline-flex items-center gap-1.5 text-stone-700">
                                                                    <MapPin className="size-3.5 shrink-0 text-rose-500" />
                                                                    {r.city}
                                                                </span>
                                                            ) : (
                                                                <span className="text-stone-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="text-center font-semibold text-stone-800">{r.bookings}</td>
                                                        <td className="text-center font-semibold text-stone-800">{r.events}</td>
                                                        <td className="text-right font-semibold text-stone-900">{money(r.lifetime_value)}</td>
                                                        <td>
                                                            <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">{titleCase(r.source)}</span>
                                                        </td>
                                                        <td className="text-stone-600">{date(r.created_at)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {d.items.map((r, i) => {
                                            const tone = CARD_TONES[i % CARD_TONES.length];
                                            return (
                                                <article
                                                    key={r.id}
                                                    onClick={() => setOpenId(r.id)}
                                                    className="cursor-pointer overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[var(--soft-shadow)] transition-shadow hover:shadow-[var(--soft-shadow-lg)]"
                                                >
                                                    <div className={clsx('h-1.5 bg-gradient-to-r', tone.bar)} />
                                                    <div className="p-4">
                                                        <div className="flex items-start gap-3">
                                                            <span className={clsx('flex size-11 shrink-0 items-center justify-center rounded-xl', tone.icon)}>
                                                                <UserRound className="size-5" />
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="flex items-center gap-1.5 truncate font-semibold text-stone-900">
                                                                    {r.name}
                                                                    {r.user_id ? <UserCheck className="size-3.5 shrink-0 text-emerald-600" aria-label="Has an online account" /> : null}
                                                                </p>
                                                                <p className="mt-0.5 truncate text-xs text-stone-500">
                                                                    {r.phone ? (
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <Phone className="size-3 text-emerald-500" />
                                                                            {r.phone}
                                                                        </span>
                                                                    ) : null}
                                                                    {r.phone && r.email ? ' · ' : null}
                                                                    {r.email ?? (!r.phone ? '—' : null)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                                            <div className="rounded-xl bg-stone-50 px-3 py-2">
                                                                <p className="font-semibold uppercase tracking-wide text-stone-400">City</p>
                                                                <p className="mt-0.5 truncate font-medium text-stone-800">{r.city ?? '—'}</p>
                                                            </div>
                                                            <div className="rounded-xl bg-stone-50 px-3 py-2">
                                                                <p className="font-semibold uppercase tracking-wide text-stone-400">Source</p>
                                                                <p className="mt-0.5 truncate font-medium text-stone-800">{titleCase(r.source)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                                                            <span className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-1', tone.chip)}>
                                                                <CalendarDays className="size-3" />
                                                                {r.bookings} bookings · {r.events} events
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                                                                <IndianRupee className="size-3" />
                                                                {money(r.lifetime_value)}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-stone-600">Since {date(r.created_at)}</span>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                                <PageFooter page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} pageSize={PAGE_SIZE} noun="customers" />
                            </>
                        )
                    }
                </QueryState>
            </section>

            <CustomerDrawer
                id={creating ? 'new' : openId}
                onClose={() => (creating ? setCreating(false) : setOpenId(null))}
                onCreated={(id) => {
                    setCreating(false);
                    setOpenId(id);
                }}
            />
        </div>
    );
}
