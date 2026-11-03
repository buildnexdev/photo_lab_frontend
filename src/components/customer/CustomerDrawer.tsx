// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 25-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { CalendarCheck, Camera, Check, ChevronLeft, ClipboardList, History, IndianRupee, KeyRound, MapPin, NotebookPen, Pencil, Plus, ShoppingBag, Sparkles, Trash2, UserCheck, UserCircle2, UserX } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { api, applyFieldErrors } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useInvalidate } from '../../hooks';
import { digitsOnly10, emailRule, phoneRule } from '../../helpers/validation';
import { date, dateTime, money, titleCase } from '../../utils/format';
import { ORDER_TYPE_LABELS, type OrderType } from '../../types';
import { FormGrid, Input, PasswordInput, Textarea } from '../ui/Form';
import { Drawer, useConfirm } from '../ui/Overlay';
import { StatusBadge } from '../ui/Data';
import { useToast } from '../ui/Toast';
import { Button } from '../ui';
import { Avatar } from '../staff/staffCommon';

export interface CustomerDetail {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    source: string;
    user_id: number | null;
    created_at: string;
    address: string | null;
    state: string | null;
    pincode: string | null;
    notes: string | null;
    photo_url?: string | null;
    bookings: { id: number; booking_no: string; event_type: string; event_date: string; status: string; total_amount: number; paid_amount: number }[];
    events: { id: number; event_code: string; title: string; event_date: string; status: string }[];
    orders: { id: number; order_no: string; type: OrderType; status: string; total: number; created_at: string }[];
    payments: { id: number; payment_no: string; purpose: string; amount: number; status: string; method: string | null; paid_at: string | null; created_at: string }[];
}

const PHOTO_ACCEPT = /^image\/(jpeg|png|webp)$/i;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const schema = z
    .object({
        name: z.string().trim().min(2, 'Enter the name').max(120),
        email: emailRule,
        phone: phoneRule,
        password: z.union([z.literal(''), z.string().min(8, 'At least 8 characters')]),
        confirmPassword: z.string(),
        address: z.string().trim().max(255),
        city: z.string().trim().max(80),
        state: z.string().trim().max(80),
        pincode: z.string().trim().refine((v) => !v || /^\d{6}$/.test(v), 'Enter a 6-digit PIN code'),
        notes: z.string().trim().max(2000),
    })
    .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
type Form = z.infer<typeof schema>;

const blank: Form = { name: '', email: '', phone: '', password: '', confirmPassword: '', address: '', city: '', state: '', pincode: '', notes: '' };
const toForm = (c: CustomerDetail): Form => ({ ...blank, name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', city: c.city ?? '', state: c.state ?? '', pincode: c.pincode ?? '', notes: c.notes ?? '' });

const SECTIONS = [
    { title: 'Account details', hint: 'Name and contact details', icon: ClipboardList, fields: ['name', 'email', 'phone'] },
    { title: 'Address', hint: 'Where they live', icon: MapPin, fields: ['address', 'city', 'state', 'pincode'] },
    { title: 'Password', hint: 'Online account sign-in', icon: KeyRound, fields: ['password', 'confirmPassword'] },
    { title: 'Notes', hint: 'Internal notes for the team', icon: NotebookPen, fields: ['notes'] },
    { title: 'History', hint: 'Bookings, events, orders, payments', icon: History, fields: [] },
] as const;

type HistoryTab = 'bookings' | 'events' | 'orders' | 'payments';

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[var(--soft-shadow)]">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-stone-900">
                {icon}
                {title}
            </h3>
            {children}
        </div>
    );
}

function Stat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: ReactNode; tone: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-white p-3">
            <span className={clsx('flex size-9 shrink-0 items-center justify-center rounded-lg', tone)}>{icon}</span>
            <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</span>
                <span className="block truncate font-semibold text-stone-900">{value}</span>
            </span>
        </div>
    );
}

export function CustomerDrawer({ id, onClose, onCreated }: { id: number | 'new' | null; onClose: () => void; onCreated: (id: number) => void }) {
    const { can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const isNew = id === 'new';
    const editable = can('customers.manage');
    const [step, setStep] = useState(0);
    const [tab, setTab] = useState<HistoryTab>('bookings');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoCleared, setPhotoCleared] = useState(false);
    const detail = useQuery({ queryKey: ['customers', 'detail', id], queryFn: () => api.get<CustomerDetail>(`/api/customers/${id}`), enabled: typeof id === 'number' });
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        setError,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: blank });

    useEffect(() => {
        setStep(0);
        setTab('bookings');
        setPhotoFile(null);
        setPhotoCleared(false);
    }, [id]);
    useEffect(() => {
        if (isNew) reset(blank);
        else if (detail.data) reset(toForm(detail.data));
    }, [isNew, detail.data, reset]);

    const photoPreview = useMemo(() => {
        if (photoFile) return URL.createObjectURL(photoFile);
        if (photoCleared) return null;
        return detail.data?.photo_url ?? null;
    }, [photoFile, photoCleared, detail.data?.photo_url]);
    useEffect(() => () => {
        if (photoFile && photoPreview) URL.revokeObjectURL(photoPreview);
    }, [photoFile, photoPreview]);

    const pickPhoto = (file: File | undefined) => {
        if (!file) return;
        if (!PHOTO_ACCEPT.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
            toast.error('Use a JPG, PNG or WebP image.');
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            toast.error('Photo must be 5 MB or smaller.');
            return;
        }
        setPhotoCleared(false);
        setPhotoFile(file);
    };

    const del = useMutation({
        mutationFn: () => api.send('DELETE', `/api/customers/${id}`),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['customers']);
            onClose();
        },
        onError: (e) => toast.error(e),
    });

    const jumpToError = (errs: FieldErrors<Form>) => {
        const idx = SECTIONS.findIndex((s) => s.fields.some((f) => f in errs));
        if (idx >= 0) setStep(idx);
    };
    const submit = handleSubmit(async (v) => {
        const body = { name: v.name, email: v.email, phone: v.phone, password: v.password || undefined, address: v.address || null, city: v.city || null, state: v.state || null, pincode: v.pincode || null, notes: v.notes || null };
        try {
            const r = isNew ? await api.send<{ id: number }>('POST', '/api/customers', body) : await api.send<{ id: number }>('PUT', `/api/customers/${id}`, body);
            const customerId = r.data.id;
            if (photoFile) {
                const form = new FormData();
                form.append('file', photoFile);
                await api.send('POST', `/api/customers/${customerId}/photo`, form).catch(() => toast.error('Customer saved, but the photo did not upload.'));
            } else if (photoCleared && !isNew) {
                await api.send('DELETE', `/api/customers/${customerId}/photo`).catch(() => undefined);
            }
            toast.success(r.message);
            await invalidate(['customers']);
            if (isNew) onCreated(customerId);
            else {
                setPhotoFile(null);
                setPhotoCleared(false);
                reset({ ...v, password: '', confirmPassword: '' });
                await detail.refetch();
            }
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    }, jumpToError);

    const c = detail.data;
    const section = SECTIONS[step];
    const name = watch('name');
    const hasError = (fields: readonly string[]) => fields.some((f) => f in errors);
    const paid = c?.payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0) ?? 0;

    return (
        <Drawer
            open={id !== null}
            onClose={onClose}
            width="lg:w-[90vw]"
            title={
                <span className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-ink-900 text-accent-400">{isNew ? <Plus className="size-5" /> : <Pencil className="size-4" />}</span>
                    <span className="min-w-0">
                        <span className="block leading-tight">{isNew ? 'Add customer' : (c?.name ?? 'Customer')}</span>
                        {!isNew && <span className="block text-xs font-normal text-stone-500">{editable ? 'Edit customer' : 'Customer details'}</span>}
                    </span>
                </span>
            }
            footer={
                <>
                    <Button variant="secondary" className="mr-auto" onClick={onClose}>
                        {editable ? 'Cancel' : 'Close'}
                    </Button>
                    {step > 0 && (
                        <Button variant="secondary" icon={<ChevronLeft className="size-4" />} onClick={() => setStep(step - 1)}>
                            Back
                        </Button>
                    )}
                    {step < SECTIONS.length - 1 && (
                        <Button variant="dark" onClick={() => setStep(step + 1)}>
                            Next
                        </Button>
                    )}
                    {editable && (
                        <Button loading={isSubmitting} disabled={!isNew && (!c || !isDirty)} onClick={submit}>
                            {isNew ? 'Create customer' : 'Save changes'}
                        </Button>
                    )}
                </>
            }
        >
            {!isNew && detail.isLoading ? (
                <p className="py-8 text-center text-sm text-stone-500">Loading…</p>
            ) : detail.isError ? (
                <p className="py-8 text-center text-sm text-red-600">Could not load this customer.</p>
            ) : (
                <form onSubmit={submit} noValidate className="-mx-5 -my-4 grid min-h-full gap-4 bg-[var(--portal-bg)] p-4 md:grid-cols-[16rem_minmax(0,1fr)]">
                    <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white p-2 shadow-[var(--soft-shadow)] md:sticky md:top-0 md:flex-col md:self-start md:overflow-visible md:p-3">
                        <p className="mb-1 hidden items-center gap-2 px-1 font-semibold text-stone-900 md:flex">
                            <UserCircle2 className="size-5 text-accent-600" />
                            Customer information
                        </p>
                        {SECTIONS.map((s, i) => (
                            <button
                                key={s.title}
                                type="button"
                                onClick={() => setStep(i)}
                                className={clsx(
                                    'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors',
                                    i === step ? 'bg-ink-900 text-accent-300 shadow-sm' : 'text-stone-700 hover:bg-accent-50',
                                    hasError(s.fields) && i !== step && 'ring-2 ring-rose-300',
                                )}
                            >
                                <span className={clsx('flex size-8 shrink-0 items-center justify-center rounded-lg', i === step ? 'bg-white/10' : 'bg-accent-50 text-accent-700')}>
                                    <s.icon className="size-4" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold">{s.title}</span>
                                    <span className={clsx('hidden truncate text-[11px] md:block', i === step ? 'text-accent-200/70' : 'text-stone-500')}>{s.hint}</span>
                                </span>
                            </button>
                        ))}
                        {!isNew && editable && (
                            <button
                                type="button"
                                disabled={del.isPending}
                                onClick={async () => (await ask({ title: 'Delete customer?', message: 'Customers with active bookings cannot be deleted. History is kept for reports.', confirmLabel: 'Delete' })) && del.mutate()}
                                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50 md:mt-3"
                            >
                                <Trash2 className="size-4" />
                                Delete customer
                            </button>
                        )}
                    </nav>

                    <div className="min-w-0 space-y-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[var(--soft-shadow)]">
                        <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                            <section.icon className="size-5 text-accent-600" />
                            {section.title}
                            <span className="ml-auto text-xs font-medium text-stone-500">
                                Step {step + 1} of {SECTIONS.length}
                            </span>
                        </h3>
                        <ol className="flex items-start">
                            {SECTIONS.map((s, i) => (
                                <li key={s.title} className={clsx('flex items-center', i < SECTIONS.length - 1 && 'flex-1')}>
                                    <button
                                        type="button"
                                        onClick={() => setStep(i)}
                                        aria-label={`Step ${i + 1}: ${s.title}`}
                                        title={s.title}
                                        className={clsx('flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors', hasError(s.fields) ? 'bg-rose-500 text-white' : i < step ? 'bg-accent-500 text-ink-900' : i === step ? 'bg-ink-900 text-accent-300 ring-4 ring-accent-200' : 'bg-stone-100 text-stone-500')}
                                    >
                                        {i < step && !hasError(s.fields) ? <Check className="size-3.5" /> : i + 1}
                                    </button>
                                    {i < SECTIONS.length - 1 && <span className={clsx('mx-2 h-0.5 flex-1 rounded-full', i < step ? 'bg-accent-400' : 'bg-stone-200')} />}
                                </li>
                            ))}
                        </ol>

                        <fieldset disabled={!editable} className="min-w-0 space-y-4">
                            {step === 0 && (
                                <>
                                    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4">
                                        <Avatar name={name || 'New customer'} src={photoPreview} className="size-20 rounded-full text-2xl" />
                                        <div className="min-w-0 flex-1">
                                            <p className="flex items-center gap-2 font-semibold text-stone-900">
                                                {name || 'New customer'}
                                                {c &&
                                                    (c.user_id ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                            <UserCheck className="size-3" /> Online account
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                                                            <UserX className="size-3" /> No online account
                                                        </span>
                                                    ))}
                                            </p>
                                            <p className="text-sm text-stone-500">{c ? `${titleCase(c.source)} customer since ${dateTime(c.created_at)}` : 'Upload a photo, or initials are used until one is added.'}</p>
                                            {editable && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                                                        <Camera className="size-3.5" />
                                                        Upload photo
                                                        <input
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                                            className="sr-only"
                                                            onChange={(e) => {
                                                                pickPhoto(e.target.files?.[0]);
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                    {(photoFile || (!photoCleared && c?.photo_url)) && (
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                                            onClick={() => {
                                                                setPhotoFile(null);
                                                                setPhotoCleared(true);
                                                            }}
                                                        >
                                                            <Trash2 className="size-3.5" /> Remove
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {c && (
                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                            <Stat icon={<CalendarCheck className="size-4" />} label="Bookings" value={c.bookings.length} tone="bg-sky-50 text-sky-600" />
                                            <Stat icon={<Sparkles className="size-4" />} label="Events" value={c.events.length} tone="bg-violet-50 text-violet-600" />
                                            <Stat icon={<ShoppingBag className="size-4" />} label="Orders" value={c.orders.length} tone="bg-amber-50 text-amber-600" />
                                            <Stat icon={<IndianRupee className="size-4" />} label="Paid" value={money(paid)} tone="bg-emerald-50 text-emerald-600" />
                                        </div>
                                    )}
                                    <Panel icon={<Pencil className="size-4 text-amber-500" />} title="Personal information">
                                        <FormGrid>
                                            <Input label="Full name" required {...register('name')} error={errors.name?.message} />
                                            <Input label="Email" type="email" required {...register('email')} error={errors.email?.message} hint="Must include @" />
                                            <Input
                                                label="Phone"
                                                type="tel"
                                                inputMode="numeric"
                                                maxLength={10}
                                                required
                                                {...register('phone', {
                                                    onChange: (e) => setValue('phone', digitsOnly10(e.target.value), { shouldValidate: true }),
                                                })}
                                                error={errors.phone?.message}
                                                hint="Exactly 10 digits"
                                            />
                                        </FormGrid>
                                    </Panel>
                                </>
                            )}

                            {step === 1 && (
                                <Panel icon={<MapPin className="size-4 text-emerald-500" />} title="Address">
                                    <FormGrid cols={3}>
                                        <Input label="Street address" wrapperClassName="sm:col-span-3" {...register('address')} error={errors.address?.message} />
                                        <Input label="City" {...register('city')} error={errors.city?.message} />
                                        <Input label="State" {...register('state')} error={errors.state?.message} />
                                        <Input label="PIN code" inputMode="numeric" maxLength={6} {...register('pincode')} error={errors.pincode?.message} />
                                    </FormGrid>
                                </Panel>
                            )}

                            {step === 2 && (
                                <Panel icon={<KeyRound className="size-4 text-sky-500" />} title={isNew || !c?.user_id ? 'Create password' : 'Change password'}>
                                    <p className="mb-3 text-sm text-stone-500">
                                        {isNew || !c?.user_id ? 'Set a password if they should sign in to view galleries and bookings online. Leave blank otherwise.' : 'Leave blank to keep the current password. Setting a new one signs them out everywhere.'}
                                    </p>
                                    <FormGrid>
                                        <PasswordInput label="Password" autoComplete="new-password" {...register('password')} error={errors.password?.message} />
                                        <PasswordInput label="Confirm password" autoComplete="new-password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
                                    </FormGrid>
                                </Panel>
                            )}

                            {step === 3 && (
                                <Panel icon={<NotebookPen className="size-4 text-violet-500" />} title="Internal notes">
                                    <Textarea label="Notes" hint="Only visible to the studio team." rows={6} {...register('notes')} error={errors.notes?.message} />
                                </Panel>
                            )}
                        </fieldset>

                        {step === 4 &&
                            (!c ? (
                                <p className="rounded-2xl border-2 border-dashed border-stone-200 px-4 py-10 text-center text-sm text-stone-500">History appears here once the customer is created.</p>
                            ) : (
                                <HistoryPanel c={c} tab={tab} onTab={setTab} />
                            ))}
                    </div>
                </form>
            )}
            {dialog}
        </Drawer>
    );
}

const HISTORY_TABS: { value: HistoryTab; label: string; icon: typeof CalendarCheck; on: string; chip: string }[] = [
    { value: 'bookings', label: 'Bookings', icon: CalendarCheck, on: 'bg-sky-500 text-white', chip: 'bg-sky-50 text-sky-600' },
    { value: 'events', label: 'Events', icon: Sparkles, on: 'bg-violet-500 text-white', chip: 'bg-violet-50 text-violet-600' },
    { value: 'orders', label: 'Orders', icon: ShoppingBag, on: 'bg-amber-500 text-white', chip: 'bg-amber-50 text-amber-600' },
    { value: 'payments', label: 'Payments', icon: IndianRupee, on: 'bg-emerald-500 text-white', chip: 'bg-emerald-50 text-emerald-600' },
];

function HistoryPanel({ c, tab, onTab }: { c: CustomerDetail; tab: HistoryTab; onTab: (t: HistoryTab) => void }) {
    const active = HISTORY_TABS.find((t) => t.value === tab) ?? HISTORY_TABS[0];
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2" role="tablist">
                {HISTORY_TABS.map((t) => {
                    const count = c[t.value].length;
                    const selected = tab === t.value;
                    return (
                        <button key={t.value} type="button" role="tab" aria-selected={selected} onClick={() => onTab(t.value)} className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors', selected ? t.on : 'bg-stone-100 text-stone-600 hover:bg-stone-200')}>
                            <t.icon className="size-3.5" />
                            {t.label}
                            <span className={clsx('rounded-full px-1.5 text-xs', selected ? 'bg-white/25 text-white' : t.chip)}>{count}</span>
                        </button>
                    );
                })}
            </div>
            {!c[tab].length ? (
                <p className="rounded-2xl border-2 border-dashed border-stone-200 px-4 py-10 text-center text-sm text-stone-500">No {active.label.toLowerCase()} yet</p>
            ) : (
                <ul className="space-y-2">
                    {tab === 'bookings' &&
                        c.bookings.map((b) => (
                            <HistoryCard key={b.id} href={`/admin/bookings?open=${b.id}`} tone={active.chip} icon={<CalendarCheck className="size-4" />} title={b.booking_no} meta={`${b.event_type} · ${date(b.event_date)}`} amount={`Paid ${money(b.paid_amount)} of ${money(b.total_amount)}`} status={b.status} />
                        ))}
                    {tab === 'events' && c.events.map((e) => <HistoryCard key={e.id} href={`/admin/events/${e.id}`} tone={active.chip} icon={<Sparkles className="size-4" />} title={e.title} meta={date(e.event_date)} status={e.status} />)}
                    {tab === 'orders' && c.orders.map((o) => <HistoryCard key={o.id} href={`/admin/orders?open=${o.id}`} tone={active.chip} icon={<ShoppingBag className="size-4" />} title={o.order_no} meta={ORDER_TYPE_LABELS[o.type]} amount={money(o.total)} status={o.status} />)}
                    {tab === 'payments' && c.payments.map((p) => <HistoryCard key={p.id} tone={active.chip} icon={<IndianRupee className="size-4" />} title={p.payment_no} meta={`${titleCase(p.purpose)} · ${date(p.paid_at ?? p.created_at)}`} amount={money(p.amount)} status={p.status} />)}
                </ul>
            )}
        </div>
    );
}

function HistoryCard({ href, tone, icon, title, meta, amount, status }: { href?: string; tone: string; icon: ReactNode; title: string; meta: string; amount?: string; status: string }) {
    const body = (
        <>
            <span className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl', tone)}>{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-stone-900">{title}</span>
                <span className="block truncate text-xs text-stone-500">{meta}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
                {amount && <span className="text-sm font-semibold text-stone-800">{amount}</span>}
                <StatusBadge status={status} />
            </span>
        </>
    );
    const className = 'flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-[var(--soft-shadow)] transition-shadow hover:shadow-[var(--soft-shadow-lg)]';
    return <li>{href ? <Link to={href} className={className}>{body}</Link> : <div className={className}>{body}</div>}</li>;
}
