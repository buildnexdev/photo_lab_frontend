import clsx from 'clsx';
import { CheckCircle2, CircleAlert, CloudOff, Copy, ImagePlus, Loader2, Pause, Play, RotateCw, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { EmptyState, QueryState } from '../../components/data';
import { Input, Select } from '../../components/form';
import { Alert, Button, Card, IconButton, PageHeader } from '../../components/ui';
import { UPLOADABLE, useMyAssignments } from '../../lib/events';
import { bytes, date, num } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';
import { MAX_FILE_BYTES, useUploadQueue, type UploadItem } from '../../lib/uploadQueue';

const SHOWN = 300;
const CAMERA_KEY = 'photolab.cameraLabel';

const STATUS_LABEL: Record<UploadItem['status'], string> = {
    queued: 'Waiting',
    uploading: 'Uploading',
    done: 'Uploaded',
    duplicate: 'Already uploaded',
    failed: 'Failed',
    invalid: 'Skipped',
};

export default function PhotographerUpload() {
    const [params, setParams] = useSearchParams();
    const invalidate = useInvalidate();
    const q = useMyAssignments('upcoming');
    const events = useMemo(() => (q.data ?? []).filter((a) => UPLOADABLE.includes(a.status)), [q.data]);
    const paramId = Number(params.get('event')) || null;
    const eventId = events.some((e) => e.id === paramId) ? paramId : events.length === 1 ? events[0].id : null;
    const assignment = events.find((e) => e.id === eventId) ?? null;
    const [camera, setCamera] = useState(() => localStorage.getItem(CAMERA_KEY) ?? '');
    const [dragging, setDragging] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (assignment?.camera_label) setCamera(assignment.camera_label);
    }, [assignment?.camera_label]);
    useEffect(() => {
        localStorage.setItem(CAMERA_KEY, camera);
    }, [camera]);

    const queue = useUploadQueue({ eventId, cameraLabel: camera, onUploaded: () => invalidate(['events', 'mine'], ['photos', 'upload-status']) });
    const { stats } = queue;
    const pct = stats.bytes ? Math.round((stats.sentBytes / stats.bytes) * 100) : 0;

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (!eventId) return;
        if (e.dataTransfer.files.length) queue.add(e.dataTransfer.files);
    };

    return (
        <div>
            <PageHeader title="Upload photos" subtitle={`Originals are stored privately; guests only see watermarked previews. Up to ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB per photo.`} />
            <QueryState query={q}>
                {() =>
                    events.length === 0 ? (
                        <EmptyState
                            title="No event is open for uploads"
                            description="Uploads open when one of your events is live, uploading or processing. Start the shoot from the event page."
                            action={
                                <Link to="/photographer/events" className="text-sm font-medium text-brand-700 hover:underline">
                                    Go to my events
                                </Link>
                            }
                        />
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-3">
                            <div className="space-y-6 lg:col-span-2">
                                <Card>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Select
                                            label="Event"
                                            required
                                            value={eventId ?? ''}
                                            disabled={queue.active}
                                            hint={queue.active ? 'Finish or clear the current queue to switch events.' : undefined}
                                            placeholder="Choose an event"
                                            onChange={(e) => setParams(e.target.value ? { event: e.target.value } : {}, { replace: true })}
                                            options={events.map((ev) => ({ value: String(ev.id), label: `${ev.title} · ${date(ev.event_date)}` }))}
                                        />
                                        <Input label="Camera label" value={camera} maxLength={40} onChange={(e) => setCamera(e.target.value)} placeholder="e.g. Cam A" hint="Helps the editor sort photos by camera." />
                                    </div>
                                </Card>

                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        if (eventId) setDragging(true);
                                    }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={onDrop}
                                    className={clsx(
                                        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition',
                                        !eventId ? 'border-stone-200 bg-stone-50 text-stone-400' : dragging ? 'border-brand-500 bg-brand-50' : 'border-stone-300 bg-white',
                                    )}
                                >
                                    <ImagePlus className="mb-3 size-10 text-stone-400" />
                                    <p className="font-medium">{eventId ? 'Drag photos here' : 'Choose an event first'}</p>
                                    <p className="mt-1 text-sm text-stone-500">JPEG, PNG, WebP, HEIC or TIFF</p>
                                    <Button className="mt-4" disabled={!eventId} onClick={() => input.current?.click()}>
                                        Select photos
                                    </Button>
                                    <input
                                        ref={input}
                                        type="file"
                                        multiple
                                        hidden
                                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,.heic,.heif,.tif,.tiff"
                                        onChange={(e) => {
                                            if (e.target.files?.length) queue.add(e.target.files);
                                            e.target.value = '';
                                        }}
                                    />
                                </div>

                                {!queue.online && (
                                    <Alert tone="warning" title="You are offline">
                                        <span className="inline-flex items-center gap-1.5">
                                            <CloudOff className="size-4" /> Uploads are paused and will resume automatically when the connection returns. Keep this tab open.
                                        </span>
                                    </Alert>
                                )}
                                {queue.blocked && (
                                    <Alert tone="error" title="Uploads stopped">
                                        <p>{queue.blocked}</p>
                                        <Button className="mt-2" size="sm" variant="secondary" onClick={queue.resume}>
                                            Try again
                                        </Button>
                                    </Alert>
                                )}

                                {stats.total > 0 && (
                                    <Card
                                        title={`Queue (${num(stats.total)})`}
                                        padded={false}
                                        actions={
                                            <div className="flex flex-wrap gap-2">
                                                {stats.failed > 0 && (
                                                    <Button size="sm" variant="secondary" icon={<RotateCw className="size-4" />} onClick={() => queue.retry()}>
                                                        Retry failed
                                                    </Button>
                                                )}
                                                {stats.done + stats.duplicate + stats.invalid > 0 && (
                                                    <Button size="sm" variant="ghost" onClick={queue.clearFinished}>
                                                        Clear finished
                                                    </Button>
                                                )}
                                            </div>
                                        }
                                    >
                                        <ul className="max-h-[32rem] divide-y divide-stone-100 overflow-y-auto">
                                            {queue.items.slice(0, SHOWN).map((i) => (
                                                <QueueRow key={i.id} item={i} onRetry={() => queue.retry(i.id)} onRemove={() => queue.remove(i.id)} />
                                            ))}
                                        </ul>
                                        {queue.items.length > SHOWN && <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">and {num(queue.items.length - SHOWN)} more…</p>}
                                    </Card>
                                )}
                            </div>

                            <div className="space-y-6">
                                <Card title="Progress">
                                    {stats.total ? (
                                        <div className="space-y-4">
                                            <div>
                                                <div className="mb-1 flex justify-between text-sm">
                                                    <span>{pct}%</span>
                                                    <span className="text-stone-500">
                                                        {bytes(stats.sentBytes)} / {bytes(stats.bytes)}
                                                    </span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                                                    <div className="h-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                            <dl className="grid grid-cols-2 gap-2 text-sm">
                                                <Stat label="Uploaded" value={stats.done} />
                                                <Stat label="Duplicates" value={stats.duplicate} />
                                                <Stat label="Waiting" value={stats.queued + stats.uploading} />
                                                <Stat label="Failed" value={stats.failed} danger />
                                                {stats.invalid > 0 && <Stat label="Skipped" value={stats.invalid} danger />}
                                            </dl>
                                            {queue.active &&
                                                (queue.paused ? (
                                                    <Button className="w-full" icon={<Play className="size-4" />} onClick={queue.resume}>
                                                        Resume uploads
                                                    </Button>
                                                ) : (
                                                    <Button className="w-full" variant="secondary" icon={<Pause className="size-4" />} onClick={() => queue.setPaused(true)}>
                                                        Pause after current batch
                                                    </Button>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-stone-500">Add photos to start uploading. Each photo is uploaded once, even if you retry.</p>
                                    )}
                                </Card>
                                {assignment && (
                                    <Card title="Event">
                                        <p className="font-medium">{assignment.title}</p>
                                        <p className="text-sm text-stone-500">
                                            {assignment.customer_name} · {num(assignment.my_uploads)} by me · {num(assignment.photo_count)} total
                                        </p>
                                        <Link to={`/photographer/event/${assignment.id}`} className="mt-2 inline-block text-sm text-brand-700 hover:underline">
                                            Live QR & processing status
                                        </Link>
                                    </Card>
                                )}
                                <Alert>For large shoots on site, the BuildNexDev mobile app keeps an offline queue that survives closing the app.</Alert>
                            </div>
                        </div>
                    )
                }
            </QueryState>
        </div>
    );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
    return (
        <div className="rounded-lg bg-stone-50 px-3 py-2">
            <dt className="text-xs text-stone-500">{label}</dt>
            <dd className={clsx('font-semibold', danger && value > 0 && 'text-rose-700')}>{num(value)}</dd>
        </div>
    );
}

function QueueRow({ item, onRetry, onRemove }: { item: UploadItem; onRetry: () => void; onRemove: () => void }) {
    const icon =
        item.status === 'done' ? <CheckCircle2 className="size-4 text-emerald-600" /> :
        item.status === 'duplicate' ? <Copy className="size-4 text-stone-400" /> :
        item.status === 'uploading' ? <Loader2 className="size-4 animate-spin text-brand-600" /> :
        item.status === 'failed' || item.status === 'invalid' ? <CircleAlert className="size-4 text-rose-600" /> :
        <span className="block size-4 rounded-full border-2 border-stone-300" />;
    return (
        <li className="flex items-center gap-3 px-4 py-2.5">
            <span className="shrink-0">{icon}</span>
            <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{item.file.name}</span>
                    <span className="shrink-0 text-xs text-stone-500">{bytes(item.file.size)}</span>
                </div>
                {item.status === 'uploading' ? (
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full bg-brand-500 transition-all" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                    </div>
                ) : (
                    <p className={clsx('text-xs', item.status === 'failed' || item.status === 'invalid' ? 'text-rose-700' : 'text-stone-500')}>
                        {STATUS_LABEL[item.status]}
                        {item.error ? ` · ${item.error}` : ''}
                        {item.status === 'queued' && item.retryAt ? ` · retry ${item.attempts}` : ''}
                    </p>
                )}
            </div>
            {item.status === 'failed' && <IconButton label="Retry" icon={<RotateCw className="size-4" />} onClick={onRetry} />}
            {item.status !== 'uploading' && <IconButton label="Remove" icon={item.status === 'queued' ? <X className="size-4" /> : <Trash2 className="size-4" />} onClick={onRemove} />}
        </li>
    );
}
