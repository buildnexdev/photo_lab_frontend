import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, BookImage, ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { EmptyState, QueryState, StatusBadge } from '../../components/data';
import { Input, Select } from '../../components/form';
import { useToast } from '../../components/toast';
import { Alert, Button, Card, IconButton, PageHeader } from '../../components/ui';
import { api, uploadWithProgress, type Paged } from '../../lib/api';
import { bytes, date, relative } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';
import type { EventRow, Proof, ProofDetail } from '../../lib/types';
import { MAX_FILE_BYTES } from '../../lib/uploadQueue';

const MAX_PAGES = 80;
const MAX_TOTAL = 300 * 1024 * 1024;
const PAGE_TYPES = /^image\/(jpeg|png|webp)$/;

interface PageFile {
    key: string;
    file: File;
    preview: string;
}

export default function EditorAlbums() {
    const toast = useToast();
    const navigate = useNavigate();
    const invalidate = useInvalidate();
    const input = useRef<HTMLInputElement>(null);
    const [eventId, setEventId] = useState('');
    const [title, setTitle] = useState('');
    const [pages, setPages] = useState<PageFile[]>([]);
    const [errors, setErrors] = useState<{ eventId?: string; title?: string; files?: string }>({});
    const [progress, setProgress] = useState<number | null>(null);

    const events = useQuery({ queryKey: ['events', 'list', { pageSize: 100 }], queryFn: () => api.get<Paged<EventRow>>('/api/events', { pageSize: 100 }) });
    const proofs = useQuery({ queryKey: ['proofs', 'list', { eventId }], queryFn: () => api.get<Paged<Proof & { customer_name: string }>>('/api/proofs', { eventId: eventId || undefined, pageSize: 12 }) });
    const eventOptions = useMemo(() => (events.data?.items ?? []).filter((e) => e.status !== 'CANCELLED').map((e) => ({ value: String(e.id), label: `${e.title} · ${date(e.event_date)}` })), [events.data]);
    const totalBytes = pages.reduce((s, p) => s + p.file.size, 0);

    const pagesRef = useRef(pages);
    pagesRef.current = pages;
    useEffect(() => () => pagesRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

    const addFiles = (list: FileList) => {
        const rejected: string[] = [];
        const next: PageFile[] = [];
        for (const file of Array.from(list).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
            if (!PAGE_TYPES.test(file.type)) rejected.push(`${file.name}: use JPEG, PNG or WebP`);
            else if (file.size > MAX_FILE_BYTES) rejected.push(`${file.name}: larger than ${bytes(MAX_FILE_BYTES)}`);
            else next.push({ key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, preview: URL.createObjectURL(file) });
        }
        const room = Math.max(0, MAX_PAGES - pagesRef.current.length);
        if (next.length > room) {
            rejected.push(`Only ${MAX_PAGES} pages per proof; ${next.length - room} file(s) were not added.`);
            next.slice(room).forEach((p) => URL.revokeObjectURL(p.preview));
        }
        setPages((prev) => [...prev, ...next.slice(0, room)]);
        setErrors((e) => ({ ...e, files: rejected.length ? rejected.slice(0, 5).join(' · ') : undefined }));
    };
    const move = (i: number, d: -1 | 1) =>
        setPages((prev) => {
            const next = [...prev];
            [next[i], next[i + d]] = [next[i + d], next[i]];
            return next;
        });
    const removePage = (key: string) =>
        setPages((prev) => {
            const p = prev.find((x) => x.key === key);
            if (p) URL.revokeObjectURL(p.preview);
            return prev.filter((x) => x.key !== key);
        });

    const submit = async () => {
        const errs: typeof errors = {};
        if (!eventId) errs.eventId = 'Choose the event';
        if (title.trim().length < 2) errs.title = 'Enter a title (at least 2 characters)';
        else if (title.trim().length > 160) errs.title = 'Keep the title under 160 characters';
        if (!pages.length) errs.files = 'Add the album pages (spreads)';
        else if (totalBytes > MAX_TOTAL) errs.files = `Total size is ${bytes(totalBytes)}; keep a proof under ${bytes(MAX_TOTAL)} (export pages at screen resolution).`;
        setErrors(errs);
        if (Object.keys(errs).length) return;
        const fd = new FormData();
        fd.append('eventId', eventId);
        fd.append('title', title.trim());
        pages.forEach((p) => fd.append('files', p.file, p.file.name));
        setProgress(0);
        try {
            const proof = await uploadWithProgress<ProofDetail>('/api/proofs', fd, setProgress);
            toast.success(`Proof v${proof.version} uploaded as a draft`);
            pages.forEach((p) => URL.revokeObjectURL(p.preview));
            setPages([]);
            setTitle('');
            await invalidate(['proofs']);
            navigate(`/editor/proofs?open=${proof.id}`);
        } catch (e) {
            toast.error(e);
        } finally {
            setProgress(null);
        }
    };

    return (
        <div>
            <PageHeader title="Album design" subtitle="Upload album spreads as a proof. Proofs stay as drafts until you send them to the customer from Proofs & revisions." />
            <div className="grid gap-6 xl:grid-cols-3">
                <Card title="New proof" className="xl:col-span-2">
                    <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Select label="Event" required value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder={events.isLoading ? 'Loading…' : 'Choose an event'} options={eventOptions} error={errors.eventId} />
                            <Input label="Title" required value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wedding album – 30 spreads" error={errors.title} />
                        </div>
                        <div className="rounded-xl border-2 border-dashed border-stone-300 p-5 text-center">
                            <ImagePlus className="mx-auto mb-2 size-8 text-stone-400" />
                            <p className="text-sm text-stone-600">Pages are ordered by file name (01, 02, …). Use the arrows to reorder.</p>
                            <Button className="mt-3" variant="secondary" onClick={() => input.current?.click()} disabled={progress !== null}>
                                Add pages
                            </Button>
                            <input
                                ref={input}
                                type="file"
                                multiple
                                hidden
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                    if (e.target.files?.length) addFiles(e.target.files);
                                    e.target.value = '';
                                }}
                            />
                        </div>
                        {errors.files && <Alert tone="error">{errors.files}</Alert>}
                        {pages.length > 0 && (
                            <>
                                <p className="text-sm text-stone-500">
                                    {pages.length} page(s) · {bytes(totalBytes)}
                                </p>
                                <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                    {pages.map((p, i) => (
                                        <li key={p.key} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                                            <div className="relative aspect-[3/2] bg-stone-100">
                                                <img src={p.preview} alt={p.file.name} className="size-full object-cover" />
                                                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white">{i + 1}</span>
                                            </div>
                                            <div className="flex items-center gap-1 px-1.5 py-1">
                                                <span className="min-w-0 flex-1 truncate text-xs text-stone-600" title={p.file.name}>
                                                    {p.file.name}
                                                </span>
                                                <IconButton label="Move earlier" icon={<ArrowUp className="size-3.5" />} disabled={i === 0} onClick={() => move(i, -1)} />
                                                <IconButton label="Move later" icon={<ArrowDown className="size-3.5" />} disabled={i === pages.length - 1} onClick={() => move(i, 1)} />
                                                <IconButton label="Remove page" tone="danger" icon={<X className="size-3.5" />} onClick={() => removePage(p.key)} />
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </>
                        )}
                        {progress !== null && (
                            <div className="h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                                <div className="h-full bg-brand-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                            </div>
                        )}
                        <div className="flex justify-end">
                            <Button onClick={submit} loading={progress !== null}>
                                Upload proof
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card
                    title={eventId ? 'Proofs for this event' : 'Recent proofs'}
                    padded={false}
                    actions={
                        <Link to="/editor/proofs" className="text-sm text-brand-700 hover:underline">
                            All proofs
                        </Link>
                    }
                >
                    <QueryState query={proofs}>
                        {(p) =>
                            p.items.length ? (
                                <ul className="divide-y divide-stone-100">
                                    {p.items.map((r) => (
                                        <li key={r.id}>
                                            <Link to={`/editor/proofs?open=${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                                                <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-stone-100">
                                                    {r.cover_url ? <img src={r.cover_url} alt="" className="size-full object-cover" /> : <BookImage className="size-5 text-stone-400" />}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium">
                                                        {r.title} v{r.version}
                                                    </span>
                                                    <span className="block truncate text-xs text-stone-500">
                                                        {r.event_title} · {r.page_count} pages · {relative(r.created_at)}
                                                    </span>
                                                </span>
                                                <StatusBadge status={r.status} />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState title="No proofs yet" description="Uploaded proofs appear here." />
                            )
                        }
                    </QueryState>
                </Card>
            </div>
        </div>
    );
}
