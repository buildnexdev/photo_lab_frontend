// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { AlertTriangle, Check, CheckSquare, Eye, EyeOff, FolderInput, Image as ImageIcon, RotateCcw, Square, Tag, Trash2, UserCog, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, Pagination, QueryState, SearchInput, StatusBadge } from '../../components/data';
import { Input, Select } from '../../components/form';
import { Drawer, Modal, useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Button, Card, KeyValue, PageHeader } from '../../components/ui';
import { api, type Paged } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { bytes, dateTime, parseJson, relative, titleCase } from '../../lib/format';
import { useInvalidate, useListParams, useOpenParam } from '../../lib/hooks';
import { PHOTO_CATEGORIES, PHOTO_STATUSES, type EventRow } from '../../lib/types';

interface PhotoRow {
    id: number;
    event_id: number;
    gallery_id: number;
    album_id: number | null;
    file_name: string;
    width: number | null;
    height: number | null;
    size_bytes: number;
    status: string;
    is_published: number;
    is_rejected: number;
    processing_error: string | null;
    camera_label: string | null;
    editor_id: number | null;
    has_edit: number;
    created_at: string;
    deleted_at: string | null;
    is_blurry: number | null;
    duplicate_of: number | null;
    eyes_closed: number | null;
    category: string | null;
    tags: string | string[] | null;
    selected_count: number;
    favourite_count: number;
    comment_count: number;
    thumb_url: string | null;
}
interface PhotoDetail extends Omit<PhotoRow, 'selected_count' | 'favourite_count' | 'comment_count' | 'has_edit'> {
    taken_at: string | null;
    camera_make: string | null;
    camera_model: string | null;
    lens: string | null;
    iso: number | null;
    exposure: string | null;
    aperture: string | null;
    focal_length: string | null;
    blur_score: number | null;
    faces_count: number | null;
    uploaded_by_name: string | null;
    editor_name: string | null;
    event_title: string;
    comments: { id: number; body: string; is_staff: number; created_at: string; user_name: string }[];
    preview_url: string | null;
    original_url: string | null;
    edited_url: string | null;
}
type BulkAction = 'publish' | 'unpublish' | 'approve' | 'reject' | 'unreject' | 'delete' | 'restore' | 'purge' | 'reprocess' | 'deliver';

const FILTERS = ['eventId', 'galleryId', 'status', 'published', 'rejected', 'trash', 'flag', 'category', 'selected', 'albumId'] as const;

export default function AdminPhotos() {
    const { can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const { page, search, filters, setPage, setSearch, setFilter, set } = useListParams(FILTERS);
    const [openId, setOpenId] = useOpenParam();
    const [picked, setPicked] = useState<Set<number>>(new Set());
    const [moving, setMoving] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [tagging, setTagging] = useState(false);
    const [statusing, setStatusing] = useState(false);
    const manage = can('photos.manage');
    const trash = filters.trash === '1';

    const events = useQuery({ queryKey: ['events', 'picker'], queryFn: () => api.get<Paged<EventRow>>('/api/events', { page: 1, pageSize: 100, sort: 'date', order: 'desc' }), staleTime: 60_000 });
    const selectedEvent = events.data?.items.find((e) => String(e.id) === filters.eventId);
    const galleryId = Number(filters.galleryId) || selectedEvent?.gallery_id || null;
    const albums = useQuery({
        queryKey: ['galleries', 'detail', galleryId],
        queryFn: () => api.get<{ albums: { id: number; name: string }[] }>(`/api/galleries/${galleryId}`),
        enabled: !!galleryId && can('galleries.manage'),
    });

    const scoped = !!(filters.eventId || filters.galleryId);
    const q = useQuery({
        queryKey: ['photos', 'admin', page, search, filters],
        queryFn: () =>
            api.get<Paged<PhotoRow>>('/api/photos', {
                page,
                pageSize: 60,
                search,
                eventId: filters.eventId,
                galleryId: filters.galleryId,
                albumId: filters.albumId,
                status: filters.status,
                published: filters.published,
                rejected: filters.rejected,
                trash: trash ? 'true' : undefined,
                flag: filters.flag,
                category: filters.category,
                selected: filters.selected ? 'true' : undefined,
            }),
        placeholderData: (p) => p,
        enabled: scoped || manage,
    });

    useEffect(() => setPicked(new Set()), [page, search, filters]);

    const bulk = useMutation({
        mutationFn: (body: { action: BulkAction | 'move' | 'status'; albumId?: number | null; status?: string }) => api.send<{ affected: number }>('POST', '/api/photos/bulk', { ids: [...picked], ...body }),
        onSuccess: (r) => {
            toast.success(r.message);
            setPicked(new Set());
            invalidate(['photos'], ['galleries'], ['events', 'detail']);
        },
        onError: (e) => toast.error(e),
    });
    const runBulk = async (action: BulkAction) => {
        const destructive: Partial<Record<BulkAction, string>> = {
            delete: 'Photos move to the trash and disappear from galleries. You can restore them from the trash.',
            purge: 'Files are permanently deleted from storage. This cannot be undone.',
            reject: 'Rejected photos are hidden from customers.',
        };
        if (destructive[action] && !(await ask({ title: `${titleCase(action)} ${picked.size} photo(s)?`, message: destructive[action]!, confirmLabel: titleCase(action) }))) return;
        bulk.mutate({ action });
    };

    const items = q.data?.items ?? [];
    const allPicked = items.length > 0 && items.every((p) => picked.has(p.id));
    const toggle = (id: number) =>
        setPicked((s) => {
            const n = new Set(s);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });

    const eventOptions = useMemo(() => {
        const list = (events.data?.items ?? []).map((e) => ({ value: e.id, label: `${e.title} (${e.event_code})` }));
        if (filters.eventId && !list.some((o) => String(o.value) === filters.eventId)) list.unshift({ value: Number(filters.eventId), label: `Event #${filters.eventId}` });
        return list;
    }, [events.data, filters.eventId]);

    return (
        <div>
            <PageHeader title="Photos" subtitle="Review, publish, cull and route photos to editing." />
            <Card padded={false}>
                <div className="grid gap-3 border-b border-stone-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Select aria-label="Event" value={filters.eventId} onChange={(e) => set({ eventId: e.target.value, galleryId: null, albumId: null })} placeholder={manage ? 'All events' : 'Choose an event'} options={eventOptions} />
                    <Select aria-label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="Any status" options={PHOTO_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                    <Select
                        aria-label="Visibility"
                        value={filters.published ? `p${filters.published}` : filters.rejected === '1' ? 'rejected' : trash ? 'trash' : ''}
                        onChange={(e) => {
                            const v = e.target.value;
                            set({ published: v === 'p1' ? '1' : v === 'p0' ? '0' : null, rejected: v === 'rejected' ? '1' : null, trash: v === 'trash' ? '1' : null });
                        }}
                        placeholder="Any visibility"
                        options={[
                            { value: 'p1', label: 'Published' },
                            { value: 'p0', label: 'Not published' },
                            { value: 'rejected', label: 'Rejected' },
                            ...(manage ? [{ value: 'trash', label: 'Trash' }] : []),
                        ]}
                    />
                    <SearchInput value={search} onChange={setSearch} placeholder="File name" />
                    <Select aria-label="AI flag" value={filters.flag} onChange={(e) => setFilter('flag', e.target.value)} placeholder="Any AI flag" options={[{ value: 'blurry', label: 'Possibly blurry' }, { value: 'duplicate', label: 'Near duplicate' }, { value: 'eyes_closed', label: 'Eyes closed' }]} />
                    <Select aria-label="Category" value={filters.category} onChange={(e) => setFilter('category', e.target.value)} placeholder="Any category" options={PHOTO_CATEGORIES.map((c) => ({ value: c, label: titleCase(c) }))} />
                    {galleryId && albums.data && (
                        <Select aria-label="Album" value={filters.albumId} onChange={(e) => setFilter('albumId', e.target.value)} placeholder="All albums" options={[{ value: 'none', label: 'Not in an album' }, ...albums.data.albums.map((a) => ({ value: a.id, label: a.name }))]} />
                    )}
                    <label className="flex h-10 items-center gap-2 text-sm">
                        <input type="checkbox" className="size-4 rounded border-stone-300" checked={filters.selected === '1'} onChange={(e) => setFilter('selected', e.target.checked ? '1' : '')} />
                        Customer selected
                    </label>
                </div>

                {manage && items.length > 0 && (
                    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-stone-100 bg-white/95 px-4 py-2 backdrop-blur">
                        <button type="button" className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-700" onClick={() => setPicked(allPicked ? new Set() : new Set(items.map((p) => p.id)))}>
                            {allPicked ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                            {picked.size ? `${picked.size} selected` : 'Select page'}
                        </button>
                        {picked.size > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {trash ? (
                                    <>
                                        <Button size="sm" variant="secondary" icon={<RotateCcw className="size-4" />} loading={bulk.isPending} onClick={() => runBulk('restore')}>
                                            Restore
                                        </Button>
                                        <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} loading={bulk.isPending} onClick={() => runBulk('purge')}>
                                            Delete forever
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button size="sm" variant="secondary" icon={<Eye className="size-4" />} loading={bulk.isPending} onClick={() => runBulk('publish')}>
                                            Publish
                                        </Button>
                                        <Button size="sm" variant="secondary" icon={<EyeOff className="size-4" />} loading={bulk.isPending} onClick={() => runBulk('unpublish')}>
                                            Unpublish
                                        </Button>
                                        <Button size="sm" variant="secondary" icon={<Check className="size-4" />} loading={bulk.isPending} onClick={() => runBulk('approve')}>
                                            Approve
                                        </Button>
                                        {filters.rejected === '1' ? (
                                            <Button size="sm" variant="secondary" loading={bulk.isPending} onClick={() => runBulk('unreject')}>
                                                Un-reject
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="secondary" icon={<X className="size-4" />} loading={bulk.isPending} onClick={() => runBulk('reject')}>
                                                Reject
                                            </Button>
                                        )}
                                        <Button size="sm" variant="secondary" icon={<UserCog className="size-4" />} onClick={() => setAssigning(true)}>
                                            Assign editor
                                        </Button>
                                        {galleryId && albums.data && (
                                            <Button size="sm" variant="secondary" icon={<FolderInput className="size-4" />} onClick={() => setMoving(true)}>
                                                Move
                                            </Button>
                                        )}
                                        <Button size="sm" variant="secondary" icon={<Tag className="size-4" />} onClick={() => setTagging(true)}>
                                            Tags
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setStatusing(true)}>
                                            Set status
                                        </Button>
                                        <Button size="sm" variant="ghost" loading={bulk.isPending} onClick={() => runBulk('reprocess')}>
                                            Reprocess
                                        </Button>
                                        <Button size="sm" variant="ghost" loading={bulk.isPending} onClick={() => runBulk('deliver')}>
                                            Mark delivered
                                        </Button>
                                        <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} loading={bulk.isPending} onClick={() => runBulk('delete')}>
                                            Delete
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {!scoped && !manage ? (
                    <EmptyState title="Choose an event" description="Pick an event to see its photos." />
                ) : (
                    <QueryState query={q} isEmpty={(d) => !d.items.length} empty={<EmptyState icon={<ImageIcon className="size-8" />} title={trash ? 'Trash is empty' : 'No photos match these filters'} />}>
                        {(d) => (
                            <>
                                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                                    {d.items.map((p) => (
                                        <PhotoTile key={p.id} p={p} picked={picked.has(p.id)} selectable={manage} onToggle={() => toggle(p.id)} onOpen={() => setOpenId(p.id)} />
                                    ))}
                                </div>
                                <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                            </>
                        )}
                    </QueryState>
                )}
            </Card>
            <PhotoDrawer id={openId} onClose={() => setOpenId(null)} />
            <MoveModal open={moving} albums={albums.data?.albums ?? []} busy={bulk.isPending} onClose={() => setMoving(false)} onMove={(albumId) => bulk.mutate({ action: 'move', albumId }, { onSuccess: () => setMoving(false) })} />
            <StatusModal open={statusing} busy={bulk.isPending} onClose={() => setStatusing(false)} onSave={(status) => bulk.mutate({ action: 'status', status }, { onSuccess: () => setStatusing(false) })} />
            <AssignEditorModal open={assigning} ids={[...picked]} onClose={() => setAssigning(false)} onDone={() => (setAssigning(false), setPicked(new Set()))} />
            <TagsModal open={tagging} ids={[...picked]} onClose={() => setTagging(false)} onDone={() => (setTagging(false), setPicked(new Set()))} />
            {dialog}
        </div>
    );
}

function PhotoTile({ p, picked, selectable, onToggle, onOpen }: { p: PhotoRow; picked: boolean; selectable: boolean; onToggle: () => void; onOpen: () => void }) {
    const flags = [p.is_blurry ? 'Blurry' : null, p.duplicate_of ? 'Duplicate' : null, p.eyes_closed ? 'Eyes closed' : null].filter(Boolean);
    return (
        <div className={clsx('group relative overflow-hidden rounded-lg border bg-stone-50', picked ? 'border-brand-600 ring-2 ring-brand-500' : 'border-stone-200')}>
            <button type="button" onClick={onOpen} className="block aspect-square w-full bg-stone-100" aria-label={`Open ${p.file_name}`}>
                {p.thumb_url ? <img src={p.thumb_url} alt="" loading="lazy" className={clsx('size-full object-cover', p.is_rejected && 'opacity-40 grayscale')} /> : <span className="flex size-full items-center justify-center text-xs text-stone-400">{p.processing_error ? 'Failed' : 'Processing…'}</span>}
            </button>
            {selectable && (
                <button type="button" onClick={onToggle} aria-label={picked ? 'Deselect' : 'Select'} className={clsx('absolute left-2 top-2 rounded bg-white/90 p-0.5 shadow', !picked && 'opacity-70 group-hover:opacity-100')}>
                    {picked ? <CheckSquare className="size-5 text-brand-700" /> : <Square className="size-5 text-stone-500" />}
                </button>
            )}
            <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
                {p.is_published ? <span className="rounded bg-emerald-600 px-1.5 text-[10px] font-medium text-white">Live</span> : null}
                {p.is_rejected ? <span className="rounded bg-red-600 px-1.5 text-[10px] font-medium text-white">Rejected</span> : null}
                {p.selected_count > 0 && <span className="rounded bg-sky-600 px-1.5 text-[10px] font-medium text-white">Selected</span>}
                {p.processing_error && <AlertTriangle className="size-4 text-red-600" aria-label="Processing failed" />}
            </div>
            <div className="space-y-0.5 p-2 text-xs">
                <p className="truncate font-medium text-stone-800" title={p.file_name}>
                    #{p.id} · {p.file_name}
                </p>
                <div className="flex items-center justify-between gap-1">
                    <StatusBadge status={p.status} className="!text-[10px]" />
                    {flags.length > 0 && <span className="truncate text-amber-700">{flags.join(', ')}</span>}
                </div>
            </div>
        </div>
    );
}

function PhotoDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
    const { can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const q = useQuery({ queryKey: ['photos', 'detail', id], queryFn: () => api.get<PhotoDetail>(`/api/photos/${id}`), enabled: !!id });
    const retry = useMutation({
        mutationFn: () => api.send('POST', `/api/photos/${id}/retry`),
        onSuccess: (r) => (toast.success(r.message), invalidate(['photos'])),
        onError: (e) => toast.error(e),
    });
    const cover = useMutation({
        mutationFn: (galleryId: number) => api.send('PUT', `/api/galleries/${galleryId}/cover`, { photoId: id }),
        onSuccess: (r) => (toast.success(r.message), invalidate(['galleries'])),
        onError: (e) => toast.error(e),
    });
    return (
        <Drawer open={!!id} onClose={onClose} title={q.data ? `Photo #${q.data.id}` : 'Photo'} width="max-w-2xl">
            <QueryState query={q}>
                {(p) => {
                    const tags = parseJson<string[]>(p.tags, []);
                    return (
                        <div className="space-y-5">
                            <div className="flex items-center justify-center overflow-hidden rounded-lg bg-stone-900">
                                {p.preview_url ? <img src={p.preview_url} alt={p.file_name} className="max-h-[50vh] object-contain" /> : <p className="p-10 text-sm text-stone-400">No preview yet</p>}
                            </div>
                            {p.processing_error && (
                                <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                    <span>{p.processing_error}</span>
                                    {can('photos.upload', 'photos.manage') && (
                                        <Button size="sm" variant="secondary" loading={retry.isPending} onClick={() => retry.mutate()}>
                                            Retry
                                        </Button>
                                    )}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {p.original_url && (
                                    <a href={p.original_url} className="inline-flex h-8 items-center rounded-lg border border-stone-300 px-3 text-sm font-medium hover:bg-stone-50" target="_blank" rel="noreferrer">
                                        Original
                                    </a>
                                )}
                                {p.edited_url && (
                                    <a href={p.edited_url} className="inline-flex h-8 items-center rounded-lg border border-stone-300 px-3 text-sm font-medium hover:bg-stone-50" target="_blank" rel="noreferrer">
                                        Edited version
                                    </a>
                                )}
                                {can('galleries.manage') && p.is_published === 1 && (
                                    <Button size="sm" variant="secondary" loading={cover.isPending} onClick={() => cover.mutate(p.gallery_id)}>
                                        Use as gallery cover
                                    </Button>
                                )}
                            </div>
                            <KeyValue
                                items={[
                                    ['File', p.file_name],
                                    ['Event', p.event_title],
                                    ['Status', <StatusBadge key="s" status={p.status} />],
                                    ['Visibility', p.deleted_at ? 'In trash' : p.is_rejected ? 'Rejected' : p.is_published ? 'Published' : 'Hidden'],
                                    ['Size', `${p.width ?? '?'} × ${p.height ?? '?'} · ${bytes(p.size_bytes)}`],
                                    ['Uploaded', `${dateTime(p.created_at)}${p.uploaded_by_name ? ` by ${p.uploaded_by_name}` : ''}`],
                                    ['Camera', [p.camera_label, p.camera_make, p.camera_model].filter(Boolean).join(' · ') || null],
                                    ['Exposure', [p.focal_length, p.aperture, p.exposure, p.iso ? `ISO ${p.iso}` : null].filter(Boolean).join(' · ') || null],
                                    ['Taken', p.taken_at ? dateTime(p.taken_at) : null],
                                    ['Editor', p.editor_name],
                                    ['AI', [p.is_blurry ? `Possibly blurry (score ${Number(p.blur_score).toFixed(0)})` : null, p.duplicate_of ? `Near duplicate of #${p.duplicate_of}` : null, p.eyes_closed ? 'Eyes closed' : null, p.faces_count ? `${p.faces_count} face(s)` : null, p.category ? titleCase(p.category) : null].filter(Boolean).join(' · ') || null],
                                    ['Tags', tags.length ? tags.join(', ') : null],
                                ]}
                            />
                            {p.comments.length > 0 && (
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold">Comments</h3>
                                    <ul className="space-y-2">
                                        {p.comments.map((c) => (
                                            <li key={c.id} className="rounded-lg bg-stone-50 p-3 text-sm">
                                                <p className="text-xs text-stone-500">
                                                    {c.user_name}
                                                    {c.is_staff ? ' (studio)' : ''} · {relative(c.created_at)}
                                                </p>
                                                <p className="mt-0.5 whitespace-pre-wrap">{c.body}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                }}
            </QueryState>
        </Drawer>
    );
}

function MoveModal({ open, albums, busy, onClose, onMove }: { open: boolean; albums: { id: number; name: string }[]; busy: boolean; onClose: () => void; onMove: (albumId: number | null) => void }) {
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    useEffect(() => {
        if (open) (setValue(''), setError(''));
    }, [open]);
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Move to album"
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={busy} onClick={() => (value ? onMove(value === 'none' ? null : Number(value)) : setError('Choose a destination'))}>
                        Move
                    </Button>
                </>
            }
        >
            <Select label="Destination" required value={value} onChange={(e) => (setValue(e.target.value), setError(''))} placeholder="Choose…" options={[{ value: 'none', label: 'Main gallery (no album)' }, ...albums.map((a) => ({ value: a.id, label: a.name }))]} error={error} />
        </Modal>
    );
}

function StatusModal({ open, busy, onClose, onSave }: { open: boolean; busy: boolean; onClose: () => void; onSave: (status: string) => void }) {
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    useEffect(() => {
        if (open) (setValue(''), setError(''));
    }, [open]);
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Set workflow status"
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={busy} onClick={() => (value ? onSave(value) : setError('Choose a status'))}>
                        Save
                    </Button>
                </>
            }
        >
            <Select label="Status" required value={value} onChange={(e) => (setValue(e.target.value), setError(''))} placeholder="Choose…" options={PHOTO_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} error={error} />
        </Modal>
    );
}

function AssignEditorModal({ open, ids, onClose, onDone }: { open: boolean; ids: number[]; onClose: () => void; onDone: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [editorId, setEditorId] = useState('');
    const [error, setError] = useState('');
    const editors = useQuery({ queryKey: ['users', 'assignable', 'EDITOR_DESIGNER'], queryFn: () => api.get<{ id: number; name: string }[]>('/api/users/assignable', { role: 'EDITOR_DESIGNER' }), enabled: open });
    useEffect(() => {
        if (open) (setEditorId(''), setError(''));
    }, [open]);
    const save = useMutation({
        mutationFn: () => api.send('POST', '/api/photos/assign-editor', { ids, editorId: Number(editorId) }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['photos'], ['events', 'detail']);
            onDone();
        },
        onError: (e) => toast.error(e),
    });
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Assign ${ids.length} photo(s) for editing`}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={save.isPending} onClick={() => (editorId ? save.mutate() : setError('Choose an editor'))}>
                        Assign
                    </Button>
                </>
            }
        >
            <Select
                label="Editor"
                required
                value={editorId}
                onChange={(e) => (setEditorId(e.target.value), setError(''))}
                placeholder={editors.isLoading ? 'Loading…' : editors.data?.length ? 'Choose…' : 'No active editors'}
                options={(editors.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
                error={error}
                hint="Photos move to Editing and the editor is notified."
            />
        </Modal>
    );
}

function TagsModal({ open, ids, onClose, onDone }: { open: boolean; ids: number[]; onClose: () => void; onDone: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [tags, setTags] = useState('');
    const [category, setCategory] = useState('keep');
    const [error, setError] = useState('');
    useEffect(() => {
        if (open) (setTags(''), setCategory('keep'), setError(''));
    }, [open]);
    const list = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    const save = useMutation({
        mutationFn: () => api.send('PUT', '/api/photos/tags', { ids, tags: list, ...(category === 'keep' ? {} : { category: category === 'none' ? null : category }) }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['photos']);
            onDone();
        },
        onError: (e) => toast.error(e),
    });
    const submit = () => {
        if (list.some((t) => t.length > 40)) return setError('Each tag must be 40 characters or fewer');
        if (list.length > 20) return setError('Up to 20 tags');
        save.mutate();
    };
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Tag ${ids.length} photo(s)`}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={save.isPending} onClick={submit}>
                        Save
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Input label="Tags" value={tags} onChange={(e) => (setTags(e.target.value), setError(''))} placeholder="bride, stage, candid" hint="Comma separated. Replaces existing tags on these photos." error={error} />
                <Select
                    label="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={[{ value: 'keep', label: 'Keep current' }, { value: 'none', label: 'Clear category' }, ...PHOTO_CATEGORIES.map((c) => ({ value: c, label: titleCase(c) }))]}
                    hint="Customers can filter the gallery by category."
                />
            </div>
        </Modal>
    );
}
