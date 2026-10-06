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
import { Checkbox, FormGrid, Input, Select } from '../../components/form';
import { Modal, useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Button, Card, IconButton, PageHeader } from '../../components/ui';
import { api, applyFieldErrors } from '../../lib/api';
import { dateTime, localInputToUtc, money, toLocalInput, toPaise, toRupees } from '../../lib/format';
import { useInvalidate, useViewMode } from '../../lib/hooks';
import { clsx } from 'clsx';
import { Tag } from 'lucide-react';

interface CouponRow {
    id: number;
    code: string;
    description: string | null;
    type: 'PERCENT' | 'FLAT';
    value: number;
    min_amount: number;
    max_discount: number | null;
    applies_to: 'ALL' | 'ORDER' | 'BOOKING';
    starts_at: string | null;
    ends_at: string | null;
    usage_limit: number | null;
    used_count: number;
    is_active: number;
}

const rupees = (required: boolean) => z.string().trim().refine((v) => (v === '' ? !required : /^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 10_000_000), 'Enter a valid amount');
const schema = z
    .object({
        code: z.string().trim().min(3, 'At least 3 characters').max(40).regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only'),
        description: z.string().trim().max(255),
        type: z.enum(['PERCENT', 'FLAT']),
        value: z.string().trim(),
        minAmount: rupees(false),
        maxDiscount: rupees(false),
        appliesTo: z.enum(['ALL', 'ORDER', 'BOOKING']),
        startsAt: z.string(),
        endsAt: z.string(),
        usageLimit: z.string().trim().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) > 0), 'Whole number above 0'),
        isActive: z.boolean(),
    })
    .superRefine((v, ctx) => {
        if (v.type === 'PERCENT' && !(/^\d+$/.test(v.value) && Number(v.value) >= 1 && Number(v.value) <= 100)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Whole percent from 1 to 100' });
        if (v.type === 'FLAT' && !(/^\d+(\.\d{1,2})?$/.test(v.value) && Number(v.value) > 0)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Enter an amount' });
        if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Must be after the start' });
    });
type Form = z.infer<typeof schema>;

const describe = (c: CouponRow) => (c.type === 'PERCENT' ? `${c.value}% off${c.max_discount ? ` (max ${money(c.max_discount, true)})` : ''}` : `${money(c.value, true)} off`);

function couponState(c: CouponRow) {
    const now = Date.now();
    if (!c.is_active) return 'INACTIVE';
    if (c.ends_at && new Date(c.ends_at).getTime() < now) return 'EXPIRED';
    if (c.starts_at && new Date(c.starts_at).getTime() > now) return 'SCHEDULED';
    if (c.usage_limit !== null && c.used_count >= c.usage_limit) return 'EXHAUSTED';
    return 'ACTIVE';
}

export default function AdminCoupons() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [editing, setEditing] = useState<CouponRow | 'new' | null>(null);
    const [viewMode, setViewMode] = useViewMode();
    const [search, setSearch] = useState('');
    const q = useQuery({ queryKey: ['catalog', 'coupons'], queryFn: () => api.get<CouponRow[]>('/api/catalog/coupons') });
    const del = useMutation({
        mutationFn: (id: number) => api.send('DELETE', `/api/catalog/coupons/${id}`),
        onSuccess: (r) => (toast.success(r.message), invalidate(['catalog', 'coupons'])),
        onError: (e) => toast.error(e),
    });
    return (
        <div>
            <PageHeader
                title="Coupons"
                subtitle="Discount codes for bookings and orders."
            />
            <Card padded={false}>
                <TableHeaderToolbar
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder="Search coupons..."
                    total={q.data?.length ?? 0}
                    totalLabel="coupons"
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onAdd={() => setEditing('new')}
                    addLabel="New coupon"
                />
                <QueryState query={q}>
                    {(rows) => {
                        const filtered = search ? rows.filter(r => (r.code || '').toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase())) : rows;
                        return (
                        <DataTable
                            viewMode={viewMode}
                            rows={filtered}
                            rowKey={(r) => r.id}
                            renderCard={(r) => {
                                const theme = COLORFUL_THEMES[(r.id + 2) % COLORFUL_THEMES.length];
                                return (
                                    <div className="flex h-full flex-col justify-between p-5">
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm', theme.bg, theme.text)}>
                                                    <Tag className="size-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-stone-900 tracking-wide uppercase">{r.code}</h3>
                                                    <p className="text-xs text-stone-500">{describe(r)}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-stone-600 mb-2">Used {r.used_count} times</p>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-4">
                                            <StatusBadge status={couponState(r)} />
                                            <div className="flex items-center gap-1">
                                                <IconButton label="Edit" icon={<Pencil className="size-4" />} onClick={(e) => { e.stopPropagation(); setEditing(r); }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }}

                            onRowClick={setEditing}
                            empty={<EmptyState title="No coupons yet" />}
                            columns={[
                                {
                                    key: 'code',
                                    header: 'Code',
                                    cell: (r) => (
                                        <div>
                                            <p className="font-mono font-semibold text-stone-900">{r.code}</p>
                                            {r.description && <p className="line-clamp-1 text-xs text-stone-500">{r.description}</p>}
                                        </div>
                                    ),
                                },
                                { key: 'disc', header: 'Discount', cell: describe },
                                { key: 'for', header: 'For', cell: (r) => (r.applies_to === 'ALL' ? 'Bookings & orders' : r.applies_to === 'ORDER' ? 'Orders' : 'Bookings'), hideOnMobile: true },
                                { key: 'used', header: 'Used', cell: (r) => `${r.used_count}${r.usage_limit ? ` / ${r.usage_limit}` : ''}`, hideOnMobile: true },
                                { key: 'ends', header: 'Ends', cell: (r) => (r.ends_at ? dateTime(r.ends_at) : 'No end'), hideOnMobile: true },
                                { key: 'state', header: 'Status', cell: (r) => <StatusBadge status={couponState(r)} /> },
                                {
                                    key: 'act',
                                    header: '',
                                    cell: (r) => (
                                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                            <IconButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => setEditing(r)} />
                                            <IconButton label="Delete" tone="danger" icon={<Trash2 className="size-4" />} onClick={async () => (await ask({ title: `Delete ${r.code}?`, message: 'Customers can no longer use this code.', confirmLabel: 'Delete' })) && del.mutate(r.id)} />
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    )}}
                </QueryState>
            </Card>
            <CouponModal value={editing} onClose={() => setEditing(null)} />
            {dialog}
        </div>
    );
}

function CouponModal({ value, onClose }: { value: CouponRow | 'new' | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<Form>({ resolver: zodResolver(schema) });
    useEffect(() => {
        if (!value) return;
        reset(
            value === 'new'
                ? { code: '', description: '', type: 'PERCENT', value: '', minAmount: '', maxDiscount: '', appliesTo: 'ALL', startsAt: '', endsAt: '', usageLimit: '', isActive: true }
                : {
                      code: value.code,
                      description: value.description ?? '',
                      type: value.type,
                      value: value.type === 'PERCENT' ? String(value.value) : toRupees(value.value),
                      minAmount: value.min_amount ? toRupees(value.min_amount) : '',
                      maxDiscount: value.max_discount !== null ? toRupees(value.max_discount) : '',
                      appliesTo: value.applies_to,
                      startsAt: toLocalInput(value.starts_at),
                      endsAt: toLocalInput(value.ends_at),
                      usageLimit: value.usage_limit !== null ? String(value.usage_limit) : '',
                      isActive: !!value.is_active,
                  },
        );
    }, [value, reset]);
    const type = watch('type');
    const submit = handleSubmit(async (v) => {
        const body = {
            code: v.code.toUpperCase(),
            description: v.description || null,
            type: v.type,
            value: v.type === 'PERCENT' ? Number(v.value) : toPaise(v.value),
            minAmount: v.minAmount ? toPaise(v.minAmount) : 0,
            maxDiscount: v.type === 'PERCENT' && v.maxDiscount ? toPaise(v.maxDiscount) : null,
            appliesTo: v.appliesTo,
            startsAt: v.startsAt ? localInputToUtc(v.startsAt) : null,
            endsAt: v.endsAt ? localInputToUtc(v.endsAt) : null,
            usageLimit: v.usageLimit ? Number(v.usageLimit) : null,
            isActive: v.isActive,
        };
        try {
            const r = value === 'new' ? await api.send('POST', '/api/catalog/coupons', body) : await api.send('PUT', `/api/catalog/coupons/${(value as CouponRow).id}`, body);
            toast.success(r.message || 'Coupon saved');
            await invalidate(['catalog', 'coupons']);
            onClose();
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });
    return (
        <Modal
            open={!!value}
            onClose={onClose}
            title={value === 'new' ? 'New coupon' : 'Edit coupon'}
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
                    <Input label="Code" required className="font-mono uppercase" {...register('code')} error={errors.code?.message} />
                    <Select
                        label="Valid for"
                        {...register('appliesTo')}
                        options={[
                            { value: 'ALL', label: 'Bookings and orders' },
                            { value: 'BOOKING', label: 'Bookings (quotations)' },
                            { value: 'ORDER', label: 'Orders (photos, prints, albums)' },
                        ]}
                    />
                    <Input label="Description" wrapperClassName="sm:col-span-2" {...register('description')} error={errors.description?.message} />
                    <Select
                        label="Type"
                        {...register('type')}
                        options={[
                            { value: 'PERCENT', label: 'Percentage' },
                            { value: 'FLAT', label: 'Flat amount' },
                        ]}
                    />
                    <Input label={type === 'PERCENT' ? 'Percent off' : 'Amount off'} required prefix={type === 'FLAT' ? '₹' : undefined} inputMode="decimal" {...register('value')} error={errors.value?.message} />
                    <Input label="Minimum spend" prefix="₹" inputMode="decimal" {...register('minAmount')} error={errors.minAmount?.message} />
                    {type === 'PERCENT' && <Input label="Maximum discount" prefix="₹" inputMode="decimal" {...register('maxDiscount')} error={errors.maxDiscount?.message} hint="Blank = no cap" />}
                    <Input label="Starts" type="datetime-local" {...register('startsAt')} error={errors.startsAt?.message} />
                    <Input label="Ends" type="datetime-local" {...register('endsAt')} error={errors.endsAt?.message} />
                    <Input label="Usage limit" inputMode="numeric" {...register('usageLimit')} error={errors.usageLimit?.message} hint="Blank = unlimited" />
                </FormGrid>
                <Checkbox label="Active" {...register('isActive')} />
            </form>
        </Modal>
    );
}
