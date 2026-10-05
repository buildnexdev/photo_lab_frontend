import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { CheckCircle2, ChevronLeft, ChevronRight, Download, Heart, Loader2, MessageSquare, ShoppingCart, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../components/toast';
import { Button } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { downloadPhoto } from '../../lib/downloads';
import { money, relative } from '../../lib/format';
import type { GalleryInfo, GalleryPhoto, PhotoDetail } from './types';

interface Props {
    info: GalleryInfo;
    headers?: Record<string, string>;
    photos: GalleryPhoto[];
    index: number;
    onIndex: (i: number) => void;
    onClose: () => void;
    onFavourite: (id: number, on: boolean) => void;
    onSelect: (id: number, on: boolean) => void;
    onBuy: (ids: number[]) => void;
    buying: boolean;
    canBuy: boolean;
    requireSignIn: () => void;
}

export function Lightbox({ info, headers, photos, index, onIndex, onClose, onFavourite, onSelect, onBuy, buying, canBuy, requireSignIn }: Props) {
    const photo = photos[index];
    const qc = useQueryClient();
    const toast = useToast();
    const [comment, setComment] = useState('');
    const [showPanel, setShowPanel] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const detailKey = ['gallery', info.id, 'photo', photo?.id];
    const detail = useQuery({
        queryKey: detailKey,
        queryFn: () => api.get<PhotoDetail>(`/api/gallery/${info.id}/photos/${photo.id}`, undefined, headers),
        enabled: !!photo,
        staleTime: 60_000,
    });

    const addComment = useMutation({
        mutationFn: (body: string) => api.send('POST', `/api/gallery/${info.id}/photos/${photo.id}/comments`, { body }, headers),
        onSuccess: () => {
            setComment('');
            qc.invalidateQueries({ queryKey: detailKey });
        },
        onError: (e) => toast.error(e),
    });
    const delComment = useMutation({
        mutationFn: (id: number) => api.send('DELETE', `/api/gallery/${info.id}/comments/${id}`, undefined, headers),
        onSuccess: () => qc.invalidateQueries({ queryKey: detailKey }),
        onError: (e) => toast.error(e),
    });

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
            else if (e.key === 'ArrowRight' && index < photos.length - 1) onIndex(index + 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [index, photos.length, onClose, onIndex]);

    // Preload neighbours' thumbnails for snappy navigation
    useEffect(() => {
        [photos[index + 1], photos[index - 1]].forEach((p) => {
            if (p) new Image().src = p.thumb_url;
        });
    }, [index, photos]);

    if (!photo) return null;
    const d = detail.data;
    const favourite = d?.favourite ?? photo.favourite;
    const selected = d?.selected ?? photo.selected;
    const purchased = d?.purchased ?? photo.purchased;

    const submitComment = (e: FormEvent) => {
        e.preventDefault();
        if (!info.signedIn) return requireSignIn();
        if (comment.trim()) addComment.mutate(comment.trim());
    };
    const download = async () => {
        setDownloading(true);
        try {
            await downloadPhoto(photo.id);
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setDownloading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white lg:flex-row" role="dialog" aria-modal="true" aria-label="Photo viewer">
            <div className="relative flex min-h-0 flex-1 items-center justify-center" onContextMenu={(e) => e.preventDefault()}>
                <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-3">
                    <span className="text-sm text-white/70">
                        {index + 1} / {photos.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button type="button" className="rounded-full p-2 hover:bg-white/10 lg:hidden" onClick={() => setShowPanel((v) => !v)} aria-label="Details and comments">
                            <MessageSquare className="size-5" />
                        </button>
                        <button type="button" className="rounded-full p-2 hover:bg-white/10" onClick={onClose} aria-label="Close viewer">
                            <X className="size-6" />
                        </button>
                    </div>
                </div>
                {detail.isLoading && <Loader2 className="size-8 animate-spin text-white/60" />}
                {detail.isError && <p className="px-6 text-center text-sm text-red-300">{errorMessage(detail.error)}</p>}
                {d && (
                    <img
                        key={d.id}
                        src={d.preview_url}
                        alt=""
                        draggable={false}
                        className="protected-img max-h-full max-w-full select-none object-contain"
                        style={{ maxHeight: 'calc(100dvh - 2rem)' }}
                    />
                )}
                {index > 0 && (
                    <button type="button" onClick={() => onIndex(index - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 hover:bg-black/70" aria-label="Previous photo">
                        <ChevronLeft className="size-7" />
                    </button>
                )}
                {index < photos.length - 1 && (
                    <button type="button" onClick={() => onIndex(index + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 hover:bg-black/70" aria-label="Next photo">
                        <ChevronRight className="size-7" />
                    </button>
                )}
            </div>

            <aside className={clsx('flex max-h-[55dvh] w-full shrink-0 flex-col border-t border-white/10 bg-stone-950 lg:flex lg:max-h-none lg:w-96 lg:border-l lg:border-t-0', showPanel ? 'flex' : 'hidden')}>
                <div className="space-y-3 border-b border-white/10 p-4">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            className={clsx('!border-white/20 !bg-white/5 !text-white hover:!bg-white/10', favourite && '!text-rose-400')}
                            icon={<Heart className={clsx('size-4', favourite && 'fill-current')} />}
                            onClick={() => (info.signedIn ? onFavourite(photo.id, !favourite) : requireSignIn())}
                        >
                            {favourite ? 'Favourited' : 'Favourite'}
                        </Button>
                        {info.selection.canSelect && (
                            <Button
                                size="sm"
                                variant={selected ? 'success' : 'secondary'}
                                className={clsx(!selected && '!border-white/20 !bg-white/5 !text-white hover:!bg-white/10')}
                                icon={<CheckCircle2 className="size-4" />}
                                onClick={() => onSelect(photo.id, !selected)}
                            >
                                {selected ? 'Selected for album' : 'Select for album'}
                            </Button>
                        )}
                    </div>
                    {purchased ? (
                        d?.can_download ? (
                            <Button className="w-full" variant="success" icon={<Download className="size-4" />} loading={downloading} onClick={download}>
                                Download HD
                            </Button>
                        ) : (
                            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">You own the HD version. Downloads will open once the studio enables them for this gallery.</p>
                        )
                    ) : (
                        <Button className="w-full" icon={<ShoppingCart className="size-4" />} loading={buying} disabled={!canBuy && info.signedIn} onClick={() => (info.signedIn ? onBuy([photo.id]) : requireSignIn())}>
                            Buy HD · {money(d?.price ?? photo.price)}
                        </Button>
                    )}
                    {!canBuy && info.signedIn && !purchased && <p className="text-xs text-white/50">Purchases need a customer account.</p>}
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                    <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-white/50">Comments for the studio</p>
                    <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                        {!info.signedIn && <p className="text-sm text-white/60">Sign in to leave comments or retouch requests on this photo.</p>}
                        {info.signedIn && d && d.comments.length === 0 && <p className="text-sm text-white/50">No comments yet. Ask for retouches or crops here.</p>}
                        {d?.comments.map((c) => (
                            <div key={c.id} className={clsx('rounded-lg px-3 py-2 text-sm', c.is_staff ? 'bg-brand-700/30' : 'bg-white/5')}>
                                <div className="flex items-center justify-between gap-2 text-xs text-white/50">
                                    <span>
                                        {c.user_name}
                                        {c.is_staff ? ' · Studio' : ''} · {relative(c.created_at)}
                                    </span>
                                    {!!c.mine && (
                                        <button type="button" onClick={() => delComment.mutate(c.id)} className="rounded p-1 hover:bg-white/10" aria-label="Delete comment">
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                                <p className="mt-1 whitespace-pre-wrap break-words">{c.body}</p>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={submitComment} className="flex gap-2 border-t border-white/10 p-3">
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                            rows={2}
                            placeholder={info.signedIn ? 'Write a comment…' : 'Sign in to comment'}
                            className="min-w-0 flex-1 resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-brand-500 focus:outline-none"
                            onFocus={() => !info.signedIn && requireSignIn()}
                        />
                        <Button type="submit" size="sm" className="self-end" loading={addComment.isPending} disabled={info.signedIn && !comment.trim()}>
                            Send
                        </Button>
                    </form>
                </div>
            </aside>
        </div>,
        document.body,
    );
}
