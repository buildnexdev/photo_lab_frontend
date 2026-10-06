// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DataTable, EmptyState, QueryState, StatusBadge, TableHeaderToolbar, COLORFUL_THEMES } from '../../components/data';
import { Checkbox, FormGrid, Input, Select, Textarea } from '../../components/form';
import { Modal, useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Button, Card, IconButton, PageHeader } from '../../components/ui';
import { api, applyFieldErrors } from '../../lib/api';
import { money, parseJson, toPaise, toRupees } from '../../lib/format';
import { useInvalidate, useViewMode } from '../../lib/hooks';
import { clsx } from 'clsx';
interface PackageRow {
    id: number;
    service_id: number | null;
    service_name: string | null;
    name: string;
    description: string | null;
    price: number;
    advance_percent: number;
    features: string | string[] | null;
    photo_count: number | null;
    includes_digital: number;
    includes_album: number;
    duration_hours: number | null;
    is_featured: number;
    is_active: number;
    sort_order: number;
}

const optionalInt = (max: number) => z.string().trim().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= max), 'Whole number');
const schema = z.object({
    name: z.string().trim().min(2, 'Enter a name').max(120),
    serviceId: z.string(),
    description: z.string().trim().max(5000),
    price: z.string().trim().refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) <= 10_000_000, 'Enter a valid price'),
    advancePercent: z.coerce.number().int('Whole number').min(0, '0–100').max(100, '0–100'),
    features: z
        .string()
        .refine((v) => v.split('\n').filter((l) => l.trim()).length <= 30, 'Up to 30 features')
        .refine((v) => v.split('\n').every((l) => l.trim().length <= 160), 'Each feature 160 characters max'),
    photoCount: optionalInt(100000),
    durationHours: z.string().trim().refine((v) => v === '' || (/^\d+(\.\d)?$/.test(v) && Number(v) <= 240), 'Hours (0–240)'),
    includesDigital: z.boolean(),
    includesAlbum: z.boolean(),
    isFeatured: z.boolean(),
    isActive: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(9999),
});
type Form = z.input<typeof schema>;

export default function AdminPackages() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [editing, setEditing] = useState<PackageRow | 'new' | null>(null);
    const [viewMode, setViewMode] = useViewMode();
    const [search, setSearch] = useState('');
    const q = useQuery({ queryKey: ['catalog', 'packages'], queryFn: () => api.get<PackageRow[]>('/api/catalog/packages') });
    const del = useMutation({
        mutationFn: (id: number) => api.send('DELETE', `/api/catalog/packages/${id}`),
        onSuccess: (r) => (toast.success(r.message), invalidate(['catalog'], ['site'])),
        onError: (e) => toast.error(e),
    });
    return (
        <div>
            <PageHeader
                title="Packages"
                subtitle="Priced bundles customers can book or buy. Prices include GST."
            />
            <Card padded={false}>
                <TableHeaderToolbar
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder="Search packages..."
                    total={q.data?.length ?? 0}
                    totalLabel="packages"
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onAdd={() => setEditing('new')}
                    addLabel="New package"
                />
                <QueryState query={q}>
                    {(rows) => {
                        const filtered = search ? rows.filter(r => (r.name || '').toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase()) || (r.service_name || '').toLowerCase().includes(search.toLowerCase())) : rows;
                        return (
                        <DataTable
                            viewMode={viewMode}
                            rows={filtered}
                            rowKey={(r) => r.id}
                            renderCard={(r) => {
                                const theme = COLORFUL_THEMES[(r.id + 1) % COLORFUL_THEMES.length];
                                return (
                                    <div className="flex h-full flex-col justify-between p-5">
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm', theme.bg, theme.text)}>
                                                    <Star className="size-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-stone-900 flex items-center gap-1.5">{r.name} {r.is_featured ? <Star className="size-3.5 fill-amber-400 text-amber-500" /> : null}</h3>
                                                    <p className="text-xs text-stone-500">{r.service_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-stone-800">{money(r.price, true)}</span>
                                                <span className="text-xs text-stone-500">{r.advance_percent}% adv</span>
                                            </div>
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
                            empty={<EmptyState title="No packages yet" action={<Button onClick={() => setEditing('new')}>Create a package</Button>} />}
                            columns={[
                                {
                                    key: 'name',
                                    header: 'Package',
                                    cell: (r) => (
                                        <div>
                                            <p className="flex items-center gap-1.5 font-medium text-stone-900">
                                                {r.name} {r.is_featured ? <Star className="size-3.5 fill-amber-400 text-amber-400" aria-label="Featured" /> : null}
                                            </p>
                                            <p className="text-xs text-stone-500">{r.service_name ?? 'Any service'}</p>
                                        </div>
                                    ),
                                },
                                { key: 'price', header: 'Price', cell: (r) => money(r.price, true) },
                                { key: 'adv', header: 'Advance', cell: (r) => `${r.advance_percent}%`, hideOnMobile: true },
                                { key: 'inc', header: 'Includes', cell: (r) => [r.photo_count ? `${r.photo_count} photos` : null, r.includes_digital ? 'Digital' : null, r.includes_album ? 'Album' : null].filter(Boolean).join(' · ') || '—', hideOnMobile: true },
                                { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
                                {
                                    key: 'act',
                                    header: '',
                                    cell: (r) => (
                                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                            <IconButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => setEditing(r)} />
                                            <IconButton label="Delete" tone="danger" icon={<Trash2 className="size-4" />} onClick={async () => (await ask({ title: `Delete ${r.name}?`, message: 'It is removed from the website. Existing bookings and orders are not affected.', confirmLabel: 'Delete' })) && del.mutate(r.id)} />
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    )}}
                </QueryState>
            </Card>
            <PackageModal value={editing} onClose={() => setEditing(null)} />
            {dialog}
        </div>
    );
}

function PackageModal({ value, onClose }: { value: PackageRow | 'new' | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const services = useQuery({ queryKey: ['catalog', 'services'], queryFn: () => api.get<{ id: number; name: string }[]>('/api/catalog/services'), enabled: !!value });
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
                ? { name: '', serviceId: '', description: '', price: '', advancePercent: 30, features: '', photoCount: '', durationHours: '', includesDigital: false, includesAlbum: false, isFeatured: false, isActive: true, sortOrder: 0 }
                : {
                      name: value.name,
                      serviceId: value.service_id ? String(value.service_id) : '',
                      description: value.description ?? '',
                      price: toRupees(value.price),
                      advancePercent: value.advance_percent,
                      features: parseJson<string[]>(value.features, []).join('\n'),
                      photoCount: value.photo_count !== null ? String(value.photo_count) : '',
                      durationHours: value.duration_hours !== null ? String(Number(value.duration_hours)) : '',
                      includesDigital: !!value.includes_digital,
                      includesAlbum: !!value.includes_album,
                      isFeatured: !!value.is_featured,
                      isActive: !!value.is_active,
                      sortOrder: value.sort_order,
                  },
        );
    }, [value, reset]);
    const submit = handleSubmit(async (v) => {
        const body = {
            ...v,
            serviceId: v.serviceId ? Number(v.serviceId) : null,
            description: v.description || null,
            price: toPaise(v.price),
            features: v.features
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean),
            photoCount: v.photoCount === '' ? null : Number(v.photoCount),
            durationHours: v.durationHours === '' ? null : Number(v.durationHours),
        };
        try {
            const r = value === 'new' ? await api.send('POST', '/api/catalog/packages', body) : await api.send('PUT', `/api/catalog/packages/${(value as PackageRow).id}`, body);
            toast.success(r.message || 'Package saved');
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
            title={value === 'new' ? 'New package' : 'Edit package'}
            size="xl"
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
                <FormGrid cols={3}>
                    <Input label="Name" required wrapperClassName="sm:col-span-2" {...register('name')} error={errors.name?.message} />
                    <Select label="Service" {...register('serviceId')} placeholder="Any service" options={(services.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />
                    <Input label="Price (incl. GST)" required prefix="₹" inputMode="decimal" {...register('price')} error={errors.price?.message} />
                    <Input label="Advance %" type="number" min={0} max={100} {...register('advancePercent')} error={errors.advancePercent?.message} />
                    <Input label="Sort order" type="number" min={0} {...register('sortOrder')} error={errors.sortOrder?.message} />
                    <Input label="Edited photos" inputMode="numeric" {...register('photoCount')} error={errors.photoCount?.message} />
                    <Input label="Coverage hours" inputMode="decimal" {...register('durationHours')} error={errors.durationHours?.message} />
                </FormGrid>
                <Textarea label="Description" rows={3} {...register('description')} error={errors.description?.message} />
                <Textarea label="Features" rows={5} {...register('features')} error={errors.features?.message} hint="One per line. Shown as a checklist on the website." />
                <div className="grid gap-3 rounded-lg border border-stone-200 p-4 sm:grid-cols-2">
                    <Checkbox label="Includes digital delivery" description="Unlocks HD downloads for the linked event." {...register('includesDigital')} />
                    <Checkbox label="Includes printed album" {...register('includesAlbum')} />
                    <Checkbox label="Featured" description="Highlighted on the website." {...register('isFeatured')} />
                    <Checkbox label="Active" {...register('isActive')} />
                </div>
            </form>
        </Modal>
    );
}
