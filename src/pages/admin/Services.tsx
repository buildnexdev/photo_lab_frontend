// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DataTable, EmptyState, QueryState, StatusBadge, TableHeaderToolbar, COLORFUL_THEMES } from '../../components/data';
import { Checkbox, FormGrid, Input, Textarea } from '../../components/form';
import { Modal, useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Button, Card, IconButton, PageHeader } from '../../components/ui';
import { api, applyFieldErrors } from '../../lib/api';
import { money, toPaise, toRupees } from '../../lib/format';
import { useInvalidate, useViewMode } from '../../lib/hooks';
import { clsx } from 'clsx';

interface ServiceRow {
    id: number;
    name: string;
    summary: string | null;
    description: string | null;
    icon: string | null;
    base_price: number;
    is_active: number;
    sort_order: number;
}

const amount = z.string().trim().refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 10_000_000, 'Enter a valid amount');
const schema = z.object({
    name: z.string().trim().min(2, 'Enter a name').max(120),
    summary: z.string().trim().max(255),
    description: z.string().trim().max(5000),
    basePrice: amount,
    sortOrder: z.coerce.number().int().min(0).max(9999),
    isActive: z.boolean(),
});
type Form = z.input<typeof schema>;

export default function AdminServices() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [editing, setEditing] = useState<ServiceRow | 'new' | null>(null);
    const [viewMode, setViewMode] = useViewMode();
    const [search, setSearch] = useState('');
    const q = useQuery({ queryKey: ['catalog', 'services'], queryFn: () => api.get<ServiceRow[]>('/api/catalog/services') });
    const del = useMutation({
        mutationFn: (id: number) => api.send('DELETE', `/api/catalog/services/${id}`),
        onSuccess: (r) => (toast.success(r.message), invalidate(['catalog'], ['site'])),
        onError: (e) => toast.error(e),
    });
    return (
        <div>
            <PageHeader
                title="Services"
                subtitle="What the studio offers. Active services appear on the website and booking form."
            />
            <Card padded={false}>
                <TableHeaderToolbar
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder="Search services..."
                    total={q.data?.length ?? 0}
                    totalLabel="services"
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onAdd={() => setEditing('new')}
                    addLabel="New service"
                />
                <QueryState query={q}>
                    {(rows) => {
                        const filtered = search ? rows.filter(r => (r.name || '').toLowerCase().includes(search.toLowerCase()) || (r.summary || '').toLowerCase().includes(search.toLowerCase())) : rows;
                        return (
                        <DataTable
                            viewMode={viewMode}
                            rows={filtered}
                            rowKey={(r) => r.id}
                            renderCard={(r) => {
                                const theme = COLORFUL_THEMES[Math.abs(r.id) % COLORFUL_THEMES.length];
                                return (
                                    <div className="flex h-full flex-col justify-between p-5">
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm', theme.bg, theme.text)}>
                                                    {r.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-stone-900">{r.name}</h3>
                                                    <p className="text-xs text-stone-500">{r.base_price ? money(r.base_price, true) : 'Free'}</p>
                                                </div>
                                            </div>
                                            {r.summary && <p className="text-xs text-stone-600 line-clamp-2">{r.summary}</p>}
                                        </div>
                                        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
                                            <StatusBadge status={r.is_active ? 'ACTIVE' : 'INACTIVE'} />
                                            <div className="flex items-center gap-1">
                                                <IconButton label="Edit" icon={<Pencil className="size-4" />} onClick={(e) => { e.stopPropagation(); setEditing(r); }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }}

                            onRowClick={setEditing}
                            empty={<EmptyState title="No services yet" action={<Button onClick={() => setEditing('new')}>Add the first service</Button>} />}
                            columns={[
                                {
                                    key: 'name',
                                    header: 'Service',
                                    cell: (r) => (
                                        <div>
                                            <p className="font-medium text-stone-900">{r.name}</p>
                                            {r.summary && <p className="line-clamp-1 text-xs text-stone-500">{r.summary}</p>}
                                        </div>
                                    ),
                                },
                                { key: 'price', header: 'From', cell: (r) => (r.base_price ? money(r.base_price, true) : '—') },
                                { key: 'order', header: 'Order', cell: (r) => r.sort_order, hideOnMobile: true },
                                { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
                                {
                                    key: 'act',
                                    header: '',
                                    cell: (r) => (
                                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                            <IconButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => setEditing(r)} />
                                            <IconButton label="Delete" tone="danger" icon={<Trash2 className="size-4" />} onClick={async () => (await ask({ title: `Delete ${r.name}?`, message: 'It is removed from the website. Existing bookings keep their details.', confirmLabel: 'Delete' })) && del.mutate(r.id)} />
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    )}}
                </QueryState>
            </Card>
            <ServiceModal value={editing} onClose={() => setEditing(null)} />
            {dialog}
        </div>
    );
}

function ServiceModal({ value, onClose }: { value: ServiceRow | 'new' | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<Form, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) });
    useEffect(() => {
        if (!value) return;
        reset(
            value === 'new'
                ? { name: '', summary: '', description: '', basePrice: '0', sortOrder: 0, isActive: true }
                : { name: value.name, summary: value.summary ?? '', description: value.description ?? '', basePrice: toRupees(value.base_price), sortOrder: value.sort_order, isActive: !!value.is_active },
        );
    }, [value, reset]);
    const submit = handleSubmit(async (v) => {
        const body = { ...v, summary: v.summary || null, description: v.description || null, basePrice: toPaise(v.basePrice) };
        try {
            const r = value === 'new' ? await api.send('POST', '/api/catalog/services', body) : await api.send('PUT', `/api/catalog/services/${(value as ServiceRow).id}`, body);
            toast.success(r.message || 'Service saved');
            await invalidate(['catalog'], ['site']);
            onClose();
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });
    return (
        <Modal
            open={!!value}
            onClose={onClose}
            title={value === 'new' ? 'New service' : 'Edit service'}
            size="lg"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={isSubmitting} onClick={submit}>
                        Save
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="space-y-4">
                <FormGrid>
                    <Input label="Name" required {...register('name')} error={errors.name?.message} />
                    <Input label="Starting price" prefix="₹" inputMode="decimal" {...register('basePrice')} error={errors.basePrice?.message} hint="0 hides the price on the website." />
                    <Input label="Short summary" wrapperClassName="sm:col-span-2" {...register('summary')} error={errors.summary?.message} />
                    <Textarea label="Description" rows={5} wrapperClassName="sm:col-span-2" {...register('description')} error={errors.description?.message} />
                    <Input label="Sort order" type="number" min={0} {...register('sortOrder')} error={errors.sortOrder?.message} />
                </FormGrid>
                <Checkbox label="Active" description="Shown on the website and in the booking form." {...register('isActive')} />
            </form>
        </Modal>
    );
}
