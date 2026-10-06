// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import clsx from 'clsx';
import { CheckCircle2, Heart, Images, Loader2, Lock, Printer, RefreshCw, ScanFace, ShoppingCart, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { EmptyState, ErrorState, Loading, StatusBadge } from '../../components/data';
import { Textarea } from '../../components/form';
import { Modal } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { usePayment } from '../../components/usePayment';
import { Alert, Button } from '../../components/ui';
import { api, ApiError, type Paged } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { date, money, titleCase } from '../../lib/format';
import { useRealtime } from '../../lib/socket';
import { Lightbox } from './Lightbox';
import { PrintOrderModal } from './PrintOrderModal';
import type { GalleryInfo, GalleryPhoto, GalleryView } from './types';

const PAGE_SIZE = 60;
type PhotoPages = InfiniteData<Paged<GalleryPhoto>, number>;

/**
 * The customer-facing gallery used by both QR access (/g/:token, with a gallery session header)
 * and the signed-in owner view (/customer/galleries/:id).
 */
export function GalleryViewer({ galleryId, session, onAccessLost, dark = false }: { galleryId: number; session?: string | null; onAccessLost?: () => void; dark?: boolean }) {
    const qc = useQueryClient();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { pay, busy: paying, dialog: payDialog } = usePayment();
    const headers = useMemo(() => (session ? { 'X-Gallery-Session': session } : undefined), [session]);

    const [view, setView] = useState<GalleryView>('all');
    const [albumId, setAlbumId] = useState<number | null>(null);
    const [category, setCategory] = useState('');
    const [lightbox, setLightbox] = useState<number | null>(null);
    const [cartMode, setCartMode] = useState(false);
    const [cart, setCart] = useState<Set<number>>(new Set());
    const [printOpen, setPrintOpen] = useState(false);
    const [submitOpen, setSubmitOpen] = useState(false);
    const [note, setNote] = useState('');
    const [newPhotos, setNewPhotos] = useState(0);
    const [face, setFace] = useState<{ items: GalleryPhoto[]; message: string } | null>(null);
    const [faceBusy, setFaceBusy] = useState(false);
    const selfieRef = useRef<HTMLInputElement>(null);
    const sentinel = useRef<HTMLDivElement>(null);

    const infoKey = ['gallery', galleryId, 'info'];
    const photosKey = ['gallery', galleryId, 'photos'];
    const info = useQuery({ queryKey: [...infoKey, session ?? 'user'], queryFn: () => api.get<GalleryInfo>(`/api/gallery/${galleryId}`, undefined, headers), retry: false });

    const photos = useInfiniteQuery({
        queryKey: [...photosKey, { view, albumId, category, session: session ?? 'user' }],
        queryFn: ({ pageParam }) => api.get<Paged<GalleryPhoto>>(`/api/gallery/${galleryId}/photos`, { page: pageParam, pageSize: PAGE_SIZE, view, albumId, category: category || undefined }, headers),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
        enabled: info.isSuccess,
    });

    const lostAccess = (e: unknown) => e instanceof ApiError && (e.status === 401 || e.status === 403) && !!session;
    useEffect(() => {
        if (lostAccess(info.error) || lostAccess(photos.error)) onAccessLost?.();
    }, [info.error, photos.error]);

    const list: GalleryPhoto[] = useMemo(() => face?.items ?? photos.data?.pages.flatMap((p) => p.items) ?? [], [face, photos.data]);
    const total = face ? face.items.length : (photos.data?.pages[0]?.total ?? 0);

    // Infinite scroll
    const { hasNextPage, isFetchingNextPage, fetchNextPage } = photos;
    useEffect(() => {
        const el = sentinel.current;
        if (!el || face) return;
        const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage(), { rootMargin: '800px' });
        io.observe(el);
        return () => io.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, face]);

    // Live event: new photos arrive over the socket
    useRealtime(
        { enabled: info.isSuccess, gallerySession: session ?? null, galleryId },
        {
            'photo:new': (p: { id: number; galleryId: number }) => {
                if (p.galleryId === galleryId) setNewPhotos((n) => n + 1);
            },
            'photo:removed': (p: { id: number }) => {
                qc.setQueriesData<PhotoPages>({ queryKey: photosKey }, (old) => (old ? { ...old, pages: old.pages.map((pg) => ({ ...pg, items: pg.items.filter((x) => x.id !== p.id) })) } : old));
            },
            'payment:success': () => {
                qc.invalidateQueries({ queryKey: ['gallery', galleryId] });
            },
        },
    );

    const showNew = () => {
        setNewPhotos(0);
        setFace(null);
        qc.invalidateQueries({ queryKey: ['gallery', galleryId] });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const patchPhoto = useCallback(
        (id: number, patch: Partial<GalleryPhoto>) => {
            qc.setQueriesData<PhotoPages>({ queryKey: photosKey }, (old) => (old ? { ...old, pages: old.pages.map((pg) => ({ ...pg, items: pg.items.map((x) => (x.id === id ? { ...x, ...patch } : x)) })) } : old));
            qc.setQueryData(['gallery', galleryId, 'photo', id], (old: object | undefined) => (old ? { ...old, ...patch } : old));
            setFace((f) => (f ? { ...f, items: f.items.map((x) => (x.id === id ? { ...x, ...patch } : x)) } : f));
        },
        [qc, galleryId],
    );

    const requireSignIn = () => navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);

    const favourite = useMutation({
        mutationFn: ({ id, on }: { id: number; on: boolean }) => api.post(`/api/gallery/${galleryId}/photos/${id}/favourite`, { on }, headers),
        onMutate: ({ id, on }) => patchPhoto(id, { favourite: on }),
        onError: (e, { id, on }) => {
            patchPhoto(id, { favourite: !on });
            toast.error(e);
        },
    });
    const select = useMutation({
        mutationFn: ({ id, on }: { id: number; on: boolean }) => api.post(`/api/gallery/${galleryId}/photos/${id}/select`, { on }, headers),
        onMutate: ({ id, on }) => patchPhoto(id, { selected: on }),
        onSuccess: () => qc.invalidateQueries({ queryKey: infoKey }),
        onError: (e, { id, on }) => {
            patchPhoto(id, { selected: !on });
            toast.error(e);
        },
    });
    const submitSelection = useMutation({
        mutationFn: () => api.send('POST', `/api/gallery/${galleryId}/selection/submit`, { note: note.trim() || null }, headers),
        onSuccess: (r) => {
            toast.success(r.message);
            setSubmitOpen(false);
            qc.invalidateQueries({ queryKey: infoKey });
        },
        onError: (e) => toast.error(e),
    });

    const canBuy = !!user?.customerId;
    const [buying, setBuying] = useState(false);
    const buyHd = async (ids: number[]) => {
        if (!user) return requireSignIn();
        if (!canBuy) return toast.warning('Purchases need a customer account.');
        setBuying(true);
        try {
            const order = await api.post<{ id: number }>(`/api/gallery/${galleryId}/orders`, { type: 'PHOTO_DOWNLOAD', photoIds: ids }, headers);
            if (await pay({ orderId: order.id })) {
                setCart(new Set());
                setCartMode(false);
                ids.forEach((id) => patchPhoto(id, { purchased: true }));
                qc.invalidateQueries({ queryKey: ['gallery', galleryId] });
            }
        } catch (e) {
            toast.error(e);
        } finally {
            setBuying(false);
        }
    };
    const afterPrintOrder = async (orderId: number) => {
        setPrintOpen(false);
        if (await pay({ orderId })) {
            setCart(new Set());
            setCartMode(false);
            toast.info('Track your print order under My account → Orders.');
        }
    };

    const runFaceSearch = async (file: File) => {
        setFaceBusy(true);
        try {
            const form = new FormData();
            form.append('selfie', file);
            const r = await api.send<Paged<GalleryPhoto>>('POST', `/api/gallery/${galleryId}/face-search`, form, headers);
            setFace({ items: r.data.items, message: r.message });
        } catch (e) {
            toast.error(e);
        } finally {
            setFaceBusy(false);
            if (selfieRef.current) selfieRef.current.value = '';
        }
    };

    const toggleCart = (id: number) =>
        setCart((c) => {
            const n = new Set(c);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });

    if (info.isLoading) return <Loading className="min-h-[60vh]" label="Opening gallery…" />;
    if (info.isError || !info.data) return <ErrorState error={info.error} onRetry={() => info.refetch()} className="min-h-[50vh]" />;
    const g = info.data;
    const cartPhotos = list.filter((p) => cart.has(p.id));
    const cartToBuy = cartPhotos.filter((p) => !p.purchased);
    const cartTotal = cartToBuy.reduce((s, p) => s + p.price, 0);
    const views: { value: GalleryView; label: string; show: boolean }[] = [
        { value: 'all', label: 'All photos', show: true },
        { value: 'favourites', label: 'Favourites', show: g.signedIn },
        { value: 'selected', label: 'Album selection', show: g.isOwner },
        { value: 'purchased', label: 'Purchased', show: canBuy },
    ];
    const chip = (active: boolean) =>
        clsx('shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors', active ? 'bg-brand-700 text-white' : dark ? 'bg-white/10 text-white/80 hover:bg-white/15' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50');

    return (
        <div className={clsx(dark ? 'text-white' : 'text-stone-900')}>
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{g.title}</h1>
                        {g.isLive && <StatusBadge status="LIVE" label="Live now" />}
                    </div>
                    <p className={clsx('mt-1 text-sm', dark ? 'text-white/60' : 'text-stone-500')}>
                        {g.eventTitle} · {date(g.eventDate)} · {g.photoCount} photos
                        {g.expiresAt && ` · available until ${date(g.expiresAt)}`}
                    </p>
                    {g.description && <p className={clsx('mt-2 max-w-2xl text-sm', dark ? 'text-white/70' : 'text-stone-600')}>{g.description}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                    {g.faceSearch && (
                        <>
                            <input ref={selfieRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden" onChange={(e) => e.target.files?.[0] && runFaceSearch(e.target.files[0])} />
                            <Button variant="secondary" icon={<ScanFace className="size-4" />} loading={faceBusy} onClick={() => selfieRef.current?.click()}>
                                Find my photos
                            </Button>
                        </>
                    )}
                    <Button
                        variant={cartMode ? 'dark' : 'secondary'}
                        icon={cartMode ? <X className="size-4" /> : <ShoppingCart className="size-4" />}
                        onClick={() => {
                            if (!user) return requireSignIn();
                            setCartMode((v) => !v);
                            setCart(new Set());
                        }}
                    >
                        {cartMode ? 'Done choosing' : 'Buy / print photos'}
                    </Button>
                </div>
            </header>

            {g.selection.canSelect && (
                <Alert tone="info" className="mt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>
                            Choose your favourite shots for the album. <strong>{g.selection.count}</strong> selected so far
                            {g.selection.status === 'REOPENED' && ' (the studio reopened your selection)'}.
                        </span>
                        <Button size="sm" disabled={!g.selection.count} onClick={() => setSubmitOpen(true)}>
                            Submit selection
                        </Button>
                    </div>
                </Alert>
            )}
            {g.isOwner && !g.selection.canSelect && g.selection.status && (
                <Alert tone={g.selection.status === 'CONFIRMED' ? 'success' : 'warning'} className="mt-4">
                    Your album selection of {g.selection.count} photos is {g.selection.status === 'CONFIRMED' ? 'confirmed by the studio' : 'submitted and awaiting the studio'}.
                </Alert>
            )}

            <div className="scrollbar-thin -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1">
                {views
                    .filter((v) => v.show)
                    .map((v) => (
                        <button key={v.value} type="button" className={chip(view === v.value && !face)} onClick={() => (setView(v.value), setFace(null))}>
                            {v.label}
                        </button>
                    ))}
                {g.albums.length > 1 && <span className={clsx('mx-1 w-px shrink-0', dark ? 'bg-white/15' : 'bg-stone-200')} />}
                {g.albums.length > 1 &&
                    g.albums.map((a) => (
                        <button key={a.id} type="button" className={chip(albumId === a.id)} onClick={() => (setAlbumId(albumId === a.id ? null : a.id), setFace(null))}>
                            {a.name} <span className="opacity-60">{a.photo_count}</span>
                        </button>
                    ))}
                {g.categories.length > 0 && (
                    <select
                        value={category}
                        onChange={(e) => (setCategory(e.target.value), setFace(null))}
                        aria-label="Filter by people"
                        className={clsx('h-8 shrink-0 rounded-full border-0 px-3 text-sm', dark ? 'bg-white/10 text-white' : 'bg-white ring-1 ring-stone-200')}
                    >
                        <option value="">Everyone</option>
                        {g.categories.map((c) => (
                            <option key={c.category} value={c.category} className="text-stone-900">
                                {titleCase(c.category)} ({c.n})
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {face && (
                <div className={clsx('mt-4 flex items-center justify-between gap-3 rounded-lg px-4 py-2 text-sm', dark ? 'bg-white/10' : 'bg-brand-50 text-brand-900')}>
                    <span className="flex items-center gap-2">
                        <Sparkles className="size-4" /> {face.message}
                    </span>
                    <button type="button" className="font-medium underline" onClick={() => setFace(null)}>
                        Show all
                    </button>
                </div>
            )}

            {newPhotos > 0 && (
                <div className="sticky top-3 z-20 mt-4 flex justify-center">
                    <Button size="sm" variant="dark" icon={<RefreshCw className="size-4" />} onClick={showNew} className="shadow-lg">
                        {newPhotos} new photo{newPhotos === 1 ? '' : 's'}. Show
                    </Button>
                </div>
            )}

            <div className="mt-5">
                {photos.isLoading && !face ? (
                    <Loading />
                ) : photos.isError && !face ? (
                    <ErrorState error={photos.error} onRetry={() => photos.refetch()} />
                ) : !list.length ? (
                    <EmptyState
                        icon={<Images className="size-10" />}
                        title={face ? 'No matches' : view === 'all' ? (g.isLive ? 'Photos will appear here as they are uploaded' : 'No photos yet') : 'Nothing here yet'}
                        description={view === 'favourites' ? 'Tap the heart on a photo to save it here.' : view === 'selected' ? 'Select photos for your album from the full gallery.' : view === 'purchased' ? 'Photos you buy appear here for HD download.' : undefined}
                    />
                ) : (
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4 xl:grid-cols-5" onContextMenu={(e) => e.preventDefault()}>
                        {list.map((p, i) => {
                            const inCart = cart.has(p.id);
                            return (
                                <div key={p.id} className={clsx('group relative aspect-square overflow-hidden rounded-md bg-stone-200', inCart && 'ring-4 ring-brand-500')}>
                                    <button type="button" className="block size-full" onClick={() => (cartMode ? toggleCart(p.id) : setLightbox(i))} aria-label={cartMode ? (inCart ? 'Remove from cart' : 'Add to cart') : 'Open photo'}>
                                        <img src={p.thumb_url} alt="" loading="lazy" draggable={false} className="protected-img size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                                    </button>
                                    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-1.5">
                                        <div className="flex gap-1">
                                            {p.purchased && <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">HD</span>}
                                            {p.selected && <CheckCircle2 className="size-5 rounded-full bg-white text-emerald-600" />}
                                        </div>
                                        {cartMode && <span className={clsx('size-5 rounded-full border-2 border-white', inCart ? 'bg-brand-600' : 'bg-black/30')} />}
                                    </div>
                                    {!cartMode && (
                                        <button
                                            type="button"
                                            onClick={() => (g.signedIn ? favourite.mutate({ id: p.id, on: !p.favourite }) : requireSignIn())}
                                            className={clsx('absolute bottom-1.5 right-1.5 rounded-full bg-black/40 p-1.5 text-white transition-opacity hover:bg-black/60', p.favourite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 max-sm:opacity-100')}
                                            aria-label={p.favourite ? 'Remove from favourites' : 'Add to favourites'}
                                        >
                                            <Heart className={clsx('size-4', p.favourite && 'fill-rose-500 text-rose-500')} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                <div ref={sentinel} className="h-10" />
                {isFetchingNextPage && (
                    <div className="flex justify-center py-6">
                        <Loader2 className="size-6 animate-spin opacity-60" />
                    </div>
                )}
                {!!list.length && !hasNextPage && !face && <p className={clsx('py-6 text-center text-xs', dark ? 'text-white/40' : 'text-stone-400')}>{total} photos</p>}
            </div>

            <p className={clsx('mt-6 flex items-start gap-2 text-xs', dark ? 'text-white/40' : 'text-stone-400')}>
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                {g.watermark ? 'Previews are watermarked and reduced in size. ' : ''}Right-click saving is disabled, but screenshots cannot be fully prevented. Full-resolution files are only delivered after purchase through
                time-limited secure links.
            </p>

            {cartMode && (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 p-3 text-stone-900 shadow-2xl backdrop-blur">
                    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
                        <p className="text-sm">
                            {cart.size ? (
                                <>
                                    <strong>{cart.size}</strong> chosen{cartToBuy.length !== cart.size && ` (${cart.size - cartToBuy.length} already owned)`}
                                </>
                            ) : (
                                'Tap photos to choose them'
                            )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" icon={<Printer className="size-4" />} disabled={!cart.size || paying} onClick={() => setPrintOpen(true)}>
                                Order prints
                            </Button>
                            <Button icon={<ShoppingCart className="size-4" />} disabled={!cartToBuy.length} loading={buying || paying} onClick={() => buyHd(cartToBuy.map((p) => p.id))}>
                                Buy HD{cartToBuy.length ? ` · ${money(cartTotal)}` : ''}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {lightbox !== null && list[lightbox] && (
                <Lightbox
                    info={g}
                    headers={headers}
                    photos={list}
                    index={lightbox}
                    onIndex={setLightbox}
                    onClose={() => setLightbox(null)}
                    onFavourite={(id, on) => favourite.mutate({ id, on })}
                    onSelect={(id, on) => select.mutate({ id, on })}
                    onBuy={buyHd}
                    buying={buying || paying}
                    canBuy={canBuy}
                    requireSignIn={requireSignIn}
                />
            )}

            <PrintOrderModal open={printOpen} onClose={() => setPrintOpen(false)} info={g} photos={cartPhotos} headers={headers} onCreated={afterPrintOrder} />

            <Modal
                open={submitOpen}
                onClose={() => setSubmitOpen(false)}
                title="Submit album selection"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setSubmitOpen(false)}>
                            Keep choosing
                        </Button>
                        <Button loading={submitSelection.isPending} onClick={() => submitSelection.mutate()}>
                            Submit {g.selection.count} photos
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-stone-600">The studio will start designing your album with these photos. You won't be able to change the selection unless the studio reopens it.</p>
                <Textarea label="Note for the designer (optional)" className="mt-4" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} wrapperClassName="mt-4" />
            </Modal>
            {payDialog}
        </div>
    );
}
