// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, FileText, LayoutGrid, List, MapPin, PencilLine, Phone, Settings2, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { useEffect, useState, type MouseEvent } from 'react';
import { api, type Paged } from '../../services/api';
import { ROLE_LABELS, useAuth, type Role } from '../../hooks/useAuth';
import { useInvalidate, useListParams, useOpenParam } from '../../hooks';
import { EmptyState, QueryState, SearchInput } from '../ui/Data';
import { Select } from '../ui/Form';
import { useConfirm } from '../ui/Overlay';
import { useToast } from '../ui/Toast';
import { Avatar, STAFF_ROLE_CODES, type UserDetail, type UserRow } from './staffCommon';
import { PageAccessModal } from './PageAccessModal';
import { UserDrawer } from './UserDrawer';
import './StaffDirectory.scss';

const PAGE_SIZE = 10;
const VIEW_KEY = 'staff-directory-view';

const TAG_TONES = ['bg-sky-50 text-sky-700', 'bg-rose-50 text-rose-700', 'bg-emerald-50 text-emerald-700', 'bg-amber-50 text-amber-700', 'bg-violet-50 text-violet-700'];

const Muted = () => <span className="text-stone-300">—</span>;
const formatDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
function timeAgo(iso: string) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
const roleText = (roles: Role[]) => roles.map((r) => ROLE_LABELS[r] ?? r).join(', ');
const tagsOf = (r: UserRow) =>
    [r.designation, r.department, ...(r.photographer_specialties ?? '').split(','), ...(r.software ?? '').split(',')]
        .map((t) => t?.trim())
        .filter((t, i, all): t is string => !!t && all.indexOf(t) === i)
        .slice(0, 3);

const bodyFrom = (u: UserDetail, status: UserRow['status']) => ({
    name: u.name,
    email: u.email,
    phone: u.phone || null,
    roles: u.roles,
    status,
    designation: u.designation || null,
    department: u.department || null,
    cameraGear: u.camera_gear || null,
    specialties: u.photographer_specialties || u.editor_specialties || null,
    software: u.software || null,
});

function StatusSwitch({ row, disabled, busy, onToggle }: { row: UserRow; disabled?: boolean; busy?: boolean; onToggle: () => void }) {
    const on = row.status === 'ACTIVE';
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={on ? 'Deactivate' : 'Activate'}
                disabled={disabled || busy}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={clsx('relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50', on ? 'bg-emerald-500' : 'bg-stone-300')}
            >
                <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', on ? 'left-[1.375rem]' : 'left-0.5')} />
            </button>
            <span className={clsx('text-xs font-semibold', on ? 'text-emerald-700' : row.status === 'LOCKED' ? 'text-rose-600' : 'text-stone-500')}>{on ? 'Active' : row.status === 'LOCKED' ? 'Locked' : 'Inactive'}</span>
        </div>
    );
}

export function PageFooter({ page, totalPages, total, onPage, pageSize = PAGE_SIZE, noun = 'staff' }: { page: number; totalPages: number; total: number; onPage: (p: number) => void; pageSize?: number; noun?: string }) {
    const from = total ? (page - 1) * pageSize + 1 : 0;
    const to = Math.min(page * pageSize, total);
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
    const btn = 'inline-flex size-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40';
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/60 px-4 py-3">
            <p className="text-xs text-stone-500">
                Showing <b className="text-stone-800">{from}</b>–<b className="text-stone-800">{to}</b> of <b className="text-stone-800">{total}</b> {noun}
            </p>
            <div className="flex items-center gap-1">
                <button type="button" className={clsx(btn, 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100')} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
                    <ChevronLeft className="size-4" />
                </button>
                {pages.map((p) => (
                    <button key={p} type="button" onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined} className={clsx(btn, p === page ? 'border-ink-900 bg-ink-900 text-accent-300' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100')}>
                        {p}
                    </button>
                ))}
                <button type="button" className={clsx(btn, 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100')} disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
                    <ChevronRight className="size-4" />
                </button>
            </div>
        </div>
    );
}

/** Staff list scoped to one role (photographers, editors) or all staff. */
export function StaffDirectory({ role, title }: { role?: Role; title: string; subtitle?: string }) {
    const { can, user, hasRole } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const { page, search, filters, setPage, setSearch, setFilter } = useListParams(['status', 'role'] as const);
    const [openId, setOpenId] = useOpenParam();
    const [creating, setCreating] = useOpenParam('new');
    const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'));
    useEffect(() => localStorage.setItem(VIEW_KEY, view), [view]);
    const roleFilter = role ?? (filters.role as Role | '');
    const q = useQuery({
        queryKey: ['users', 'list', role ?? 'staff', page, search, filters, PAGE_SIZE],
        queryFn: () => api.get<Paged<UserRow>>('/api/users', { page, pageSize: PAGE_SIZE, search, status: filters.status, role: roleFilter || undefined, staffOnly: roleFilter ? undefined : 'true' }),
        placeholderData: (p) => p,
    });
    const manage = can('users.manage', 'staff.manage');
    const canDelete = can('users.manage');

    const toggle = useMutation({
        mutationFn: async (r: UserRow) => {
            const u = await api.get<UserDetail>(`/api/users/${r.id}`);
            return api.send('PUT', `/api/users/${r.id}`, bodyFrom(u, u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'));
        },
        onSuccess: (r) => (toast.success(r.message), invalidate(['users'])),
        onError: (e) => toast.error(e),
    });
    const remove = useMutation({
        mutationFn: (id: number) => api.send('DELETE', `/api/users/${id}`),
        onSuccess: (r) => (toast.success(r.message), invalidate(['users'])),
        onError: (e) => toast.error(e),
    });
    const askRemove = async (e: MouseEvent, r: UserRow) => {
        e.stopPropagation();
        if (await ask({ title: `Remove ${r.name}?`, message: 'They are signed out everywhere and can no longer sign in. Their past work stays in the records.', confirmLabel: 'Remove' })) remove.mutate(r.id);
    };
    const open = (r: UserRow) => manage && setOpenId(r.id);
    const isSelf = (r: UserRow) => r.id === user?.id;
    const isAdmin = !!user?.isAdmin;
    const [accessId, setAccessId] = useState<number | null>(null);
    const canManageAccess = (r: UserRow) => !isSelf(r) && (hasRole('SUPER_ADMIN') || !r.roles.some((c) => c === 'STUDIO_OWNER' || c === 'COMPANY_ADMIN'));
    const statusTabs = [
        { value: '', label: 'All' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
    ];

    return (
        <div>
            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[var(--soft-shadow)]">
                <header className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-4 py-3">
                    <div className="mr-1 flex items-center gap-2.5">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-ink-900 text-accent-400 shadow-sm">
                            <Users className="size-5" />
                        </span>
                        <div className="leading-tight">
                            <p className="text-sm font-semibold text-stone-900">{title}</p>
                            <p className="text-xs text-stone-500">{q.data?.total ?? 0} total</p>
                        </div>
                    </div>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or phone" className="min-w-[12rem] flex-1" />
                    {!role && <Select wrapperClassName="w-48" aria-label="Role" value={filters.role} onChange={(e) => setFilter('role', e.target.value)} placeholder="All roles" options={STAFF_ROLE_CODES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />}
                    <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5" role="radiogroup" aria-label="Status">
                        {statusTabs.map((t) => (
                            <button key={t.value} type="button" role="radio" aria-checked={(filters.status ?? '') === t.value} onClick={() => setFilter('status', t.value)} className={clsx('rounded-md px-3 py-1.5 text-xs font-semibold transition-colors', (filters.status ?? '') === t.value ? (t.value === 'INACTIVE' ? 'bg-stone-700 text-white' : t.value === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-ink-900 text-accent-300') : 'text-stone-600 hover:text-stone-900')}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5" role="radiogroup" aria-label="View">
                        {(['list', 'grid'] as const).map((v) => (
                            <button key={v} type="button" role="radio" aria-checked={view === v} aria-label={v === 'list' ? 'List view' : 'Grid view'} title={v === 'list' ? 'List view' : 'Grid view'} onClick={() => setView(v)} className={clsx('inline-flex size-8 items-center justify-center rounded-md transition-colors', view === v ? 'bg-white text-ink-900 shadow-sm' : 'text-stone-500 hover:text-stone-800')}>
                                {v === 'list' ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
                            </button>
                        ))}
                    </div>
                    {manage && (
                        <button type="button" onClick={() => setCreating(1)} aria-label={`Add ${role ? ROLE_LABELS[role].toLowerCase() : 'staff member'}`} title="Add" className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-500 text-ink-900 shadow-sm transition-colors hover:bg-accent-400">
                            <UserPlus className="size-5" />
                        </button>
                    )}
                </header>

                <QueryState query={q}>
                    {(d) =>
                        !d.items.length ? (
                            <EmptyState title="No one here yet" />
                        ) : (
                            <>
                                {view === 'list' ? (
                                    <div className="overflow-x-auto p-4">
                                        <table className="staff-table w-full min-w-[1100px] border-collapse text-sm">
                                            <thead>
                                                <tr>
                                                    <th className="w-14">S.No</th>
                                                    <th>Name</th>
                                                    <th>Phone number</th>
                                                    <th>Designation</th>
                                                    <th>Role</th>
                                                    <th>Location</th>
                                                    <th>Joined on</th>
                                                    <th>Last login</th>
                                                    <th className="text-center">Docs</th>
                                                    <th className="w-36">Status</th>
                                                    {isAdmin && <th className="w-36 text-center">Manage</th>}
                                                    <th className="w-24 text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {d.items.map((r, i) => (
                                                    <tr key={r.id} onClick={() => open(r)} className={clsx(manage && 'cursor-pointer')}>
                                                        <td className="text-stone-500">{(d.page - 1) * PAGE_SIZE + i + 1}</td>
                                                        <td>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar name={r.name} className="size-9 rounded-full text-xs" />
                                                                <div className="min-w-0">
                                                                    <p className="truncate font-medium text-stone-900">{r.name}</p>
                                                                    <p className="truncate text-xs text-stone-500">{r.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-nowrap text-stone-700">
                                                            {r.phone ? (
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <Phone className="size-3.5 text-emerald-500" />
                                                                    {r.phone}
                                                                </span>
                                                            ) : (
                                                                <Muted />
                                                            )}
                                                        </td>
                                                        <td>
                                                            {r.designation || r.department ? (
                                                                <div className="min-w-0 leading-tight">
                                                                    <p className="truncate font-medium text-stone-800">{r.designation || '—'}</p>
                                                                    {r.department && <p className="truncate text-xs text-stone-500">{r.department}</p>}
                                                                </div>
                                                            ) : (
                                                                <Muted />
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className="inline-flex rounded-md bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-800 ring-1 ring-accent-200">{roleText(r.roles)}</span>
                                                        </td>
                                                        <td className="whitespace-nowrap text-stone-700">
                                                            {r.city ? (
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <MapPin className="size-3.5 text-rose-500" />
                                                                    {r.city}
                                                                </span>
                                                            ) : (
                                                                <Muted />
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap text-stone-700">
                                                            {r.joined_on ? (
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <CalendarDays className="size-3.5 text-sky-500" />
                                                                    {formatDate(r.joined_on)}
                                                                </span>
                                                            ) : (
                                                                <Muted />
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap">
                                                            <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', r.last_login_at ? 'text-stone-700' : 'text-stone-400')} title={r.last_login_at ? new Date(r.last_login_at).toLocaleString() : undefined}>
                                                                <Clock3 className={clsx('size-3.5', r.last_login_at ? 'text-violet-500' : 'text-stone-300')} />
                                                                {r.last_login_at ? timeAgo(r.last_login_at) : 'Never'}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className={clsx('inline-flex min-w-7 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', r.documents ? 'bg-sky-50 text-sky-700' : 'bg-stone-100 text-stone-400')}>
                                                                <FileText className="size-3" />
                                                                {r.documents ?? 0}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <StatusSwitch row={r} disabled={!manage || isSelf(r)} busy={toggle.isPending && toggle.variables?.id === r.id} onToggle={() => toggle.mutate(r)} />
                                                        </td>
                                                        {isAdmin && (
                                                            <td className="text-center">
                                                                {r.roles.includes('SUPER_ADMIN') ? (
                                                                    <span className="text-xs font-semibold text-stone-400">All pages</span>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        disabled={!canManageAccess(r)}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setAccessId(r.id);
                                                                        }}
                                                                        title="Page access"
                                                                        className={clsx(
                                                                            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                                                                            r.custom_pages ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                                                                        )}
                                                                    >
                                                                        <ShieldCheck className="size-3.5" />
                                                                        {r.custom_pages ? `Custom · ${r.custom_pages}` : 'Page access'}
                                                                    </button>
                                                                )}
                                                            </td>
                                                        )}
                                                        <td className="text-center">
                                                            <div className="inline-flex items-center gap-1">
                                                                {manage && (
                                                                    <button type="button" onClick={(e) => (e.stopPropagation(), open(r))} aria-label={`Edit ${r.name}`} title="Edit" className="inline-flex size-8 items-center justify-center rounded-lg text-sky-600 transition-colors hover:bg-sky-50">
                                                                        <PencilLine className="size-4" />
                                                                    </button>
                                                                )}
                                                                <button type="button" disabled={!canDelete || isSelf(r)} onClick={(e) => askRemove(e, r)} aria-label={`Remove ${r.name}`} title="Remove" className="inline-flex size-8 items-center justify-center rounded-lg text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30">
                                                                    <Trash2 className="size-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {d.items.map((r) => (
                                            <article key={r.id} onClick={() => open(r)} className={clsx('relative flex gap-4 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-[var(--soft-shadow)] transition-shadow hover:shadow-[var(--soft-shadow-lg)]', manage && 'cursor-pointer')}>
                                                <Avatar name={r.name} dot={r.status === 'ACTIVE'} className="size-24 rounded-xl text-3xl" />
                                                <div className="min-w-0 flex-1 pr-8">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <h3 className="truncate font-semibold text-stone-900">{r.name}</h3>
                                                        <span className="rounded-md border border-emerald-500 px-1.5 text-[11px] font-semibold text-emerald-700">{roleText(r.roles)}</span>
                                                    </div>
                                                    <p className="mt-0.5 truncate text-xs text-stone-500">{r.email}</p>
                                                    <p className="truncate text-xs text-stone-500">{r.phone || 'No phone'}</p>
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {tagsOf(r).map((t, i) => (
                                                            <span key={t} className={clsx('rounded-md px-2 py-0.5 text-[11px] font-semibold', TAG_TONES[i % TAG_TONES.length])}>
                                                                {t}
                                                            </span>
                                                        ))}
                                                        {r.status !== 'ACTIVE' && <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">{r.status === 'LOCKED' ? 'Locked' : 'Inactive'}</span>}
                                                    </div>
                                                </div>
                                                {manage && (
                                                    <button type="button" onClick={(e) => (e.stopPropagation(), open(r))} aria-label={`Edit ${r.name}`} className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200">
                                                        <Settings2 className="size-4" />
                                                    </button>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                )}
                                <PageFooter page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                            </>
                        )
                    }
                </QueryState>
            </section>
            <UserDrawer id={creating ? 'new' : openId} defaultRole={role} onClose={() => (creating ? setCreating(null) : setOpenId(null))} />
            {isAdmin && <PageAccessModal id={accessId} onClose={() => setAccessId(null)} />}
            {dialog}
        </div>
    );
}
