// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 27-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, Check, Copy, ExternalLink, FolderPlus, ImagePlus, Link2, Shield, Upload } from 'lucide-react';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useParams } from 'react-router';
import { EmptyState, QueryState } from '../../components/ui/Data';
import { Checkbox, Input } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import { Alert, Button, Card } from '../../components/ui';
import { api } from '../../services/api';
import { useInvalidate } from '../../hooks';
import { MAX_FILE_BYTES, useUploadQueue } from '../../utils/uploadQueue';
import { num } from '../../utils/format';

type Step = 1 | 2 | 3;

interface Album {
    id: number;
    name: string;
    description: string | null;
    sort_order: number;
    photo_count?: number;
}

interface EventLite {
    id: number;
    title: string;
    event_code: string;
    gallery: { id: number; title: string; status: string; watermark_enabled: number; allow_download: number } | null;
    public_url?: string | null;
    qr_token?: string | null;
}

interface GalleryAdmin {
    id: number;
    event_id: number;
    title: string;
    status: string;
    watermark_enabled: number;
    allow_download: number;
    albums: Album[];
}

const STEPS = [
    { n: 1 as const, label: 'Create folder', hint: 'Album for this upload' },
    { n: 2 as const, label: 'Upload images', hint: 'Drop photos into the folder' },
    { n: 3 as const, label: 'Share & watermark', hint: 'Public link + logo watermark' },
];

export default function AdminEventUpload() {
    const id = Number(useParams().id);
    const toast = useToast();
    const invalidate = useInvalidate();
    const [step, setStep] = useState<Step>(1);
    const [folderName, setFolderName] = useState('');
    const [albumId, setAlbumId] = useState<number | null>(null);
    const [dragging, setDragging] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    const eventQ = useQuery({
        queryKey: ['events', 'detail', id],
        queryFn: () => api.get<EventLite>(`/api/events/${id}`),
        enabled: id > 0,
    });
    const galleryId = eventQ.data?.gallery?.id ?? 0;
    const galleryQ = useQuery({
        queryKey: ['galleries', 'detail', galleryId],
        queryFn: () => api.get<GalleryAdmin>(`/api/galleries/${galleryId}`),
        enabled: galleryId > 0,
    });
    const settingsQ = useQuery({
        queryKey: ['settings'],
        queryFn: () =>
            api.get<{
                gallery: { watermarkText: string; watermarkUseLogo?: boolean; watermarkLogoUrl?: string | null; watermarkLogoKey?: string | null };
            }>('/api/settings'),
    });

    const albums = galleryQ.data?.albums ?? [];
    const selectedAlbum = albums.find((a) => a.id === albumId) ?? null;
    const customerLink = eventQ.data?.qr_token ? `${window.location.origin}/g/${eventQ.data.qr_token}` : eventQ.data?.public_url ?? null;

    const createAlbum = useMutation({
        mutationFn: () =>
            api.send<{ id: number }>('POST', `/api/galleries/${galleryId}/albums`, {
                name: folderName.trim(),
                description: null,
                sortOrder: albums.length,
            }),
        onSuccess: async (r) => {
            toast.success(r.message);
            setAlbumId(r.data.id);
            setFolderName('');
            await invalidate(['galleries', 'detail', galleryId]);
            setStep(2);
        },
        onError: (e) => toast.error(e),
    });

    const ensureGallery = useMutation({
        mutationFn: () => api.send<{ id: number }>('POST', '/api/galleries', { eventId: id, title: eventQ.data?.title ?? 'Event gallery' }),
        onSuccess: async (r) => {
            toast.success(r.message);
            await invalidate(['events', 'detail', id], ['galleries']);
        },
        onError: (e) => toast.error(e),
    });

    const saveShare = useMutation({
        mutationFn: async (body: { watermarkEnabled: boolean; allowDownload: boolean }) => {
            const g = galleryQ.data!;
            return api.send('PUT', `/api/galleries/${galleryId}`, {
                title: g.title,
                description: null,
                status: g.status === 'DRAFT' ? 'LIVE' : g.status,
                watermarkEnabled: body.watermarkEnabled,
                allowDownload: body.allowDownload,
                autoPublish: true,
                photoPrice: null,
                expiresAt: null,
            });
        },
        onSuccess: async (r) => {
            toast.success(r.message);
            await invalidate(['galleries', 'detail', galleryId], ['events', 'detail', id]);
        },
        onError: (e) => toast.error(e),
    });

    const queue = useUploadQueue({
        eventId: id,
        cameraLabel: '',
        albumId,
        onUploaded: () => invalidate(['events', 'detail', id], ['galleries', 'detail', galleryId], ['photos']),
    });

    const [wmOn, setWmOn] = useState(true);
    const [downloadsOn, setDownloadsOn] = useState(true);
    const logoUrl = settingsQ.data?.gallery?.watermarkLogoUrl ?? null;
    const useLogo = !!settingsQ.data?.gallery?.watermarkUseLogo && !!settingsQ.data?.gallery?.watermarkLogoKey;

    const doneCount = useMemo(() => queue.items.filter((i) => i.status === 'done' || i.status === 'duplicate').length, [queue.items]);

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (!albumId) return;
        if (e.dataTransfer.files.length) queue.add(e.dataTransfer.files);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <Link to={`/admin/events/${id}`} className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
                    <ArrowLeft className="size-4" /> Back to event
                </Link>
            </div>

            <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-stone-900">Upload images</h1>
                        <p className="mt-1 text-sm text-stone-500">Create a folder, upload photos, then share a public customer download link with optional company logo watermark.</p>
                        {eventQ.data && (
                            <p className="mt-2 text-sm font-medium text-stone-700">
                                {eventQ.data.title} · <span className="text-stone-500">{eventQ.data.event_code}</span>
                            </p>
                        )}
                    </div>
                    <ol className="flex flex-wrap gap-2">
                        {STEPS.map((s) => (
                            <li key={s.n}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (s.n === 1 || (s.n === 2 && albumId) || (s.n === 3 && albumId)) setStep(s.n);
                                    }}
                                    className={clsx(
                                        'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                                        step === s.n ? 'bg-ink-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
                                    )}
                                >
                                    <span className={clsx('flex size-6 items-center justify-center rounded-full text-xs font-bold', step === s.n ? 'bg-accent-400 text-ink-900' : 'bg-white text-stone-700')}>
                                        {step > s.n ? <Check className="size-3.5" /> : s.n}
                                    </span>
                                    <span>
                                        <span className="block font-semibold leading-tight">{s.label}</span>
                                        <span className={clsx('hidden text-[10px] sm:block', step === s.n ? 'text-white/70' : 'text-stone-500')}>{s.hint}</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </div>
            </Card>

            <QueryState query={eventQ}>
                {(e) =>
                    !e.gallery ? (
                        <Card>
                            <EmptyState
                                title="No gallery yet"
                                description="Create a gallery for this event before uploading folders and photos."
                                action={
                                    <Button loading={ensureGallery.isPending} onClick={() => ensureGallery.mutate()}>
                                        Create gallery
                                    </Button>
                                }
                            />
                        </Card>
                    ) : (
                        <>
                            {step === 1 && (
                                <Card title="Create or choose a folder">
                                    <p className="mb-4 text-sm text-stone-500">Folders keep event photos organised. Customers open the public link and can browse folders to download.</p>
                                    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                                        <Input label="New folder name" value={folderName} onChange={(ev) => setFolderName(ev.target.value)} placeholder="e.g. Ceremony, Reception, Portraits" className="flex-1" />
                                        <div className="flex items-end">
                                            <Button icon={<FolderPlus className="size-4" />} loading={createAlbum.isPending} disabled={!folderName.trim()} onClick={() => createAlbum.mutate()}>
                                                Create folder
                                            </Button>
                                        </div>
                                    </div>
                                    {albums.length > 0 && (
                                        <ul className="grid gap-2 sm:grid-cols-2">
                                            {albums.map((a) => (
                                                <li key={a.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAlbumId(a.id);
                                                            setStep(2);
                                                        }}
                                                        className={clsx(
                                                            'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                                                            albumId === a.id ? 'border-ink-900 bg-ink-900 text-white' : 'border-stone-200 bg-stone-50 hover:border-stone-300',
                                                        )}
                                                    >
                                                        <span>
                                                            <span className="block font-semibold">{a.name}</span>
                                                            <span className={clsx('text-xs', albumId === a.id ? 'text-white/70' : 'text-stone-500')}>{num(a.photo_count ?? 0)} photos</span>
                                                        </span>
                                                        <Upload className="size-4 opacity-70" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Card>
                            )}

                            {step === 2 && (
                                <Card
                                    title={`Upload into ${selectedAlbum?.name ?? 'folder'}`}
                                    actions={
                                        <Button size="sm" variant="secondary" onClick={() => setStep(1)}>
                                            Change folder
                                        </Button>
                                    }
                                >
                                    {!albumId ? (
                                        <Alert tone="warning">Choose or create a folder first.</Alert>
                                    ) : (
                                        <div className="space-y-4">
                                            <div
                                                onDragOver={(ev) => {
                                                    ev.preventDefault();
                                                    setDragging(true);
                                                }}
                                                onDragLeave={() => setDragging(false)}
                                                onDrop={onDrop}
                                                className={clsx(
                                                    'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors',
                                                    dragging ? 'border-sky-500 bg-sky-50' : 'border-stone-200 bg-stone-50',
                                                )}
                                            >
                                                <ImagePlus className={clsx('mb-3 size-10', dragging ? 'text-sky-600' : 'text-stone-400')} />
                                                <p className="font-semibold text-stone-800">Drop images here</p>
                                                <p className="mt-1 text-sm text-stone-500">JPEG, PNG, WebP, HEIC · up to {Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB each</p>
                                                <Button className="mt-4" variant="secondary" onClick={() => input.current?.click()}>
                                                    Browse files
                                                </Button>
                                                <input
                                                    ref={input}
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(ev) => {
                                                        if (ev.target.files?.length) queue.add(ev.target.files);
                                                        ev.target.value = '';
                                                    }}
                                                />
                                            </div>
                                            {queue.items.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium text-stone-700">
                                                        {doneCount} / {queue.items.length} uploaded
                                                    </p>
                                                    <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
                                                        {queue.items.slice(0, 40).map((item) => (
                                                            <li key={item.id} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5">
                                                                <span className="truncate">{item.file.name}</span>
                                                                <span className="ml-2 shrink-0 text-xs capitalize text-stone-500">{item.status}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            <div className="flex justify-end">
                                                <Button onClick={() => setStep(3)} disabled={doneCount === 0 && queue.items.length === 0}>
                                                    Next: share link
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            )}

                            {step === 3 && (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <Card title="Public customer URL">
                                        <p className="mb-3 text-sm text-stone-500">Customers open this link to view and download photos from this event (watermarked previews when enabled).</p>
                                        {customerLink ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2">
                                                    <Link2 className="size-4 shrink-0 text-stone-400" />
                                                    <input type="text" readOnly value={customerLink} className="w-full bg-transparent font-mono text-xs outline-none" />
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        icon={<Copy className="size-3.5" />}
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(customerLink);
                                                            toast.success('Public link copied');
                                                        }}
                                                    >
                                                        Copy
                                                    </Button>
                                                </div>
                                                <a href={customerLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:underline">
                                                    <ExternalLink className="size-4" /> Open customer gallery
                                                </a>
                                            </div>
                                        ) : (
                                            <Alert tone="warning">Public link is created with the event gallery. Refresh if it is missing.</Alert>
                                        )}
                                    </Card>
                                    <Card title="Watermark & downloads">
                                        <div className="space-y-4">
                                            <Checkbox label="Apply watermark on previews" checked={wmOn} onChange={(ev) => setWmOn(ev.target.checked)} />
                                            <Checkbox label="Allow customer photo downloads" checked={downloadsOn} onChange={(ev) => setDownloadsOn(ev.target.checked)} />
                                            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                                                <p className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                                                    <Shield className="size-4 text-sky-600" /> Company logo watermark
                                                </p>
                                                {useLogo && logoUrl ? (
                                                    <div className="mt-2 flex items-center gap-3">
                                                        <img src={logoUrl} alt="Watermark logo" className="h-12 w-auto rounded bg-white object-contain p-1 ring-1 ring-stone-200" />
                                                        <p className="text-xs text-stone-500">Logo from Settings → Gallery will be stamped on previews when watermark is on.</p>
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-xs text-stone-500">
                                                        Upload a company logo under{' '}
                                                        <Link to="/admin/settings?tab=gallery" className="font-semibold text-sky-700 hover:underline">
                                                            Settings → Gallery
                                                        </Link>{' '}
                                                        and enable “Use company logo”.
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                loading={saveShare.isPending}
                                                onClick={() =>
                                                    saveShare.mutate({
                                                        watermarkEnabled: wmOn,
                                                        allowDownload: downloadsOn,
                                                    })
                                                }
                                            >
                                                Save share settings
                                            </Button>
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </>
                    )
                }
            </QueryState>
        </div>
    );
}
