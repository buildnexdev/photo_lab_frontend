// Developer by: Buildnexdev.in
// Last Edited : 22-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState, QueryState, StatusBadge } from '../../components/ui/Data';
import { Checkbox, FormGrid, Input, Select, Textarea } from '../../components/ui/Form';
import { Modal, useConfirm } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toast';
import { Button, Card, IconButton, PageHeader } from '../../components/ui';
import { api, applyFieldErrors } from '../../services/api';
import { money, parseJson, toPaise, toRupees } from '../../utils/format';
import { useInvalidate } from '../../hooks';
import './Services.scss';

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

interface PackageRow {
    id: number;
    service_id: number | null;
    name: string;
    description: string | null;
    price: number;
    advance_percent: number;
    features: string | string[] | null;
    photo_count: number | null;
    includes_digital: number;
    includes_album: number;
    duration_hours: number | string | null;
    is_featured: number;
    is_active: number;
    sort_order: number;
}

const amount = z.string().trim().refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 10_000_000, 'Enter a valid amount');
const optionalInt = (max: number) => z.string().trim().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= max), 'Whole number');

const serviceSchema = z.object({
    name: z.string().trim().min(2, 'Enter a name').max(120),
    summary: z.string().trim().max(255),
    description: z.string().trim().max(5000),
    icon: z.string().trim().max(60),
    basePrice: amount,
    sortOrder: z.coerce.number().int().min(0).max(9999),
    isActive: z.boolean(),
});
type ServiceForm = z.input<typeof serviceSchema>;

const packageSchema = z.object({
    name: z.string().trim().min(2, 'Enter a name').max(120),
    serviceId: z.string().min(1, 'Choose a service'),
    description: z.string().trim().max(5000),
    price: z.string().trim().refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) <= 10_000_000, 'Enter a valid price'),
    advancePercent: z.coerce.number().int('Whole number').min(0, '0–100').max(100, '0–100'),
    features: z
        .string()
        .refine((v) => v.split('\n').filter((l) => l.trim()).length <= 30, 'Up to 30 features')
        .refine((v) => v.split('\n').every((l) => l.trim().length <= 160), 'Each feature is 160 characters max'),
    photoCount: optionalInt(100000),
    durationHours: z.string().trim().refine((v) => v === '' || (/^\d+(\.\d)?$/.test(v) && Number(v) <= 240), 'Hours (0–240)'),
    includesDigital: z.boolean(),
    includesAlbum: z.boolean(),
    isFeatured: z.boolean(),
    isActive: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(9999),
});
type PackageForm = z.input<typeof packageSchema>;

const emptyService = (): ServiceForm => ({ name: '', summary: '', description: '', icon: '', basePrice: '0', sortOrder: 0, isActive: true });
const emptyPackage = (serviceId = ''): PackageForm => ({
    name: '',
    serviceId,
    description: '',
    price: '',
    advancePercent: 30,
    features: '',
    photoCount: '',
    durationHours: '',
    includesDigital: false,
    includesAlbum: false,
    isFeatured: false,
    isActive: true,
    sortOrder: 0,
});

export default function CustomerServices() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<ServiceRow | 'new' | null>(null);
    const [packageEdit, setPackageEdit] = useState<PackageRow | { serviceId: number } | null>(null);
    const services = useQuery({ queryKey: ['catalog', 'services'], queryFn: () => api.get<ServiceRow[]>('/api/catalog/services') });
    const packages = useQuery({ queryKey: ['catalog', 'packages'], queryFn: () => api.get<PackageRow[]>('/api/catalog/packages') });
    const removeService = useMutation({
        mutationFn: (id: number) => api.send('DELETE', `/api/catalog/services/${id}`),
        onSuccess: (r) => (toast.success(r.message || 'Service deleted'), invalidate(['catalog'], ['site'])),
        onError: (e) => toast.error(e),
    });
    const removePackage = useMutation({
        mutationFn: (id: number) => api.send('DELETE', `/api/catalog/packages/${id}`),
        onSuccess: (r) => (toast.success(r.message || 'Package deleted'), invalidate(['catalog'], ['site'])),
        onError: (e) => toast.error(e),
    });

    return (
        <div>
            <PageHeader title="Services" subtitle="Add, update, and delete services and the packages under each one." actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>New service</Button>} />
            <div className="mb-4 max-w-sm">
                <Input aria-label="Search services" placeholder="Search services" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <QueryState
                query={services}
                isEmpty={(rows) => rows.length === 0}
                empty={<EmptyState title="No services yet" description="Add a service, then add the packages customers can book." action={<Button onClick={() => setEditing('new')}>Add the first service</Button>} />}
            >
                {(rows) => {
                    const q = search.trim().toLowerCase();
                    const filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q) || (r.summary ?? '').toLowerCase().includes(q)) : rows;
                    if (!filtered.length) return <EmptyState title="No matching services" description="Try a different name." />;
                    return (
                        <div className="space-y-4">
                            {filtered.map((service) => {
                                const options = (packages.data ?? []).filter((p) => p.service_id === service.id);
                                return (
                                    <Card
                                        key={service.id}
                                        title={
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="font-semibold text-stone-900">{service.name}</h2>
                                                    <StatusBadge status={service.is_active ? 'ACTIVE' : 'INACTIVE'} />
                                                </div>
                                                <p className="mt-0.5 text-xs font-normal text-stone-500">{service.base_price ? `From ${money(service.base_price, true)}` : 'Price hidden'}{service.icon ? ` · ${service.icon}` : ''}</p>
                                            </div>
                                        }
                                        actions={
                                            <>
                                                <IconButton label="Edit service" icon={<Pencil className="size-4" />} onClick={() => setEditing(service)} />
                                                <IconButton
                                                    label="Delete service"
                                                    tone="danger"
                                                    icon={<Trash2 className="size-4" />}
                                                    onClick={async () => (await ask({ title: `Delete ${service.name}?`, message: 'It is removed from the website and the booking form. Existing bookings keep their details.', confirmLabel: 'Delete' })) && removeService.mutate(service.id)}
                                                />
                                            </>
                                        }
                                    >
                                        {(service.summary || service.description) && <p className="mb-4 max-w-3xl whitespace-pre-wrap text-sm text-stone-600">{service.summary || service.description}</p>}
                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                            <h3 className="text-sm font-semibold text-stone-800">Packages</h3>
                                            <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setPackageEdit({ serviceId: service.id })}>
                                                Add package
                                            </Button>
                                        </div>
                                        {options.length === 0 ? (
                                            <p className="text-sm text-stone-500">No packages yet. Add one so customers can choose a price and what is included.</p>
                                        ) : (
                                            <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
                                                {options.map((pkg) => (
                                                    <li key={pkg.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-stone-900">
                                                                {pkg.name} <span className="font-normal text-stone-500">{money(pkg.price, true)}</span>
                                                            </p>
                                                            <p className="text-xs text-stone-500">
                                                                {[
                                                                    `${pkg.advance_percent}% advance`,
                                                                    pkg.duration_hours ? `${Number(pkg.duration_hours)} hours` : null,
                                                                    pkg.photo_count ? `${pkg.photo_count} photos` : null,
                                                                    pkg.includes_digital ? 'Digital files' : null,
                                                                    pkg.includes_album ? 'Album' : null,
                                                                    pkg.is_featured ? 'Featured' : null,
                                                                    pkg.is_active ? 'Active' : 'Inactive',
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(' · ')}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <IconButton label="Edit package" icon={<Pencil className="size-4" />} onClick={() => setPackageEdit(pkg)} />
                                                            <IconButton
                                                                label="Delete package"
                                                                tone="danger"
                                                                icon={<Trash2 className="size-4" />}
                                                                onClick={async () => (await ask({ title: `Delete ${pkg.name}?`, message: 'It is removed from the website. Existing bookings are not changed.', confirmLabel: 'Delete' })) && removePackage.mutate(pkg.id)}
                                                            />
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    );
                }}
            </QueryState>
            <ServiceModal value={editing} onClose={() => setEditing(null)} />
            <PackageModal value={packageEdit} services={services.data ?? []} onClose={() => setPackageEdit(null)} />
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
    } = useForm<ServiceForm, unknown, z.output<typeof serviceSchema>>({ resolver: zodResolver(serviceSchema) });
    useEffect(() => {
        if (!value) return;
        reset(
            value === 'new'
                ? emptyService()
                : { name: value.name, summary: value.summary ?? '', description: value.description ?? '', icon: value.icon ?? '', basePrice: toRupees(value.base_price), sortOrder: value.sort_order, isActive: !!value.is_active },
        );
    }, [value, reset]);
    const submit = handleSubmit(async (v) => {
        const body = { ...v, summary: v.summary || null, description: v.description || null, icon: v.icon || null, basePrice: toPaise(v.basePrice) };
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
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button loading={isSubmitting} onClick={submit}>Save</Button>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="space-y-4">
                <FormGrid>
                    <Input label="Name" required {...register('name')} error={errors.name?.message} />
                    <Input label="Starting price" prefix="₹" inputMode="decimal" {...register('basePrice')} error={errors.basePrice?.message} hint="0 hides the price." />
                    <Input label="Short summary" wrapperClassName="sm:col-span-2" {...register('summary')} error={errors.summary?.message} />
                    <Textarea label="Description" rows={4} wrapperClassName="sm:col-span-2" {...register('description')} error={errors.description?.message} />
                    <Input label="Icon name" {...register('icon')} error={errors.icon?.message} hint="Optional label, such as camera or heart." />
                    <Input label="Sort order" type="number" min={0} {...register('sortOrder')} error={errors.sortOrder?.message} />
                </FormGrid>
                <Checkbox label="Active" description="Shown on the website and in the booking form." {...register('isActive')} />
            </form>
        </Modal>
    );
}

function PackageModal({ value, services, onClose }: { value: PackageRow | { serviceId: number } | null; services: ServiceRow[]; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const editing = value && 'id' in value ? value : null;
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<PackageForm, unknown, z.output<typeof packageSchema>>({ resolver: zodResolver(packageSchema) });
    useEffect(() => {
        if (!value) return;
        reset(
            editing
                ? {
                      name: editing.name,
                      serviceId: editing.service_id ? String(editing.service_id) : '',
                      description: editing.description ?? '',
                      price: toRupees(editing.price),
                      advancePercent: editing.advance_percent,
                      features: parseJson<string[]>(editing.features, []).join('\n'),
                      photoCount: editing.photo_count !== null ? String(editing.photo_count) : '',
                      durationHours: editing.duration_hours !== null && editing.duration_hours !== undefined ? String(Number(editing.duration_hours)) : '',
                      includesDigital: !!editing.includes_digital,
                      includesAlbum: !!editing.includes_album,
                      isFeatured: !!editing.is_featured,
                      isActive: !!editing.is_active,
                      sortOrder: editing.sort_order,
                  }
                : emptyPackage('serviceId' in value ? String(value.serviceId) : ''),
        );
    }, [value, editing, reset]);
    const submit = handleSubmit(async (v) => {
        const body = {
            ...v,
            serviceId: Number(v.serviceId),
            description: v.description || null,
            price: toPaise(v.price),
            features: v.features.split('\n').map((line) => line.trim()).filter(Boolean),
            photoCount: v.photoCount === '' ? null : Number(v.photoCount),
            durationHours: v.durationHours === '' ? null : Number(v.durationHours),
        };
        try {
            const r = editing ? await api.send('PUT', `/api/catalog/packages/${editing.id}`, body) : await api.send('POST', '/api/catalog/packages', body);
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
            title={editing ? 'Edit package' : 'New package'}
            size="xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button loading={isSubmitting} onClick={submit}>Save</Button>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="space-y-4">
                <FormGrid cols={3}>
                    <Input label="Name" required wrapperClassName="sm:col-span-2" {...register('name')} error={errors.name?.message} />
                    <Select label="Service" required {...register('serviceId')} error={errors.serviceId?.message} placeholder="Choose a service" options={services.map((s) => ({ value: s.id, label: s.name }))} />
                    <Input label="Price (incl. GST)" required prefix="₹" inputMode="decimal" {...register('price')} error={errors.price?.message} />
                    <Input label="Advance %" type="number" min={0} max={100} {...register('advancePercent')} error={errors.advancePercent?.message} />
                    <Input label="Sort order" type="number" min={0} {...register('sortOrder')} error={errors.sortOrder?.message} />
                    <Input label="Edited photos" inputMode="numeric" {...register('photoCount')} error={errors.photoCount?.message} />
                    <Input label="Coverage hours" inputMode="decimal" {...register('durationHours')} error={errors.durationHours?.message} />
                </FormGrid>
                <Textarea label="Description" rows={3} {...register('description')} error={errors.description?.message} />
                <Textarea label="Features" rows={5} {...register('features')} error={errors.features?.message} hint="One per line. Shown as a checklist." />
                <div className="grid gap-3 rounded-lg border border-stone-200 p-4 sm:grid-cols-2">
                    <Checkbox label="Includes digital delivery" {...register('includesDigital')} />
                    <Checkbox label="Includes printed album" {...register('includesAlbum')} />
                    <Checkbox label="Featured" {...register('isFeatured')} />
                    <Checkbox label="Active" description="Inactive packages stay hidden from booking." {...register('isActive')} />
                </div>
            </form>
        </Modal>
    );
}
