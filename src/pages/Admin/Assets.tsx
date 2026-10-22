import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Card } from '../../components/ui';
import { DataTable, EmptyState, QueryState, StatusBadge, TableHeaderToolbar } from '../../components/ui/Data';
import { Input, Select, Textarea } from '../../components/ui/Form';
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

export default function Assets() {
    const { can } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [draft, setDraft] = useState<Draft | null>(null);
    const canEdit = can('events.manage');

    const q = useQuery({
        queryKey: ['assets', category],
        queryFn: () => api.get<AssetRow[]>('/api/assets', category ? { category } : undefined),
    });

    const save = useMutation({
        mutationFn: (body: Draft) => {
            const payload = {
                assetCode: body.assetCode,
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
            toast.success('Equipment saved');
        },
        onError: (err) => toast.error(err),
    });

    const rows = (q.data ?? []).filter((row) => {
        const needle = search.trim().toLowerCase();
        if (!needle) return true;
        return `${row.asset_code} ${row.name} ${row.location ?? ''}`.toLowerCase().includes(needle);
    });

    return (
        <div className="space-y-4">
            <Card padded={false} className="overflow-hidden">
                <TableHeaderToolbar
                    total={rows.length}
                    totalLabel="Equipment"
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder="Code, name or location"
                    onAdd={canEdit ? () => setDraft(blank()) : undefined}
                    addLabel="Add equipment"
                    extraFilters={
                        <Select aria-label="Category" wrapperClassName="w-44" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="All categories" options={options(CATEGORIES)} />
                    }
                />
                <QueryState query={q}>
                    {() => (
                        <DataTable
                            rows={rows}
                            rowKey={(row) => row.id}
                            onRowClick={canEdit ? (row) => setDraft({
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
                            }) : undefined}
                            empty={<EmptyState title="No equipment yet" />}
                            columns={[
                                { key: 'code', header: 'Equipment', cell: (row) => (<div><p className="font-medium text-stone-900">{row.name}</p><p className="text-xs text-stone-500">{row.asset_code}</p></div>) },
                                { key: 'category', header: 'Category', cell: (row) => titleCase(row.category) },
                                { key: 'condition', header: 'Condition', cell: (row) => <StatusBadge status={row.asset_condition} />, hideOnMobile: true },
                                { key: 'value', header: 'Value', cell: (row) => money(row.current_value, true), hideOnMobile: true },
                                { key: 'location', header: 'Location', cell: (row) => row.location || '—', hideOnMobile: true },
                                { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
                            ]}
                        />
                    )}
                </QueryState>
            </Card>

            {draft && (
                <Card title={draft.id ? 'Edit equipment' : 'Add equipment'}>
                    <form
                        className="grid gap-4 sm:grid-cols-2"
                        onSubmit={(event) => {
                            event.preventDefault();
                            save.mutate(draft);
                        }}
                    >
                        <Input label="Asset code" required value={draft.assetCode} onChange={(e) => setDraft({ ...draft, assetCode: e.target.value })} />
                        <Input label="Name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                        <Select label="Category" value={draft.category} options={options(CATEGORIES)} onChange={(e) => setDraft({ ...draft, category: e.target.value as Draft['category'] })} />
                        <Select label="Condition" value={draft.assetCondition} options={options(CONDITIONS)} onChange={(e) => setDraft({ ...draft, assetCondition: e.target.value as Draft['assetCondition'] })} />
                        <Select label="Status" value={draft.status} options={options(STATUSES)} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft['status'] })} />
                        <Input label="Location" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
                        <Input label="Purchase price (₹)" type="number" min={0} step="0.01" value={draft.purchasePrice} onChange={(e) => setDraft({ ...draft, purchasePrice: e.target.value })} />
                        <Input label="Current value (₹)" type="number" min={0} step="0.01" value={draft.currentValue} onChange={(e) => setDraft({ ...draft, currentValue: e.target.value })} />
                        <Textarea label="Notes" wrapperClassName="sm:col-span-2" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                        <div className="flex gap-2 sm:col-span-2">
                            <Button type="submit" loading={save.isPending}>Save</Button>
                            <Button type="button" variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                        </div>
                    </form>
                </Card>
            )}
        </div>
    );
}
