// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import { QueryState } from '../../components/data';
import { Checkbox, FormGrid, Input, Textarea } from '../../components/form';
import { useToast } from '../../components/toast';
import { Alert, Button, Card, IconButton, PageHeader, Tabs } from '../../components/ui';
import { api, applyFieldErrors } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { toPaise, toRupees } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';
import { optionalPhone } from '../../lib/validation';

interface Settings {
    studio: Record<'name' | 'tagline' | 'email' | 'phone' | 'whatsapp' | 'address' | 'city' | 'mapUrl' | 'hours' | 'about' | 'gstin' | 'instagram' | 'facebook' | 'youtube', string>;
    pricing: { photoDownload: number; taxPercent: number; prints: Record<string, number>; frames: Record<string, number>; canvas: Record<string, number>; album: number; courierFee: number };
    gallery: { watermarkText: string; defaultExpiryDays: number; previewSize: number; thumbSize: number };
    notifications: { email: boolean; whatsapp: boolean; sms: boolean };
    ai: { faceSearch: boolean; culling: boolean; blurThreshold: number };
}
type Tab = 'studio' | 'pricing' | 'gallery' | 'notifications' | 'ai';

export default function AdminSettings() {
    const { can } = useAuth();
    const [params, setParams] = useSearchParams();
    const full = can('settings.manage');
    const tabs: { value: Tab; label: string }[] = full
        ? [
              { value: 'studio', label: 'Studio' },
              { value: 'pricing', label: 'Pricing' },
              { value: 'gallery', label: 'Gallery' },
              { value: 'notifications', label: 'Notifications' },
              { value: 'ai', label: 'AI' },
          ]
        : [{ value: 'pricing', label: 'Pricing' }];
    const tab = (tabs.find((t) => t.value === params.get('tab'))?.value ?? tabs[0].value) as Tab;
    const q = useQuery({ queryKey: ['settings'], queryFn: () => api.get<Settings>('/api/settings') });
    return (
        <div>
            <PageHeader title="Settings" subtitle="Studio profile, pricing and platform behaviour. Secrets such as payment and storage keys are set in the server environment, never here." />
            <Tabs className="mb-6" value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} tabs={tabs} />
            <QueryState query={q}>
                {(s) => (
                    <>
                        {tab === 'studio' && <StudioForm value={s.studio} />}
                        {tab === 'pricing' && <PricingForm value={s.pricing} />}
                        {tab === 'gallery' && <GalleryForm value={s.gallery} />}
                        {tab === 'notifications' && <NotificationsForm value={s.notifications} />}
                        {tab === 'ai' && <AiForm value={s.ai} />}
                    </>
                )}
            </QueryState>
        </div>
    );
}

function useSave<K extends keyof Settings>(key: K) {
    const toast = useToast();
    const invalidate = useInvalidate();
    return async (value: Settings[K], setError?: (name: never, e: { type: string; message: string }) => void) => {
        try {
            const r = await api.send('PUT', `/api/settings/${key}`, value);
            toast.success(r.message);
            await invalidate(['settings'], ['site']);
            return true;
        } catch (e) {
            if (!setError || !applyFieldErrors(e, setError)) toast.error(e);
            return false;
        }
    };
}

const url = z.string().trim().max(500).refine((v) => !v || /^https?:\/\/\S+$/.test(v), 'Enter a full link starting with https://');
const studioSchema = z.object({
    name: z.string().trim().min(2, 'Enter the studio name').max(120),
    tagline: z.string().trim().max(200),
    email: z.string().trim().max(190).refine((v) => !v || z.string().email().safeParse(v).success, 'Enter a valid email'),
    phone: optionalPhone,
    whatsapp: optionalPhone,
    address: z.string().trim().max(255),
    city: z.string().trim().max(80),
    mapUrl: url,
    hours: z.string().trim().max(120),
    about: z.string().trim().max(3000),
    gstin: z.string().trim().toUpperCase().refine((v) => !v || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), 'Enter a valid 15-character GSTIN'),
    instagram: url,
    facebook: url,
    youtube: url,
});

function StudioForm({ value }: { value: Settings['studio'] }) {
    const save = useSave('studio');
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting, isDirty },
        reset,
    } = useForm<Settings['studio']>({ resolver: zodResolver(studioSchema), defaultValues: value });
    useEffect(() => reset(value), [value, reset]);
    const submit = handleSubmit((v) => save(v, setError as never));
    return (
        <Card>
            <form onSubmit={submit} noValidate className="space-y-4">
                <FormGrid>
                    <Input label="Studio name" required {...register('name')} error={errors.name?.message} />
                    <Input label="Tagline" {...register('tagline')} error={errors.tagline?.message} />
                    <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
                    <Input label="Phone" type="tel" {...register('phone')} error={errors.phone?.message} />
                    <Input label="WhatsApp" type="tel" {...register('whatsapp')} error={errors.whatsapp?.message} />
                    <Input label="Opening hours" {...register('hours')} error={errors.hours?.message} />
                    <Input label="Address" wrapperClassName="sm:col-span-2" {...register('address')} error={errors.address?.message} />
                    <Input label="City" {...register('city')} error={errors.city?.message} />
                    <Input label="GSTIN" {...register('gstin')} error={errors.gstin?.message} hint="Printed on invoices." />
                    <Input label="Google Maps link" wrapperClassName="sm:col-span-2" {...register('mapUrl')} error={errors.mapUrl?.message} />
                    <Textarea label="About the studio" rows={5} wrapperClassName="sm:col-span-2" {...register('about')} error={errors.about?.message} />
                    <Input label="Instagram" {...register('instagram')} error={errors.instagram?.message} />
                    <Input label="Facebook" {...register('facebook')} error={errors.facebook?.message} />
                    <Input label="YouTube" {...register('youtube')} error={errors.youtube?.message} />
                </FormGrid>
                <div className="flex justify-end">
                    <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                        Save studio details
                    </Button>
                </div>
            </form>
        </Card>
    );
}

type SizeRow = { size: string; price: string };
const toRows = (m: Record<string, number>): SizeRow[] => Object.entries(m).map(([size, price]) => ({ size, price: toRupees(price) }));
const AMOUNT = /^\d+(\.\d{1,2})?$/;

function SizeTable({ title, rows, onChange, errors }: { title: string; rows: SizeRow[]; onChange: (r: SizeRow[]) => void; errors: Record<number, string> }) {
    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{title}</h3>
                <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => onChange([...rows, { size: '', price: '' }])} disabled={rows.length >= 20}>
                    Add size
                </Button>
            </div>
            {rows.length === 0 && <p className="text-sm text-stone-500">Not offered.</p>}
            <div className="space-y-2">
                {rows.map((r, i) => (
                    <div key={i}>
                        <div className="flex items-center gap-2">
                            <Input aria-label="Size" wrapperClassName="w-32" placeholder="8x10" value={r.size} maxLength={20} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))} />
                            <Input aria-label="Price" wrapperClassName="flex-1" prefix="₹" inputMode="decimal" value={r.price} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                            <IconButton label="Remove size" tone="danger" icon={<Trash2 className="size-4" />} onClick={() => onChange(rows.filter((_, j) => j !== i))} />
                        </div>
                        {errors[i] && <p className="mt-1 text-xs text-red-600">{errors[i]}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function PricingForm({ value }: { value: Settings['pricing'] }) {
    const save = useSave('pricing');
    const [form, setForm] = useState({ photoDownload: '', taxPercent: '', album: '', courierFee: '' });
    const [prints, setPrints] = useState<SizeRow[]>([]);
    const [frames, setFrames] = useState<SizeRow[]>([]);
    const [canvas, setCanvas] = useState<SizeRow[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [tableErrors, setTableErrors] = useState<Record<string, Record<number, string>>>({});
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        setForm({ photoDownload: toRupees(value.photoDownload), taxPercent: String(value.taxPercent), album: toRupees(value.album), courierFee: toRupees(value.courierFee) });
        setPrints(toRows(value.prints));
        setFrames(toRows(value.frames));
        setCanvas(toRows(value.canvas));
    }, [value]);
    const checkTable = (rows: SizeRow[]) => {
        const errs: Record<number, string> = {};
        const seen = new Set<string>();
        rows.forEach((r, i) => {
            const size = r.size.trim();
            if (!size) errs[i] = 'Enter a size';
            else if (seen.has(size.toLowerCase())) errs[i] = 'Duplicate size';
            else if (!AMOUNT.test(r.price.trim())) errs[i] = 'Enter a valid price';
            seen.add(size.toLowerCase());
        });
        return errs;
    };
    const submit = async () => {
        const e: Record<string, string> = {};
        for (const k of ['photoDownload', 'album', 'courierFee'] as const) if (!AMOUNT.test(form[k].trim())) e[k] = 'Enter a valid amount';
        if (!/^\d+(\.\d{1,2})?$/.test(form.taxPercent) || Number(form.taxPercent) > 40) e.taxPercent = '0 to 40';
        const te = { prints: checkTable(prints), frames: checkTable(frames), canvas: checkTable(canvas) };
        setErrors(e);
        setTableErrors(te);
        if (Object.keys(e).length || Object.values(te).some((x) => Object.keys(x).length)) return;
        const toMap = (rows: SizeRow[]) => Object.fromEntries(rows.map((r) => [r.size.trim(), toPaise(r.price)]));
        setSaving(true);
        await save({ photoDownload: toPaise(form.photoDownload), taxPercent: Number(form.taxPercent), album: toPaise(form.album), courierFee: toPaise(form.courierFee), prints: toMap(prints), frames: toMap(frames), canvas: toMap(canvas) });
        setSaving(false);
    };
    const set = (k: keyof typeof form) => (ev: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: ev.target.value }));
    return (
        <Card>
            <div className="space-y-6">
                <Alert>Prices include GST. Invoices show the GST portion using the rate below. Changes apply to new orders only.</Alert>
                <FormGrid cols={3}>
                    <Input label="HD photo download" prefix="₹" inputMode="decimal" value={form.photoDownload} onChange={set('photoDownload')} error={errors.photoDownload} hint="Default per photo; galleries can override." />
                    <Input label="Printed album" prefix="₹" inputMode="decimal" value={form.album} onChange={set('album')} error={errors.album} />
                    <Input label="Courier fee" prefix="₹" inputMode="decimal" value={form.courierFee} onChange={set('courierFee')} error={errors.courierFee} />
                    <Input label="GST %" inputMode="decimal" value={form.taxPercent} onChange={set('taxPercent')} error={errors.taxPercent} />
                </FormGrid>
                <div className="grid gap-6 lg:grid-cols-3">
                    <SizeTable title="Prints" rows={prints} onChange={setPrints} errors={tableErrors.prints ?? {}} />
                    <SizeTable title="Frames" rows={frames} onChange={setFrames} errors={tableErrors.frames ?? {}} />
                    <SizeTable title="Canvas" rows={canvas} onChange={setCanvas} errors={tableErrors.canvas ?? {}} />
                </div>
                <div className="flex justify-end">
                    <Button loading={saving} onClick={submit}>
                        Save pricing
                    </Button>
                </div>
            </div>
        </Card>
    );
}

const gallerySchema = z.object({
    watermarkText: z.string().trim().min(1, 'Enter watermark text').max(60),
    defaultExpiryDays: z.coerce.number().int('Whole days').min(1, 'At least 1 day').max(3650, 'At most 3650 days'),
    previewSize: z.coerce.number().int().min(600, '600–3000 px').max(3000, '600–3000 px'),
    thumbSize: z.coerce.number().int().min(200, '200–1000 px').max(1000, '200–1000 px'),
});

function GalleryForm({ value }: { value: Settings['gallery'] }) {
    const save = useSave('gallery');
    const {
        register,
        handleSubmit,
        setError,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<z.input<typeof gallerySchema>, unknown, Settings['gallery']>({ resolver: zodResolver(gallerySchema), defaultValues: value });
    useEffect(() => reset(value), [value, reset]);
    const submit = handleSubmit((v) => save(v, setError as never));
    return (
        <Card>
            <form onSubmit={submit} noValidate className="space-y-4">
                <FormGrid>
                    <Input label="Watermark text" required {...register('watermarkText')} error={errors.watermarkText?.message} hint="Applied to previews. Regenerate a gallery's previews after changing it." />
                    <Input label="Default gallery expiry (days)" type="number" min={1} {...register('defaultExpiryDays')} error={errors.defaultExpiryDays?.message} />
                    <Input label="Preview size (longest edge, px)" type="number" {...register('previewSize')} error={errors.previewSize?.message} />
                    <Input label="Thumbnail size (px)" type="number" {...register('thumbSize')} error={errors.thumbSize?.message} />
                </FormGrid>
                <div className="flex justify-end">
                    <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                        Save gallery settings
                    </Button>
                </div>
            </form>
        </Card>
    );
}

function NotificationsForm({ value }: { value: Settings['notifications'] }) {
    const save = useSave('notifications');
    const [v, setV] = useState(value);
    const [saving, setSaving] = useState(false);
    useEffect(() => setV(value), [value]);
    return (
        <Card>
            <div className="space-y-4">
                <p className="text-sm text-stone-600">In-app notifications are always on. Choose which extra channels the studio sends through. Each channel also needs its provider credentials in the server environment.</p>
                <Checkbox label="Email" description="Booking confirmations, payment receipts, gallery and order updates." checked={v.email} onChange={(e) => setV({ ...v, email: e.target.checked })} />
                <Checkbox label="WhatsApp" description="Short updates to the customer's WhatsApp number." checked={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.checked })} />
                <Checkbox label="SMS" description="OTP codes and critical updates." checked={v.sms} onChange={(e) => setV({ ...v, sms: e.target.checked })} />
                <div className="flex justify-end">
                    <Button loading={saving} onClick={async () => (setSaving(true), await save(v), setSaving(false))}>
                        Save notification settings
                    </Button>
                </div>
            </div>
        </Card>
    );
}

function AiForm({ value }: { value: Settings['ai'] }) {
    const save = useSave('ai');
    const toast = useToast();
    const status = useQuery({ queryKey: ['ai', 'status'], queryFn: () => api.get<{ faceProvider: string; faceSearchAvailable: boolean }>('/api/ai/status') });
    const [v, setV] = useState({ ...value, blurThreshold: String(value.blurThreshold) });
    useEffect(() => setV({ ...value, blurThreshold: String(value.blurThreshold) }), [value]);
    const m = useMutation({
        mutationFn: () => save({ faceSearch: v.faceSearch, culling: v.culling, blurThreshold: Number(v.blurThreshold) }),
    });
    const thresholdError = !/^\d+(\.\d+)?$/.test(v.blurThreshold) || Number(v.blurThreshold) < 1 || Number(v.blurThreshold) > 500 ? 'Between 1 and 500' : '';
    return (
        <Card>
            <div className="space-y-4">
                {status.data && !status.data.faceSearchAvailable && <Alert tone="warning">Face search needs a face recognition provider configured on the server (currently “{status.data.faceProvider}”). Until then the face search option has no effect.</Alert>}
                <Checkbox label="Automatic culling" description="Flags blurry photos and near duplicates after upload." checked={v.culling} onChange={(e) => setV({ ...v, culling: e.target.checked })} />
                <Checkbox label="Selfie face search for guests" description="Guests upload a selfie to find their photos. Selfies are used once for matching and not stored." checked={v.faceSearch} onChange={(e) => setV({ ...v, faceSearch: e.target.checked })} />
                <Input label="Blur threshold" wrapperClassName="max-w-xs" inputMode="decimal" value={v.blurThreshold} onChange={(e) => setV({ ...v, blurThreshold: e.target.value })} error={thresholdError || undefined} hint="Photos with a sharpness score below this are flagged. Higher = stricter." />
                <div className="flex justify-end">
                    <Button loading={m.isPending} onClick={() => (thresholdError ? toast.error(thresholdError) : m.mutate())}>
                        Save AI settings
                    </Button>
                </div>
            </div>
        </Card>
    );
}
