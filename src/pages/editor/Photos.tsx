import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Download, Image as ImageIcon, MessageSquare, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { EmptyState, Pagination, QueryState, SearchInput, StatusBadge } from '../../components/data';
import { Select } from '../../components/form';
import { Drawer } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Alert, Button, Card, KeyValue, PageHeader } from '../../components/ui';
import { api, uploadWithProgress, type Paged } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useEditorQueue } from '../../lib/editor';
import { bytes, date, dateTime, parseJson, relative, titleCase } from '../../lib/format';
import { useInvalidate, useListParams, useOpenParam } from '../../lib/hooks';
import { MAX_FILE_BYTES } from '../../lib/uploadQueue';

interface PhotoRow {
    id: number;
    event_id: number;
    file_name: string;
    status: string;
    camera_label: string | null;
    has_edit: number;
    comment_count: number;
    selected_count: number;
    thumb_url: string | null;
    created_at: string;
}
interface PhotoDetail {
    id: number;
    file_name: string;
    status: string;
    width: number | null;
    height: number | null;
    size_bytes: number;
    camera_label: string | null;
    camera_make: string | null;
    camera_model: string | null;
    taken_at: string | null;
    category: string | null;
    tags: string | string[] | null;
    event_title: string;
    uploaded_by_name: string | null;
    comments: { id: number; body: string; is_staff: number; created_at: string; user_name: string }[];
    preview_url: string | null;
    original_url: string | null;
    edited_url: string | null;
}

const FILTERS = ['eventId', 'status'] as const;
const EDIT_STATUSES = ['EDITING', 'EDITED', 'APPROVED', 'DELIVERED'];
const EDIT_ACCEPT = /^image\/(jpeg|png|webp|tiff)$/;

export default function EditorPhotos() {
    const { user } = useAuth();
    const { page, search, filters, setPage, setSearch, setFilter } = useListParams(FILTERS);
    const [openId, setOpenId] = useOpenParam();
    const queue = useEditorQueue();
    const query = { page, pageSize: 48, editorId: user?.id, eventId: filters.eventId || undefined, status: filters.status || undefined, search: search || undefined };
    const q = useQuery({ queryKey: ['photos', 'editor', query], queryFn: () => api.get<Paged<PhotoRow>>('/api/photos', query), placeholderData: (prev) => prev, enabled: !!user });

    return (
        <div>
            <PageHeader title="Photos to edit" subtitle="Download the original, retouch it, then upload the edited version. Previews are regenerated automatically." />
            <Card className="mb-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Select
                        label="Event"
                        value={filters.eventId}
                        onChange={(e) => setFilter('eventId', e.target.value)}
                        placeholder="All events"
                        options={(queue.data ?? []).map((r) => ({ value: String(r.event_id), label: `${r.event_title} · ${date(r.event_date)}` }))}
                    />
                    <Select label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="All statuses" options={EDIT_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                    <div className="flex items-end">
                        <SearchInput value={search} onChange={setSearch} placeholder="File name…" className="w-full" />
                    </div>
                </div>
            </Card>
            <QueryState query={q}>
                {(data) =>
                    data.items.length === 0 ? (
                        <Card>
                            <EmptyState icon={<ImageIcon className="size-10" />} title="No photos found" description={filters.status || filters.eventId || search ? 'Try clearing the filters.' : 'Photos assigned to you for editing appear here.'} />
                        </Card>
                    ) : (
                        <>
                            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                                {data.items.map((p) => (
                                    <li key={p.id}>
                                        <button type="button" onClick={() => setOpenId(p.id)} className={clsx('group block w-full overflow-hidden rounded-lg border bg-white text-left transition hover:shadow-md', openId === p.id ? 'border-brand-500 ring-2 ring-brand-200' : 'border-stone-200')}>
                                            <div className="relative aspect-square bg-stone-100">
                                                {p.thumb_url ? <img src={p.thumb_url} alt={p.file_name} loading="lazy" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-xs text-stone-400">Processing…</span>}
                                                <StatusBadge status={p.status} className="absolute left-1.5 top-1.5" />
                                                {Number(p.comment_count) > 0 && (
                                                    <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                                                        <MessageSquare className="size-3" /> {p.comment_count}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate px-2 py-1.5 text-xs text-stone-600">{p.file_name}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4">
                                <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
                            </div>
                        </>
                    )
                }
            </QueryState>
            <EditDrawer id={openId} onClose={() => setOpenId(null)} />
        </div>
    );
}

function EditDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const input = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [fileError, setFileError] = useState('');
    const q = useQuery({ queryKey: ['photos', 'detail', id], queryFn: () => api.get<PhotoDetail>(`/api/photos/${id}`), enabled: !!id });

    const upload = async (file: File) => {
        setFileError('');
        if (!EDIT_ACCEPT.test(file.type)) return setFileError('Upload the edit as JPEG, PNG, WebP or TIFF.');
        if (file.size > MAX_FILE_BYTES) return setFileError(`The file is larger than ${bytes(MAX_FILE_BYTES)}.`);
        const fd = new FormData();
        fd.append('file', file, file.name);
        setProgress(0);
        try {
            await uploadWithProgress(`/api/photos/${id}/edited`, fd, setProgress);
            toast.success('Edited photo uploaded');
            await invalidate(['photos']);
        } catch (e) {
            toast.error(e);
        } finally {
            setProgress(null);
        }
    };

    return (
        <Drawer open={!!id} onClose={onClose} title={q.data?.file_name ?? 'Photo'} width="max-w-2xl">
            <QueryState query={q}>
                {(p) => {
                    const tags = parseJson<string[]>(p.tags, []);
                    return (
                        <div className="space-y-5">
                            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-stone-900">
                                {p.preview_url ? <img src={p.preview_url} alt={p.file_name} className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-stone-400">Preview not ready yet</span>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {p.original_url && (
                                    <a href={p.original_url} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50" download>
                                        <Download className="size-4" /> Original
                                    </a>
                                )}
                                {p.edited_url && (
                                    <a href={p.edited_url} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50" download>
                                        <Download className="size-4" /> Current edit
                                    </a>
                                )}
                                <Button icon={<Upload className="size-4" />} loading={progress !== null} disabled={p.status === 'APPROVED' || p.status === 'DELIVERED'} onClick={() => input.current?.click()}>
                                    {p.edited_url ? 'Replace edit' : 'Upload edit'}
                                </Button>
                                <input
                                    ref={input}
                                    type="file"
                                    hidden
                                    accept="image/jpeg,image/png,image/webp,image/tiff"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        e.target.value = '';
                                        if (f) void upload(f);
                                    }}
                                />
                            </div>
                            {progress !== null && (
                                <div className="h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                                    <div className="h-full bg-brand-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                                </div>
                            )}
                            {fileError && <Alert tone="error">{fileError}</Alert>}
                            {(p.status === 'APPROVED' || p.status === 'DELIVERED') && <Alert>This photo is {titleCase(p.status).toLowerCase()}. Ask a manager to move it back to editing if it needs more changes.</Alert>}
                            <KeyValue
                                items={[
                                    ['Status', <StatusBadge key="s" status={p.status} />],
                                    ['Event', p.event_title],
                                    ['Size', `${p.width ?? '?'} × ${p.height ?? '?'} · ${bytes(p.size_bytes)}`],
                                    ['Camera', [p.camera_label, [p.camera_make, p.camera_model].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || null],
                                    ['Taken', p.taken_at ? dateTime(p.taken_at) : null],
                                    ['Uploaded by', p.uploaded_by_name],
                                    ['Category', p.category ? titleCase(p.category) : null],
                                    ['Tags', tags.length ? tags.join(', ') : null],
                                ]}
                            />
                            <div>
                                <h3 className="mb-2 text-sm font-semibold">Customer notes & comments</h3>
                                {p.comments.length ? (
                                    <ul className="space-y-2">
                                        {p.comments.map((c) => (
                                            <li key={c.id} className={clsx('rounded-lg p-3 text-sm', c.is_staff ? 'bg-stone-50' : 'bg-amber-50')}>
                                                <p className="whitespace-pre-wrap">{c.body}</p>
                                                <p className="mt-1 text-xs text-stone-500">
                                                    {c.user_name}
                                                    {c.is_staff ? ' (studio)' : ''} · {relative(c.created_at)}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-stone-500">No comments on this photo.</p>
                                )}
                            </div>
                        </div>
                    );
                }}
            </QueryState>
        </Drawer>
    );
}
