// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import clsx from 'clsx';
import { AlertCircle, ChevronLeft, ChevronRight, Inbox, LayoutGrid, Plus, RefreshCw, Search, Table2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { errorMessage } from '../lib/api';
import { titleCase } from '../lib/format';
import { Button, Spinner } from './ui';

/* ---------------- States ---------------- */

export function Loading({ label = 'Loading…', className }: { label?: string; className?: string }) {
    return (
        <div className={clsx('flex flex-col items-center justify-center gap-3 py-16 text-sm text-stone-500', className)} role="status">
            <Spinner />
            {label}
        </div>
    );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
    return (
        <div className={clsx('flex flex-col items-center justify-center gap-3 px-4 py-14 text-center', className)} role="alert">
            <AlertCircle className="size-10 text-red-500" aria-hidden />
            <p className="max-w-md text-sm text-stone-700">{errorMessage(error)}</p>
            {onRetry && (
                <Button variant="secondary" size="sm" icon={<RefreshCw className="size-4" />} onClick={onRetry}>
                    Try again
                </Button>
            )}
        </div>
    );
}

export function EmptyState({ title, description, action, icon, className }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
    return (
        <div className={clsx('flex flex-col items-center justify-center gap-2 px-4 py-14 text-center', className)}>
            <div className="mb-1 text-stone-300">{icon ?? <Inbox className="size-10" aria-hidden />}</div>
            <p className="font-medium text-stone-800">{title}</p>
            {description && <p className="max-w-md text-sm text-stone-500">{description}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

/** Render loading / error / empty / content for a react-query result. */
export function QueryState<T>({
    query,
    children,
    empty,
    isEmpty,
    loadingLabel,
}: {
    query: { data: T | undefined; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown };
    children: (data: T) => ReactNode;
    empty?: ReactNode;
    isEmpty?: (data: T) => boolean;
    loadingLabel?: string;
}) {
    if (query.isLoading) return <Loading label={loadingLabel} />;
    if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
    if (query.data === undefined) return null;
    if (empty && isEmpty?.(query.data)) return <>{empty}</>;
    return <>{children(query.data)}</>;
}

/* ---------------- Status badge ---------------- */

const STATUS_TONES: Record<string, string> = {
    // greens
    CONFIRMED: 'emerald', COMPLETED: 'emerald', SUCCESS: 'emerald', PAID: 'emerald', DELIVERED: 'emerald', APPROVED: 'emerald', PUBLISHED: 'emerald', ACTIVE: 'emerald', READY: 'emerald', ACCEPTED: 'emerald', DONE: 'emerald', GRANTED: 'emerald', RESOLVED: 'emerald', EDITED: 'emerald',
    // ambers
    ENQUIRY: 'amber', QUOTED: 'amber', ADVANCE_PENDING: 'amber', PENDING: 'amber', PROCESSING: 'amber', CREATED: 'amber', SENT: 'amber', QUEUED: 'amber', SUBMITTED: 'amber', REVISION_REQUESTED: 'amber', PARTIAL: 'amber', UPLOADING: 'amber', EDITING: 'amber', OPEN: 'amber', UNPAID: 'amber', DRAFT: 'stone', ASSIGNED: 'amber',
    // blues
    IN_PROGRESS: 'sky', UPCOMING: 'sky', PRINTING: 'sky', PRINTED: 'sky', DISPATCHED: 'sky', IN_TRANSIT: 'sky', PREVIEW: 'sky', SELECTED: 'violet', UPLOADED: 'stone', REOPENED: 'sky',
    LIVE: 'rose',
    // reds
    CANCELLED: 'red', FAILED: 'red', REJECTED: 'red', REFUNDED: 'violet', EXPIRED: 'stone', REVOKED: 'red', EXHAUSTED: 'stone', INACTIVE: 'stone', LOCKED: 'red', ARCHIVED: 'stone',
};
const TONE_CLASSES: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    sky: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    rose: 'bg-rose-50 text-rose-700 ring-rose-600/30',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    stone: 'bg-stone-100 text-stone-600 ring-stone-500/20',
};

export const COLORFUL_THEMES = [
    { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-sky-500 to-indigo-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-fuchsia-600 to-purple-600', text: 'text-white' },
];

export function StatusBadge({ status, label, className }: { status: string | null | undefined; label?: string; className?: string }) {
    if (!status) return <span className="text-stone-400">—</span>;
    const tone = STATUS_TONES[status] ?? 'stone';
    return (
        <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONE_CLASSES[tone], className)}>
            {status === 'LIVE' && <span className="live-dot size-1.5 rounded-full bg-rose-600" />}
            {label ?? titleCase(status)}
        </span>
    );
}

/* ---------------- Table ---------------- */

export interface Column<T> {
    key: string;
    header: ReactNode;
    cell: (row: T) => ReactNode;
    className?: string;
    hideOnMobile?: boolean;
}

export interface TableHeaderToolbarProps {
    total?: number;
    totalLabel?: string;
    search?: string;
    onSearch?: (value: string) => void;
    searchPlaceholder?: string;
    viewMode?: 'table' | 'grid';
    onViewModeChange?: (mode: 'table' | 'grid') => void;
    onAdd?: () => void;
    addLabel?: string;
    extraFilters?: ReactNode;
    children?: ReactNode;
    className?: string;
}

/**
 * Standard table header across all pages:
 * - Left side: Total record count badge + Search option + optional extra filters
 * - Right side: Add icon button + Table/Grid view toggle with solid black border
 */
export function TableHeaderToolbar({
    total,
    totalLabel = 'records',
    search,
    onSearch,
    searchPlaceholder = 'Search records...',
    viewMode = 'table',
    onViewModeChange,
    onAdd,
    addLabel = 'Add',
    extraFilters,
    children,
    className,
}: TableHeaderToolbarProps) {
    return (
        <div className={clsx('flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/70 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl', className)}>
            {/* LEFT SIDE CORNER: TOTAL COUNT + SEARCH OPTION */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                {total !== undefined && (
                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs select-none shrink-0">
                        <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>{total}</span>
                        <span className="text-slate-500 font-normal">{totalLabel}</span>
                    </div>
                )}
                {onSearch && (
                    <div className="relative min-w-[200px] max-w-sm flex-1">
                        <SearchInput
                            value={search ?? ''}
                            onChange={onSearch}
                            placeholder={searchPlaceholder}
                            className="w-full"
                        />
                    </div>
                )}
                {extraFilters}
            </div>

            {/* RIGHT SIDE CORNER: GRID VIEW OR TABLE VIEW OPTION + ADD ICON BUTTON */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 justify-end">
                {children}

                {/* Table View or Grid View options */}
                {onViewModeChange && (
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => onViewModeChange('table')}
                            title="Table View"
                            className={clsx(
                                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer select-none',
                                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900',
                            )}
                        >
                            <Table2 className="size-3.5" />
                            <span className="hidden sm:inline">Table</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewModeChange('grid')}
                            title="Grid View"
                            className={clsx(
                                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer select-none',
                                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900',
                            )}
                        >
                            <LayoutGrid className="size-3.5" />
                            <span className="hidden sm:inline">Grid</span>
                        </button>
                    </div>
                )}

                {/* Add button / icon */}
                {onAdd && (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-3.5 text-xs font-bold text-stone-950 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none"
                    >
                        <Plus className="size-3.5 stroke-[2.5]" />
                        <span>{addLabel}</span>
                    </button>
                )}
            </div>
        </div>
    );
}

export function DataTable<T>({
    rows,
    columns,
    rowKey,
    onRowClick,
    empty,
    className,
    viewMode = 'table',
    renderCard,
}: {
    rows: T[];
    columns: Column<T>[];
    rowKey: (r: T) => string | number;
    onRowClick?: (r: T) => void;
    empty?: ReactNode;
    className?: string;
    viewMode?: 'table' | 'grid';
    renderCard?: (row: T) => ReactNode;
}) {
    if (!rows.length) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;

    if (viewMode === 'grid') {
        return (
            <div className="p-4 bg-slate-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rows.map((r) => {
                        if (renderCard) {
                            return (
                                <div
                                    key={rowKey(r)}
                                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                                    onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(r) : undefined}
                                    tabIndex={onRowClick ? 0 : undefined}
                                    className={clsx(
                                        'rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all flex flex-col justify-between hover:border-amber-400/60 hover:shadow-md overflow-hidden group',
                                        onRowClick && 'cursor-pointer',
                                    )}
                                >
                                    {renderCard(r)}
                                </div>
                            );
                        }
                        const firstCol = columns[0];
                        const otherCols = columns.slice(1);
                        return (
                            <div
                                key={rowKey(r)}
                                onClick={onRowClick ? () => onRowClick(r) : undefined}
                                onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(r) : undefined}
                                tabIndex={onRowClick ? 0 : undefined}
                                className={clsx(
                                    'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all flex flex-col justify-between hover:border-amber-400/40 hover:shadow-md',
                                    onRowClick && 'cursor-pointer',
                                )}
                            >
                                <div>
                                    {firstCol && (
                                        <div className="border-b border-slate-100 pb-2.5 mb-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{firstCol.header}</p>
                                            <div className="mt-1 font-semibold text-slate-900">{firstCol.cell(r)}</div>
                                        </div>
                                    )}
                                    <div className="space-y-2 text-xs">
                                        {otherCols.map((c) => (
                                            <div key={c.key} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-b-0">
                                                <span className="font-medium text-slate-500 uppercase text-[10px]">{c.header}</span>
                                                <span className="text-slate-800 text-right font-medium">{c.cell(r)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className={clsx('scrollbar-thin overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs', className)}>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-200">
                    <tr>
                        {columns.map((c) => (
                            <th key={c.key} scope="col" className={clsx('whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                                {c.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((r) => (
                        <tr
                            key={rowKey(r)}
                            onClick={onRowClick ? () => onRowClick(r) : undefined}
                            onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(r) : undefined}
                            tabIndex={onRowClick ? 0 : undefined}
                            className={clsx(onRowClick && 'cursor-pointer hover:bg-slate-50 focus:bg-slate-100 focus:outline-none transition-colors')}
                        >
                            {columns.map((c) => (
                                <td key={c.key} className={clsx('px-4 py-3 align-middle text-slate-800 font-medium', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                                    {c.cell(r)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
    if (totalPages <= 1) return total ? <p className="px-4 py-3 text-xs text-stone-500">{total} record{total === 1 ? '' : 's'}</p> : null;
    return (
        <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-4 py-3">
            <p className="text-xs text-stone-500">
                Page {page} of {totalPages} · {total} records
            </p>
            <div className="flex gap-1">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" icon={<ChevronLeft className="size-4" />} />
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page" icon={<ChevronRight className="size-4" />} />
            </div>
        </div>
    );
}

/** Debounced search box. */
export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
    const [local, setLocal] = useState(value);
    useEffect(() => setLocal(value), [value]);
    useEffect(() => {
        const t = setTimeout(() => local !== value && onChange(local), 350);
        return () => clearTimeout(t);
    }, [local, value, onChange]);
    return (
        <div className={clsx('relative', className)}>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden />
            <input
                type="search"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="h-10 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm shadow-sm placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
        </div>
    );
}

export function StatCard({ label, value, hint, icon, tone = 'stone', onClick }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'stone' | 'brand' | 'emerald' | 'sky' | 'rose' | 'violet'; onClick?: () => void }) {
    const tones = {
        stone: 'bg-slate-50 text-slate-700 border border-slate-200/70',
        brand: 'bg-amber-50 text-amber-800 border border-amber-200/70',
        emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
        sky: 'bg-sky-50 text-sky-700 border border-sky-200/70',
        rose: 'bg-rose-50 text-rose-700 border border-rose-200/70',
        violet: 'bg-purple-50 text-purple-700 border border-purple-200/70',
    };
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={clsx(
                'group flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 text-left shadow-xs transition-all duration-200',
                onClick ? 'hover:border-amber-400/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : '',
            )}
        >
            {icon && <span className={clsx('flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105', tones[tone])}>{icon}</span>}
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-wider text-slate-500 truncate">{label}</p>
                <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900 font-sans">{value}</p>
                {hint && <p className="mt-0.5 truncate text-xs text-slate-500 font-medium">{hint}</p>}
            </div>
        </Tag>
    );
}
