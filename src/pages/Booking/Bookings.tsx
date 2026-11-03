// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 25-10-2026
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { CalendarDays, CalendarPlus, IndianRupee, LayoutGrid, List, MapPin, PencilLine, Phone, UserRound } from 'lucide-react';
import { useState } from 'react';
import { BookingDrawer } from '../../components/booking/BookingDrawer';
import { PageFooter } from '../../components/staff/StaffDirectory';
import { EmptyState, QueryState, SearchInput, StatusBadge } from '../../components/ui/Data';
import { Select } from '../../components/ui/Form';
import { api, type Paged } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { date, money, titleCase } from '../../utils/format';
import { useListParams, useOpenParam, useViewMode } from '../../hooks';
import { BOOKING_STATUSES, type BookingRow } from '../../types';
import { Avatar } from '../../components/staff/staffCommon';
import './Bookings.scss';

const PAGE_SIZE = 25;

const EVENT_TONES = ['bg-rose-50 text-rose-700', 'bg-violet-50 text-violet-700', 'bg-sky-50 text-sky-700', 'bg-amber-50 text-amber-700', 'bg-emerald-50 text-emerald-700', 'bg-fuchsia-50 text-fuchsia-700'];
const eventTone = (type: string) => EVENT_TONES[[...type].reduce((s, c) => s + c.charCodeAt(0), 0) % EVENT_TONES.length];

const CARD_TONES = [
    { bar: 'from-rose-400 to-pink-500', icon: 'bg-rose-50 text-rose-600' },
    { bar: 'from-violet-400 to-fuchsia-500', icon: 'bg-violet-50 text-violet-600' },
    { bar: 'from-sky-400 to-cyan-500', icon: 'bg-sky-50 text-sky-600' },
    { bar: 'from-amber-400 to-orange-500', icon: 'bg-amber-50 text-amber-600' },
    { bar: 'from-emerald-400 to-teal-500', icon: 'bg-emerald-50 text-emerald-600' },
];

export default function AdminBookings() {
    const { can } = useAuth();
    const { page, search, filters, setPage, setSearch, setFilter } = useListParams(['status'] as const);
    const [openId, setOpenId] = useOpenParam();
    const [creating, setCreating] = useState(false);
    const [detailsOnly, setDetailsOnly] = useState(false);
    const [viewMode, setViewMode] = useViewMode();
    const manage = can('bookings.manage');
    const q = useQuery({
        queryKey: ['bookings', 'admin', page, search, filters],
        queryFn: () => api.get<Paged<BookingRow>>('/api/bookings', { page, pageSize: PAGE_SIZE, search, status: filters.status }),
        placeholderData: (p) => p,
    });

    const open = (r: BookingRow) => {
        setDetailsOnly(false);
        setOpenId(r.id);
    };
    const edit = (r: BookingRow) => {
        setDetailsOnly(true);
        setOpenId(r.id);
    };

    return (
        <div>
            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[var(--soft-shadow)]">
                <header className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-4 py-3">
                    <div className="mr-1 flex items-center gap-2.5">
                        <span className="nq-icon-tile nq-icon-tile--orange" aria-hidden>
                            <CalendarDays className="size-5" />
                        </span>
                        <div className="leading-tight">
                            <p className="font-display text-base font-semibold tracking-tight text-stone-900">Bookings</p>
                            <p className="text-xs text-stone-500">{q.data?.total ?? 0} total</p>
                        </div>
                    </div>
                    <SearchInput value={search} onChange={setSearch} placeholder="Booking no, customer, phone, venue" className="min-w-[12rem] flex-1" inputClassName="rounded-full" />
                    <Select wrapperClassName="w-40" aria-label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="All statuses" options={BOOKING_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                    <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5" role="radiogroup" aria-label="View">
                        {(['table', 'grid'] as const).map((v) => (
                            <button key={v} type="button" role="radio" aria-checked={viewMode === v} aria-label={v === 'table' ? 'Table view' : 'Grid view'} title={v === 'table' ? 'Table view' : 'Grid view'} onClick={() => setViewMode(v)} className={clsx('inline-flex size-8 items-center justify-center rounded-md transition-colors', viewMode === v ? 'bg-white text-ink-900 shadow-sm' : 'text-stone-500 hover:text-stone-800')}>
                                {v === 'table' ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
                            </button>
                        ))}
                    </div>
                    {manage && (
                        <button type="button" onClick={() => setCreating(true)} aria-label="New booking" title="New booking" className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-500 text-ink-900 shadow-sm transition-colors hover:bg-accent-400">
                            <CalendarPlus className="size-5" />
                        </button>
                    )}
                </header>

                <QueryState query={q}>
                    {(d) =>
                        !d.items.length ? (
                            <EmptyState title="No bookings match these filters" />
                        ) : (
                            <>
                                {viewMode === 'table' ? (
                                    <div className="overflow-x-auto p-4">
                                        <table className="bookings-table w-full min-w-[1100px] text-sm">
                                            <thead>
                                                <tr>
                                                    <th className="w-14">S.No</th>
                                                    <th>Booking</th>
                                                    <th>Customer</th>
                                                    <th>Event</th>
                                                    <th>Venue</th>
                                                    <th>Package</th>
                                                    <th className="text-right">Total</th>
                                                    <th className="text-right">Due</th>
                                                    <th>Status</th>
                                                    <th className="w-20 text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {d.items.map((r, i) => {
                                                    const due = Math.max(0, r.total_amount - r.paid_amount);
                                                    return (
                                                        <tr key={r.id} onClick={() => open(r)} className="cursor-pointer">
                                                            <td className="text-stone-500">{(d.page - 1) * PAGE_SIZE + i + 1}</td>
                                                            <td>
                                                                <p className="font-semibold text-stone-900">{r.booking_no}</p>
                                                                <p className="text-xs text-stone-500">{titleCase(r.source)}</p>
                                                            </td>
                                                            <td>
                                                                <div className="flex items-center gap-2.5">
                                                                    <Avatar name={r.customer_name} className="size-8 rounded-full text-[11px]" />
                                                                    <div className="min-w-0">
                                                                        <p className="truncate font-medium text-stone-900">{r.customer_name}</p>
                                                                        <p className="truncate text-xs text-stone-500">
                                                                            {r.customer_phone ? (
                                                                                <span className="inline-flex items-center gap-1">
                                                                                    <Phone className="size-3 text-emerald-500" />
                                                                                    {r.customer_phone}
                                                                                </span>
                                                                            ) : (
                                                                                r.customer_email ?? '—'
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={clsx('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', eventTone(r.event_type))}>{r.event_type}</span>
                                                                <p className="mt-1 inline-flex items-center gap-1 text-xs text-stone-600">
                                                                    <CalendarDays className="size-3 text-sky-500" />
                                                                    {date(r.event_date)}
                                                                </p>
                                                            </td>
                                                            <td className="max-w-[12rem]">
                                                                {r.venue ? (
                                                                    <span className="inline-flex items-center gap-1.5 text-stone-700">
                                                                        <MapPin className="size-3.5 shrink-0 text-rose-500" />
                                                                        <span className="truncate">{r.venue}</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-stone-300">—</span>
                                                                )}
                                                            </td>
                                                            <td className="text-stone-700">{r.package_name ?? <span className="text-stone-400">Custom</span>}</td>
                                                            <td className="text-right font-semibold text-stone-900">{r.total_amount ? money(r.total_amount) : '—'}</td>
                                                            <td className={clsx('text-right font-semibold', due > 0 ? 'text-rose-600' : 'text-emerald-600')}>{money(due)}</td>
                                                            <td>
                                                                <StatusBadge status={r.status} />
                                                            </td>
                                                            <td className="text-center">
                                                                <button type="button" onClick={(e) => (e.stopPropagation(), edit(r))} aria-label={`Edit ${r.booking_no}`} title="Edit" className="inline-flex size-8 items-center justify-center rounded-lg text-sky-600 transition-colors hover:bg-sky-50">
                                                                    <PencilLine className="size-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {d.items.map((r, i) => {
                                            const due = Math.max(0, r.total_amount - r.paid_amount);
                                            const tone = CARD_TONES[i % CARD_TONES.length];
                                            return (
                                                <article key={r.id} onClick={() => open(r)} className="cursor-pointer overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[var(--soft-shadow)] transition-shadow hover:shadow-[var(--soft-shadow-lg)]">
                                                    <div className={clsx('h-1.5 bg-gradient-to-r', tone.bar)} />
                                                    <div className="p-4">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{r.booking_no}</p>
                                                                <h3 className="font-semibold text-stone-900">{r.event_type}</h3>
                                                            </div>
                                                            <StatusBadge status={r.status} />
                                                        </div>
                                                        <div className="mt-3 flex items-center gap-2 text-sm text-stone-700">
                                                            <span className={clsx('flex size-8 items-center justify-center rounded-lg', tone.icon)}>
                                                                <UserRound className="size-4" />
                                                            </span>
                                                            <span className="min-w-0">
                                                                <span className="block truncate font-medium">{r.customer_name}</span>
                                                                <span className="block truncate text-xs text-stone-500">{r.customer_phone ?? r.customer_email ?? '—'}</span>
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-stone-600">
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-sky-700">
                                                                <CalendarDays className="size-3" />
                                                                {date(r.event_date)}
                                                            </span>
                                                            {r.venue && (
                                                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-rose-700">
                                                                    <MapPin className="size-3" />
                                                                    <span className="max-w-[9rem] truncate">{r.venue}</span>
                                                                </span>
                                                            )}
                                                            <span className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-1', due > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
                                                                <IndianRupee className="size-3" />
                                                                {due > 0 ? `Due ${money(due)}` : r.total_amount ? 'Paid' : 'To quote'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                                <PageFooter page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} pageSize={PAGE_SIZE} noun="bookings" />
                            </>
                        )
                    }
                </QueryState>
            </section>

            <BookingDrawer
                id={creating ? 'new' : openId}
                detailsOnly={creating || detailsOnly}
                onClose={() => (creating ? setCreating(false) : (setDetailsOnly(false), setOpenId(null)))}
                onCreated={(id) => {
                    setCreating(false);
                    setDetailsOnly(false);
                    setOpenId(id);
                }}
            />
        </div>
    );
}
