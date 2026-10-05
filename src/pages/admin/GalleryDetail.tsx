import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Ban, Copy, Download, Eye, Images, Pencil, Plus, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { z } from 'zod';
import { DataTable, EmptyState, QueryState, StatCard, StatusBadge } from '../../components/data';
import { Checkbox, FormGrid, Input, Select, Textarea } from '../../components/form';
import { Modal, useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Button, Card, IconButton, PageHeader } from '../../components/ui';
import { api, applyFieldErrors, downloadAuthed, type Paged } from '../../lib/api';
import { date, dateTime, localInputToUtc, num, relative, titleCase, toLocalInput, toPaise, toRupees } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';
import { GALLERY_STATUSES, type GalleryStatus } from '../../lib/types';

interface Album {
    id: number;
    name: string;
    description: string | null;
    sort_order: number;
    photo_count: number;
}
interface Token {
    id: number;
    scope: 'EVENT' | 'ALBUM' | 'PHOTO';
    album_id: number | null;
    album_name: string | null;
    photo_id: number | null;
    label: string | null;
    token_hint: string;
    expires_at: string | null;
    revoked_at: string | null;
    max_uses: number | null;
    use_count: number;
    last_used_at: string | null;
    created_at: string;
    state: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'EXHAUSTED';
    url: string | null;
}
interface GalleryAdmin {
    id: number;
    event_id: number;
    title: string;
    description: string | null;
    status: GalleryStatus;
    watermark_enabled: number;
    allow_download: number;
    auto_publish: number;
    photo_price: number | null;
    expires_at: string | null;
    cover_photo_id: number | null;
    event_title: string;
    event_status: string;
    event_date: string;
    albums: Album[];
    tokens: Token[];
    stats: { total: number; published: number | null; processing: number | null; rejected: number | null };
    recentAccess: { id: number; result: string; ip: string | null; user_agent: string | null; created_at: string; user_name: string | null; token_label: string | null; scope: string | null }[];
}
interface QrResult {
    url: string;
    qr: string;
    title: string;
    tokenId: number;
}

export default function AdminGalleryDetail() {
    const id = Number(useParams().id);
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [editing, setEditing] = useState(false);
    const [album, setAlbum] = useState<Album | 'new' | null>(null);
    const [generating, setGenerating] = useState(false);
    const [shown, setShown] = useState<QrResult | null>(null);
    const [coverPicking, setCoverPicking] = useState(false);
    const q = useQuery({ queryKey: ['galleries', 'detail', id], queryFn: () => api.get<GalleryAdmin>(`/api/galleries/${id}`), enabled: id > 0 });
    const refresh = () => invalidate(['galleries']);

    const post = useMutation({
        mutationFn: ({ path, method = 'POST' }: { path: string; method?: 'POST' | 'DELETE' }) => api.send<{ id?: number; url?: string; qr?: string }>(method, `/api/galleries/${id}${path}`),
        onSuccess: (r, v) => {
            toast.success(r.message);
            refresh();
            if (v.path.endsWith('/regenerate') && r.data.url && r.data.qr && r.data.id) setShown({ url: r.data.url, qr: r.data.qr, title: 'New QR code', tokenId: r.data.id });
        },
        onError: (e) => toast.error(e),
    });
    const viewQr = useMutation({
        mutationFn: (t: Token) => api.get<{ url: string; qr: string }>(`/api/galleries/${id}/qr/${t.id}`).then((r) => ({ ...r, title: t.label || `${titleCase(t.scope)} QR`, tokenId: t.id })),
        onSuccess: setShown,
        onError: (e) => toast.error(e),
    });

    return (
        <div>
            <QueryState query={q}>
                {(g) => (
                    <>
                        <PageHeader
                            back={
                                <Link to="/admin/galleries" className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
                                    <ArrowLeft className="size-4" /> Galleries
                                </Link>
                            }
                            title={
                                <span className="flex items-center gap-3">
                                    {g.title} <StatusBadge status={g.status} />
                                </span>
                            }
                            subtitle={
                                <>
                                    <Link to={`/admin/events/${g.event_id}`} className="link">
                                        {g.event_title}
                                    </Link>{' '}
                                    · {date(g.event_date)}
                                </>
                            }
                            actions={
                                <>
                                    <Link to={`/admin/photos?galleryId=${g.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50">
                                        <Images className="size-4" /> Photos
                                    </Link>
                                    <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                                        Settings
                                    </Button>
                                </>
                            }
                        />
                        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                            <StatCard label="Photos" value={num(g.stats.total)} />
                            <StatCard label="Published" value={num(g.stats.published ?? 0)} tone="emerald" />
                            <StatCard label="Processing" value={num(g.stats.processing ?? 0)} tone="sky" />
                            <StatCard label="Rejected" value={num(g.stats.rejected ?? 0)} tone="rose" />
                        </div>
                        <div className="grid gap-6 xl:grid-cols-3">
                            <div className="space-y-6 xl:col-span-2">
                                <Card
                                    title="QR codes"
                                    padded={false}
                                    actions={
                                        <>
                                            {g.tokens.some((t) => t.state === 'ACTIVE') && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    icon={<Ban className="size-4" />}
                                                    onClick={async () => (await ask({ title: 'Revoke every QR code?', message: 'Anyone using an existing QR code or link will lose access immediately.', confirmLabel: 'Revoke all' })) && post.mutate({ path: '/qr/revoke-all' })}
                                                >
                                                    Revoke all
                                                </Button>
                                            )}
                                            <Button size="sm" icon={<QrCode className="size-4" />} onClick={() => setGenerating(true)}>
                                                Generate QR
                                            </Button>
                                        </>
                                    }
                                >
                                    <DataTable
                                        rows={g.tokens}
                                        rowKey={(t) => t.id}
                                        empty={<EmptyState title="No QR codes yet" description="Generate a QR code to share this gallery with guests." />}
                                        columns={[
                                            {
                                                key: 'label',
                                                header: 'Code',
                                                cell: (t) => (
                                                    <div>
                                                        <p className="font-medium">{t.label || `${titleCase(t.scope)} QR`}</p>
                                                        <p className="text-xs text-stone-500">
                                                            {t.scope === 'ALBUM' ? `Album: ${t.album_name ?? t.album_id}` : t.scope === 'PHOTO' ? `Photo #${t.photo_id}` : 'Whole gallery'} · {t.token_hint}…
                                                        </p>
                                                    </div>
                                                ),
                                            },
                                            { key: 'uses', header: 'Uses', cell: (t) => `${num(t.use_count)}${t.max_uses ? ` / ${num(t.max_uses)}` : ''}`, hideOnMobile: true },
                                            { key: 'exp', header: 'Expires', cell: (t) => (t.expires_at ? dateTime(t.expires_at) : 'Never'), hideOnMobile: true },
                                            { key: 'last', header: 'Last used', cell: (t) => (t.last_used_at ? relative(t.last_used_at) : '—'), hideOnMobile: true },
                                            { key: 'state', header: 'State', cell: (t) => <StatusBadge status={t.state} /> },
                                            {
                                                key: 'act',
                                                header: '',
                                                cell: (t) => (
                                                    <div className="flex justify-end gap-1">
                                                        {t.state === 'ACTIVE' && (
                                                            <>
                                                                <IconButton label="Show QR" onClick={() => viewQr.mutate(t)} icon={<Eye className="size-4" />} />
                                                                <IconButton label="Download PNG" onClick={() => downloadAuthed(`/api/galleries/${id}/qr/${t.id}/png`, `gallery-${id}-qr-${t.id}.png`).catch((e) => toast.error(e))} icon={<Download className="size-4" />} />
                                                                <IconButton label="Revoke" tone="danger" onClick={async () => (await ask({ title: 'Revoke this QR code?', message: 'People using it will lose access.', confirmLabel: 'Revoke' })) && post.mutate({ path: `/qr/${t.id}/revoke` })} icon={<Ban className="size-4" />} />
                                                            </>
                                                        )}
                                                        <IconButton label="Regenerate" onClick={async () => (await ask({ title: 'Regenerate QR code?', message: 'A new code is issued with the same settings. The old code stops working.', confirmLabel: 'Regenerate', tone: 'primary' })) && post.mutate({ path: `/qr/${t.id}/regenerate` })} icon={<RefreshCw className="size-4" />} />
                                                    </div>
                                                ),
                                            },
                                        ]}
                                    />
                                </Card>
                                <Card title="Recent access" padded={false}>
                                    <DataTable
                                        rows={g.recentAccess}
                                        rowKey={(r) => r.id}
                                        empty={<EmptyState title="No one has opened this gallery yet" />}
                                        columns={[
                                            { key: 'when', header: 'When', cell: (r) => relative(r.created_at) },
                                            { key: 'who', header: 'Who', cell: (r) => r.user_name ?? 'Guest' },
                                            { key: 'via', header: 'Via', cell: (r) => r.token_label ?? (r.scope ? `${titleCase(r.scope)} QR` : 'Account'), hideOnMobile: true },
                                            { key: 'ip', header: 'IP', cell: (r) => r.ip ?? '—', hideOnMobile: true },
                                            { key: 'res', header: 'Result', cell: (r) => <StatusBadge status={r.result} /> },
                                        ]}
                                    />
                                </Card>
                            </div>
                            <div className="space-y-6">
                                <Card title="Settings">
                                    <dl className="space-y-2 text-sm">
                                        {(
                                            [
                                                ['Watermark on previews', g.watermark_enabled ? 'On' : 'Off'],
                                                ['HD downloads', g.allow_download ? 'Allowed (paid or included)' : 'Blocked'],
                                                ['Auto-publish uploads', g.auto_publish ? 'Yes' : 'No — review first'],
                                                ['Photo price', g.photo_price !== null ? `₹${toRupees(g.photo_price)}` : 'Studio default'],
                                                ['Expires', g.expires_at ? dateTime(g.expires_at) : 'Never'],
                                            ] as const
                                        ).map(([k, v]) => (
                                            <div key={k} className="flex justify-between gap-3">
                                                <dt className="text-stone-500">{k}</dt>
                                                <dd className="text-right font-medium">{v}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                    {g.description && <p className="mt-4 text-sm text-stone-600">{g.description}</p>}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => setCoverPicking(true)}>
                                            {g.cover_photo_id ? 'Change cover' : 'Choose cover'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            icon={<RefreshCw className="size-4" />}
                                            onClick={async () => (await ask({ title: 'Regenerate previews?', message: 'All previews and thumbnails are rebuilt with the current watermark settings. This may take a few minutes.', confirmLabel: 'Regenerate', tone: 'primary' })) && post.mutate({ path: '/reprocess' })}
                                        >
                                            Regenerate previews
                                        </Button>
                                    </div>
                                </Card>
                                <Card
                                    title="Albums"
                                    padded={false}
                                    actions={
                                        <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setAlbum('new')}>
                                            Add
                                        </Button>
                                    }
                                >
                                    {g.albums.length ? (
                                        <ul className="divide-y divide-stone-100">
                                            {g.albums.map((a) => (
                                                <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">{a.name}</p>
                                                        <p className="text-xs text-stone-500">{num(a.photo_count)} photos</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <IconButton label="Edit album" onClick={() => setAlbum(a)} icon={<Pencil className="size-4" />} />
                                                        <IconButton
                                                            label="Delete album"
                                                            tone="danger"
                                                            onClick={async () => (await ask({ title: `Delete “${a.name}”?`, message: 'Photos move to the main gallery and album QR codes are revoked.', confirmLabel: 'Delete' })) && post.mutate({ path: `/albums/${a.id}`, method: 'DELETE' })}
                                                            icon={<Trash2 className="size-4" />}
                                                        />
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <EmptyState title="No albums" description="Albums group photos (e.g. Haldi, Ceremony) and can have their own QR code." />
                                    )}
                                </Card>
                            </div>
                        </div>
                        <GallerySettingsModal gallery={editing ? g : null} onClose={() => setEditing(false)} />
                        <AlbumModal galleryId={id} album={album} onClose={() => setAlbum(null)} />
                        <GenerateQrModal open={generating} gallery={g} onClose={() => setGenerating(false)} onCreated={(r) => (setGenerating(false), setShown(r))} />
                        <CoverPicker open={coverPicking} galleryId={id} current={g.cover_photo_id} onClose={() => setCoverPicking(false)} />
                    </>
                )}
            </QueryState>
            <QrModal galleryId={id} value={shown} onClose={() => setShown(null)} />
            {dialog}
        </div>
    );
}

function QrModal({ galleryId, value, onClose }: { galleryId: number; value: QrResult | null; onClose: () => void }) {
    const toast = useToast();
    return (
        <Modal
            open={!!value}
            onClose={onClose}
            title={value?.title ?? 'QR code'}
            size="sm"
            footer={
                value && (
                    <>
                        <Button variant="secondary" icon={<Copy className="size-4" />} onClick={() => navigator.clipboard.writeText(value.url).then(() => toast.success('Link copied'), () => toast.error('Could not copy the link'))}>
                            Copy link
                        </Button>
                        <Button icon={<Download className="size-4" />} onClick={() => downloadAuthed(`/api/galleries/${galleryId}/qr/${value.tokenId}/png`, `gallery-${galleryId}-qr-${value.tokenId}.png`).catch((e) => toast.error(e))}>
                            Download PNG
                        </Button>
                    </>
                )
            }
        >
            {value && (
                <div className="text-center">
                    <img src={value.qr} alt="Gallery QR code" className="mx-auto w-64 max-w-full rounded-lg border border-stone-200" />
                    <p className="mt-3 break-all text-xs text-stone-500">{value.url}</p>
                    <p className="mt-2 text-xs text-stone-500">Anyone with this code can view the gallery until it expires or is revoked.</p>
                </div>
            )}
        </Modal>
    );
}

const settingsSchema = z.object({
    title: z.string().trim().min(2, 'Enter a title').max(160),
    description: z.string().trim().max(2000),
    status: z.enum(GALLERY_STATUSES),
    watermarkEnabled: z.boolean(),
    allowDownload: z.boolean(),
    autoPublish: z.boolean(),
    photoPrice: z.string().refine((v) => v === '' || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 100000), 'Enter a valid amount'),
    expiresAt: z.string(),
});
type SettingsForm = z.infer<typeof settingsSchema>;

function GallerySettingsModal({ gallery, onClose }: { gallery: GalleryAdmin | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<SettingsForm>({ resolver: zodResolver(settingsSchema) });
    useEffect(() => {
        if (gallery)
            reset({
                title: gallery.title,
                description: gallery.description ?? '',
                status: gallery.status,
                watermarkEnabled: !!gallery.watermark_enabled,
                allowDownload: !!gallery.allow_download,
                autoPublish: !!gallery.auto_publish,
                photoPrice: gallery.photo_price !== null ? toRupees(gallery.photo_price) : '',
                expiresAt: toLocalInput(gallery.expires_at),
            });
    }, [gallery, reset]);
    const submit = handleSubmit(async (v) => {
        if (v.expiresAt && new Date(`${v.expiresAt}:00+05:30`) < new Date() && v.status !== 'ARCHIVED') return setError('expiresAt', { message: 'Expiry is in the past — guests would lose access' });
        try {
            const r = await api.send('PUT', `/api/galleries/${gallery!.id}`, {
                ...v,
                description: v.description || null,
                photoPrice: v.photoPrice === '' ? null : toPaise(v.photoPrice),
                expiresAt: v.expiresAt ? localInputToUtc(v.expiresAt) : null,
            });
            toast.success(r.message);
            await invalidate(['galleries'], ['events', 'detail', gallery!.event_id]);
            onClose();
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });
    return (
        <Modal
            open={!!gallery}
            onClose={onClose}
            title="Gallery settings"
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
                    <Input label="Title" required wrapperClassName="sm:col-span-2" {...register('title')} error={errors.title?.message} />
                    <Textarea label="Description" rows={2} wrapperClassName="sm:col-span-2" {...register('description')} error={errors.description?.message} />
                    <Select
                        label="Visibility"
                        {...register('status')}
                        options={[
                            { value: 'DRAFT', label: 'Draft — hidden from customers' },
                            { value: 'LIVE', label: 'Live — photos appear as they upload' },
                            { value: 'PUBLISHED', label: 'Published — final gallery' },
                            { value: 'ARCHIVED', label: 'Archived — no access' },
                        ]}
                        error={errors.status?.message}
                    />
                    <Input label="Price per HD photo" prefix="₹" inputMode="decimal" {...register('photoPrice')} error={errors.photoPrice?.message} hint="Leave blank to use the studio default." />
                    <Input label="Access expires" type="datetime-local" {...register('expiresAt')} error={errors.expiresAt?.message} hint="Studio time. Blank = never. New QR codes inherit this." />
                </FormGrid>
                <div className="space-y-3 rounded-lg border border-stone-200 p-4">
                    <Checkbox label="Watermark previews" description="Changing this regenerates every preview." {...register('watermarkEnabled')} />
                    <Checkbox label="Allow HD downloads" description="Customers download originals after purchase or when their package includes digital delivery." {...register('allowDownload')} />
                    <Checkbox label="Auto-publish new uploads" description="Otherwise photos stay hidden until you publish them." {...register('autoPublish')} />
                </div>
                <p className="text-xs text-stone-500">Watermarks, disabled right-click and short-lived signed links discourage copying, but no website can fully prevent screenshots.</p>
            </form>
        </Modal>
    );
}

const albumSchema = z.object({ name: z.string().trim().min(1, 'Enter a name').max(120), description: z.string().trim().max(500), sortOrder: z.coerce.number().int().min(0).max(9999) });
type AlbumForm = z.input<typeof albumSchema>;

function AlbumModal({ galleryId, album, onClose }: { galleryId: number; album: Album | 'new' | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<AlbumForm, unknown, z.output<typeof albumSchema>>({ resolver: zodResolver(albumSchema) });
    useEffect(() => {
        if (album) reset(album === 'new' ? { name: '', description: '', sortOrder: 0 } : { name: album.name, description: album.description ?? '', sortOrder: album.sort_order });
    }, [album, reset]);
    const submit = handleSubmit(async (v) => {
        try {
            const body = { ...v, description: v.description || null };
            const r = album === 'new' ? await api.send('POST', `/api/galleries/${galleryId}/albums`, body) : await api.send('PUT', `/api/galleries/${galleryId}/albums/${(album as Album).id}`, body);
            toast.success(r.message);
            await invalidate(['galleries']);
            onClose();
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });
    return (
        <Modal
            open={!!album}
            onClose={onClose}
            title={album === 'new' ? 'New album' : 'Edit album'}
            size="sm"
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
                <Input label="Name" required {...register('name')} error={errors.name?.message} placeholder="e.g. Ceremony" />
                <Textarea label="Description" rows={2} {...register('description')} error={errors.description?.message} />
                <Input label="Sort order" type="number" min={0} {...register('sortOrder')} error={errors.sortOrder?.message} hint="Lower numbers appear first." />
            </form>
        </Modal>
    );
}

const qrSchema = z
    .object({
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
type QrForm = z.infer<typeof qrSchema>;

function GenerateQrModal({ open, gallery, onClose, onCreated }: { open: boolean; gallery: GalleryAdmin; onClose: () => void; onCreated: (r: QrResult) => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<QrForm>({ resolver: zodResolver(qrSchema) });
    useEffect(() => {
        if (open) reset({ scope: 'EVENT', albumId: '', photoId: '', label: '', expiresAt: '', maxUses: '' });
    }, [open, reset]);
    const scope = watch('scope');
    const submit = handleSubmit(async (v) => {
        try {
            const r = await api.send<{ id: number; url: string; qr: string }>('POST', `/api/galleries/${gallery.id}/qr`, {
                scope: v.scope,
                albumId: v.scope === 'ALBUM' ? Number(v.albumId) : null,
                photoId: v.scope === 'PHOTO' ? Number(v.photoId) : null,
                label: v.label || null,
                expiresAt: v.expiresAt ? localInputToUtc(v.expiresAt) : null,
                maxUses: v.maxUses ? Number(v.maxUses) : null,
            });
            toast.success(r.message);
            await invalidate(['galleries']);
            onCreated({ url: r.data.url, qr: r.data.qr, tokenId: r.data.id, title: v.label || 'New QR code' });
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Generate QR code"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={isSubmitting} onClick={submit}>
                        Generate
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="space-y-4">
                <Select
                    label="Opens"
                    {...register('scope')}
                    options={[
                        { value: 'EVENT', label: 'The whole gallery' },
                        { value: 'ALBUM', label: 'One album', disabled: !gallery.albums.length },
                        { value: 'PHOTO', label: 'A single photo' },
                    ]}
                />
                {scope === 'ALBUM' && <Select label="Album" required {...register('albumId')} placeholder="Choose…" options={gallery.albums.map((a) => ({ value: a.id, label: a.name }))} error={errors.albumId?.message} />}
                {scope === 'PHOTO' && <Input label="Photo ID" required inputMode="numeric" {...register('photoId')} error={errors.photoId?.message} hint="Shown on each photo in the Photos page." />}
                <Input label="Label" {...register('label')} error={errors.label?.message} placeholder="e.g. Table cards" />
                <FormGrid>
                    <Input label="Expires" type="datetime-local" {...register('expiresAt')} error={errors.expiresAt?.message} hint={gallery.expires_at ? `Blank = gallery expiry (${dateTime(gallery.expires_at)})` : 'Blank = never'} />
                    <Input label="Max scans" inputMode="numeric" {...register('maxUses')} error={errors.maxUses?.message} hint="Blank = unlimited" />
                </FormGrid>
            </form>
        </Modal>
    );
}

interface CoverPhoto {
    id: number;
    thumb_url: string | null;
    file_name: string;
}

function CoverPicker({ open, galleryId, current, onClose }: { open: boolean; galleryId: number; current: number | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [page, setPage] = useState(1);
    const q = useQuery({
        queryKey: ['photos', 'cover', galleryId, page],
        queryFn: () => api.get<Paged<CoverPhoto>>('/api/photos', { galleryId, published: 'true', rejected: 'false', page, pageSize: 48 }),
        enabled: open,
        placeholderData: (p) => p,
    });
    const save = useMutation({
        mutationFn: (photoId: number) => api.send('PUT', `/api/galleries/${galleryId}/cover`, { photoId }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['galleries']);
            onClose();
        },
        onError: (e) => toast.error(e),
    });
    return (
        <Modal open={open} onClose={onClose} title="Choose a cover photo" size="xl">
            <QueryState query={q} isEmpty={(d) => !d.items.length} empty={<EmptyState title="No published photos" description="Publish photos first, then choose one as the cover." />}>
                {(d) => (
                    <>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                            {d.items.map((p) => (
                                <button
                                    type="button"
                                    key={p.id}
                                    disabled={save.isPending}
                                    onClick={() => save.mutate(p.id)}
                                    className={`relative aspect-square overflow-hidden rounded-lg bg-stone-100 ring-offset-2 hover:ring-2 hover:ring-brand-500 ${current === p.id ? 'ring-2 ring-brand-600' : ''}`}
                                    title={p.file_name}
                                >
                                    {p.thumb_url && <img src={p.thumb_url} alt="" loading="lazy" className="size-full object-cover" />}
                                </button>
                            ))}
                        </div>
                        {d.totalPages > 1 && (
                            <div className="mt-4 flex justify-center gap-2">
                                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                    Previous
                                </Button>
                                <Button size="sm" variant="secondary" disabled={page >= d.totalPages} onClick={() => setPage(page + 1)}>
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </QueryState>
        </Modal>
    );
}
