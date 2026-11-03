// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 27-10-2026
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Camera, Package, Plus, Wrench } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Button, ColorListShell } from '../../components/ui';
import { DataTable, EmptyState, QueryState, SearchInput, StatusBadge } from '../../components/ui/Data';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { money, titleCase, toPaise, toRupees } from '../../utils/format';
import './Assets.scss';

const CATEGORIES = ['CAMERA', 'LENS', 'FLASH', 'TRIPOD', 'LIGHTS', 'MEMORY_CARD', 'LAPTOP', 'PRINTER', 'STUDIO_EQUIPMENT', 'OTHER'] as const;
const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as const;
const STATUSES = ['AVAILABLE', 'ASSIGNED', 'IN_USE', 'MAINTENANCE', 'DAMAGED', 'LOST', 'RETIRED'] as const;

type AssetRow = {
    id: number;
    asset_code: string;
    name: string;
    category: string;
    purchase_price: number;
    current_value: number;
    asset_condition: string;
    location: string | null;
    status: string;
    notes: string | null;
};

type Draft = {
    id: number | null;
    assetCode: string;
    name: string;
    category: (typeof CATEGORIES)[number];
    assetCondition: (typeof CONDITIONS)[number];
    status: (typeof STATUSES)[number];
    location: string;
    purchasePrice: string;
    currentValue: string;
    notes: string;
};

const blank = (): Draft => ({
    id: null,
    assetCode: '',
    name: '',
    category: 'CAMERA',
    assetCondition: 'EXCELLENT',
    status: 'AVAILABLE',
    location: '',
    purchasePrice: '',
    currentValue: '',
    notes: '',
});

const options = (values: readonly string[]) => values.map((value) => ({ value, label: titleCase(value) }));

function Stat({ label, value, icon, tone }: { label: string; value: ReactNode; icon: ReactNode; tone: string }) {
    return (
        <div className={clsx('relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg', tone)}>
            <span className="pointer-events-none absolute -right-5 -top-5 size-20 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{label}</p>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25">{icon}</span>
            </div>
            <p className="relative mt-2 truncate text-2xl font-bold tracking-tight">{value}</p>
        </div>
    );
}

export default function Assets() {
    const { can } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [draft, setDraft] = useState<Draft | null>(null);
    const canEdit = can('events.manage');

    const q = useQuery({
        queryKey: ['assets', category, status],
        queryFn: () => api.get<AssetRow[]>('/api/assets', { ...(category ? { category } : {}), ...(status ? { status } : {}) }),
    });

    const save = useMutation({
        mutationFn: (body: Draft) => {
            const payload = {
                name: body.name,
                category: body.category,
                assetCondition: body.assetCondition,
                status: body.status,
                location: body.location || null,
                purchasePrice: toPaise(body.purchasePrice || 0),
                currentValue: toPaise(body.currentValue || 0),
                notes: body.notes || null,
            };
            return body.id ? api.put(`/api/assets/${body.id}`, payload) : api.post('/api/assets', payload);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['assets'] });
            setDraft(null);
            toast.success('Asset saved');
        },
        onError: (err) => toast.error(err),
    });

    const rows = (q.data ?? []).filter((row) => {
        const needle = search.trim().toLowerCase();
        if (!needle) return true;
        return `${row.asset_code} ${row.name} ${row.location ?? ''}`.toLowerCase().includes(needle);
    });

    const stats = useMemo(() => {
        const all = q.data ?? [];
        return {
            total: all.length,
            available: all.filter((a) => a.status === 'AVAILABLE').length,
            assigned: all.filter((a) => a.status === 'ASSIGNED' || a.status === 'IN_USE').length,
            value: all.reduce((s, a) => s + Number(a.current_value || 0), 0),
        };
    }, [q.data]);

    return (
        <div className="space-y-4">
            <ColorListShell
                icon={Package}
                tone="cyan"
                title="Asset management"
                subtitle="Studio gear inventory, condition and allocation status"
                actions={
                    canEdit ? (
                        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setDraft(blank())}>
                            Add asset
                        </Button>
                    ) : undefined
                }
            >
                <div className="grid grid-cols-2 gap-3 p-3 sm:p-4 xl:grid-cols-4">
                    <Stat label="Total assets" value={stats.total} icon={<Package className="size-5" />} tone="from-sky-500 to-cyan-600" />
                    <Stat label="Available" value={stats.available} icon={<Camera className="size-5" />} tone="from-emerald-500 to-teal-600" />
                    <Stat label="Allocated / in use" value={stats.assigned} icon={<Wrench className="size-5" />} tone="from-amber-400 to-orange-500" />
                    <Stat label="Inventory value" value={money(stats.value, true)} icon={<Package className="size-5" />} tone="from-violet-500 to-fuchsia-600" />
                </div>
                <div className="flex flex-wrap items-end gap-2 border-t border-stone-100 p-3 sm:gap-3 sm:p-4">
                    <SearchInput value={search} onChange={setSearch} placeholder="Code, name or location" className="min-w-[10rem] flex-1 sm:max-w-xs" inputClassName="rounded-full" />
                    <Select aria-label="Category" wrapperClassName="w-40" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="All categories" options={options(CATEGORIES)} />
                    <Select aria-label="Status" wrapperClassName="w-40" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All statuses" options={options(STATUSES)} />
                </div>
                <QueryState query={q}>
                    {() => (
                        <DataTable
                            rows={rows}
                            rowKey={(row) => row.id}
                            onRowClick={
                                canEdit
                                    ? (row) =>
                                          setDraft({
                                              id: row.id,
                                              assetCode: row.asset_code,
                                              name: row.name,
                                              category: row.category as Draft['category'],
                                              assetCondition: row.asset_condition as Draft['assetCondition'],
                                              status: row.status as Draft['status'],
                                              location: row.location ?? '',
                                              purchasePrice: toRupees(row.purchase_price),
                                              currentValue: toRupees(row.current_value),
                                              notes: row.notes ?? '',
                                          })
                                    : undefined
                            }
                            empty={<EmptyState title="No assets yet" description="Add cameras, lenses and kit to track inventory." />}
                            columns={[
                                {
                                    key: 'code',
                                    header: 'Asset',
                                    cell: (row) => (
                                        <div>
                                            <p className="font-medium text-stone-900">{row.name}</p>
                                            <p className="font-mono text-xs text-sky-700">{row.asset_code}</p>
                                        </div>
                                    ),
                                },
                                { key: 'category', header: 'Category', cell: (row) => titleCase(row.category) },
                                { key: 'condition', header: 'Condition', cell: (row) => <StatusBadge status={row.asset_condition} />, hideOnMobile: true },
                                { key: 'value', header: 'Value', cell: (row) => money(row.current_value, true), hideOnMobile: true },
                                { key: 'location', header: 'Location', cell: (row) => row.location || '—', hideOnMobile: true },
                                { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
                            ]}
                        />
                    )}
                </QueryState>
            </ColorListShell>

            <Modal
                open={!!draft}
                onClose={() => setDraft(null)}
                title={draft?.id ? 'Edit asset' : 'Add asset'}
                size="lg"
                footer={
                    draft && (
                        <>
                            <Button variant="secondary" onClick={() => setDraft(null)}>
                                Cancel
                            </Button>
                            <Button loading={save.isPending} onClick={() => save.mutate(draft)}>
                                Save asset
                            </Button>
                        </>
                    )
                }
            >
                {draft && (
                    <form
                        className="grid gap-4 sm:grid-cols-2"
                        onSubmit={(event) => {
                            event.preventDefault();
                            save.mutate(draft);
                        }}
                    >
                        <Input
                            label="Asset code"
                            value={draft.id ? draft.assetCode : 'Auto-generated on save'}
                            disabled
                            hint={draft.id ? 'Codes are permanent after create.' : 'A unique AST-YYMM-##### code is created automatically.'}
                        />
                        <Input label="Name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Sony A7 IV body" />
                        <Select label="Category" value={draft.category} options={options(CATEGORIES)} onChange={(e) => setDraft({ ...draft, category: e.target.value as Draft['category'] })} />
                        <Select label="Condition" value={draft.assetCondition} options={options(CONDITIONS)} onChange={(e) => setDraft({ ...draft, assetCondition: e.target.value as Draft['assetCondition'] })} />
                        <Select label="Status" value={draft.status} options={options(STATUSES)} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft['status'] })} />
                        <Input label="Location" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="e.g. Chennai studio" />
                        <Input label="Purchase price (₹)" type="number" min={0} step="0.01" value={draft.purchasePrice} onChange={(e) => setDraft({ ...draft, purchasePrice: e.target.value })} />
                        <Input label="Current value (₹)" type="number" min={0} step="0.01" value={draft.currentValue} onChange={(e) => setDraft({ ...draft, currentValue: e.target.value })} />
                        <Textarea label="Notes" wrapperClassName="sm:col-span-2" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                    </form>
                )}
            </Modal>
        </div>
    );
}
