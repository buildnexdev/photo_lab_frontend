import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Copy, Download, QrCode } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { QueryState } from '../../components/ui/Data';
import { FormGrid, Input, Select } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import { Button, ButtonLink, Card, PageHeader } from '../../components/ui';
import { api, applyFieldErrors, downloadAuthed, type Paged } from '../../services/api';
import { localInputToUtc, titleCase } from '../../utils/format';
import { useInvalidate } from '../../hooks';

interface GalleryOption {
    id: number;
    title: string;
    event_code: string;
    customer_name: string;
    status: string;
}

interface GalleryAlbums {
    expires_at: string | null;
    albums: { id: number; name: string }[];
}

const schema = z
    .object({
        galleryId: z.string().min(1, 'Choose a gallery'),
        scope: z.enum(['EVENT', 'ALBUM', 'PHOTO']),
        albumId: z.string(),
        photoId: z.string(),
        label: z.string().trim().max(80),
        expiresAt: z.string(),
        maxUses: z.string().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1_000_000), 'Whole number from 1'),
    })
    .refine((v) => v.scope !== 'ALBUM' || v.albumId, { path: ['albumId'], message: 'Choose an album' })
    .refine((v) => v.scope !== 'PHOTO' || /^\d+$/.test(v.photoId), { path: ['photoId'], message: 'Enter the photo ID' })
    .refine((v) => !v.expiresAt || new Date(`${v.expiresAt}:00+05:30`) > new Date(), { path: ['expiresAt'], message: 'Must be in the future' });

type FormValues = z.infer<typeof schema>;

interface CreatedQr {
    id: number;
    url: string;
    qr: string;
    title: string;
    galleryId: number;
}

export default function QrCreate() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [created, setCreated] = useState<CreatedQr | null>(null);
    const galleries = useQuery({
        queryKey: ['galleries', 'qr-picker'],
        queryFn: () => api.get<Paged<GalleryOption>>('/api/galleries', { page: 1, pageSize: 100 }),
    });
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { galleryId: '', scope: 'EVENT', albumId: '', photoId: '', label: '', expiresAt: '', maxUses: '' } });
    const galleryId = watch('galleryId');
    const scope = watch('scope');
    const detail = useQuery({
        queryKey: ['galleries', 'qr-albums', galleryId],
        queryFn: () => api.get<GalleryAlbums>(`/api/galleries/${galleryId}`),
        enabled: !!galleryId && scope === 'ALBUM',
    });

    const submit = handleSubmit(async (v) => {
        try {
            const r = await api.send<{ id: number; url: string; qr: string }>('POST', `/api/galleries/${v.galleryId}/qr`, {
                scope: v.scope,
                albumId: v.scope === 'ALBUM' ? Number(v.albumId) : null,
                photoId: v.scope === 'PHOTO' ? Number(v.photoId) : null,
                label: v.label || null,
                expiresAt: v.expiresAt ? localInputToUtc(v.expiresAt) : null,
                maxUses: v.maxUses ? Number(v.maxUses) : null,
            });
            toast.success(r.message);
            await invalidate(['qr-codes', 'galleries']);
            setCreated({ id: r.data.id, url: r.data.url, qr: r.data.qr, title: v.label || `${titleCase(v.scope)} QR`, galleryId: Number(v.galleryId) });
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });

    return (
        <div>
            <PageHeader
                title="Create QR"
                back={
                    <Link to="/admin/qr" className="text-sm font-medium text-stone-600 hover:text-stone-900">
                        ← Manage QR
                    </Link>
                }
            />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                <Card title="New QR code">
                    <QueryState query={galleries} isEmpty={(d) => !d.items.length} empty={<p className="text-sm text-stone-500">A gallery is created with every event. Add an event first, then come back to create a QR code.</p>}>
                        {(d) => (
                            <form onSubmit={submit} noValidate className="space-y-4">
                                <Select
                                    label="Gallery"
                                    required
                                    {...register('galleryId')}
                                    placeholder="Choose a gallery…"
                                    error={errors.galleryId?.message}
                                    options={d.items.map((g) => ({ value: g.id, label: `${g.title} · ${g.event_code} · ${g.customer_name}` }))}
                                />
                                <Select
                                    label="Opens"
                                    {...register('scope')}
                                    options={[
                                        { value: 'EVENT', label: 'The whole gallery' },
                                        { value: 'ALBUM', label: 'One album' },
                                        { value: 'PHOTO', label: 'A single photo' },
                                    ]}
                                />
                                {scope === 'ALBUM' && (
                                    <Select
                                        label="Album"
                                        required
                                        {...register('albumId')}
                                        placeholder={detail.isLoading ? 'Loading albums…' : 'Choose…'}
                                        options={(detail.data?.albums ?? []).map((a) => ({ value: a.id, label: a.name }))}
                                        error={errors.albumId?.message}
                                        hint={!detail.isLoading && detail.data && !detail.data.albums.length ? 'This gallery has no albums yet.' : undefined}
                                    />
                                )}
                                {scope === 'PHOTO' && <Input label="Photo ID" required inputMode="numeric" {...register('photoId')} error={errors.photoId?.message} hint="Shown on each photo in the Photos page." />}
                                <Input label="Label" {...register('label')} error={errors.label?.message} placeholder="e.g. Table cards" />
                                <FormGrid>
                                    <Input
                                        label="Expires"
                                        type="datetime-local"
                                        {...register('expiresAt')}
                                        error={errors.expiresAt?.message}
                                        hint="Blank uses the gallery expiry, or never if the gallery does not expire."
                                    />
                                    <Input label="Max scans" inputMode="numeric" {...register('maxUses')} error={errors.maxUses?.message} hint="Blank = unlimited" />
                                </FormGrid>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Button type="submit" loading={isSubmitting} icon={<QrCode className="size-4" />}>
                                        Generate QR
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            reset();
                                            setCreated(null);
                                        }}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            </form>
                        )}
                    </QueryState>
                </Card>
                <Card title="Preview">
                    {created ? (
                        <div className="text-center">
                            <img src={created.qr} alt={created.title} className="mx-auto w-64 max-w-full rounded-lg border border-stone-200" />
                            <p className="mt-3 font-medium text-stone-900">{created.title}</p>
                            <p className="mt-1 break-all text-xs text-stone-500">{created.url}</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <Button variant="secondary" size="sm" icon={<Copy className="size-4" />} onClick={() => navigator.clipboard.writeText(created.url).then(() => toast.success('Link copied'), () => toast.error('Could not copy the link'))}>
                                    Copy link
                                </Button>
                                <Button size="sm" icon={<Download className="size-4" />} onClick={() => downloadAuthed(`/api/galleries/${created.galleryId}/qr/${created.id}/png`, `gallery-${created.galleryId}-qr-${created.id}.png`).catch((e) => toast.error(e))}>
                                    Download PNG
                                </Button>
                            </div>
                            <ButtonLink to="/admin/qr" variant="ghost" size="sm" className="mt-3">
                                View in Manage QR
                            </ButtonLink>
                        </div>
                    ) : (
                        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 px-6 text-center">
                            <QrCode className="size-10 text-stone-300" />
                            <p className="mt-3 text-sm font-medium text-stone-700">The code appears here</p>
                            <p className="mt-1 text-xs text-stone-500">Choose a gallery, then generate. Guests who scan it can open that gallery until it expires or you revoke it.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
