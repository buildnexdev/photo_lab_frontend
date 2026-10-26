import { useMutation, useQuery } from '@tanstack/react-query';
import { Ban, Download, Eye, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { DataTable, EmptyState, Pagination, QueryState, SearchInput, StatusBadge } from '../../components/ui/Data';
import { Select } from '../../components/ui/Form';
import { Modal, useConfirm } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toast';
import { Button, ButtonLink, Card, IconButton, PageHeader } from '../../components/ui';
import { api, downloadAuthed, type Paged } from '../../services/api';
import { dateTime, num, relative, titleCase } from '../../utils/format';
import { useInvalidate, useListParams } from '../../hooks';

const STATES = ['ACTIVE', 'REVOKED', 'EXPIRED', 'EXHAUSTED'] as const;

interface QrRow {
    id: number;
    gallery_id: number;
    scope: 'EVENT' | 'ALBUM' | 'PHOTO';
    album_id: number | null;
    photo_id: number | null;
    label: string | null;
    token_hint: string;
    expires_at: string | null;
    max_uses: number | null;
    use_count: number;
    last_used_at: string | null;
    created_at: string;
    gallery_title: string;
    event_code: string;
    event_title: string;
    customer_name: string;
    state: string;
}

interface ShownQr {
    title: string;
    url: string;
    qr: string;
    galleryId: number;
    tokenId: number;
}

const SCOPE_TONE: Record<QrRow['scope'], string> = {
    EVENT: 'bg-sky-50 text-sky-700 ring-sky-200',
    ALBUM: 'bg-violet-50 text-violet-700 ring-violet-200',
    PHOTO: 'bg-amber-50 text-amber-800 ring-amber-200',
};

export default function QrManage() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const { page, search, filters, setPage, setSearch, setFilter } = useListParams(['state'] as const);
    const [shown, setShown] = useState<ShownQr | null>(null);
    const q = useQuery({
        queryKey: ['qr-codes', page, search, filters],
        queryFn: () => api.get<Paged<QrRow>>('/api/galleries/qr', { page, pageSize: 25, search, state: filters.state }),
        placeholderData: (p) => p,
    });

    const show = useMutation({
        mutationFn: (row: QrRow) => api.get<{ url: string; qr: string }>(`/api/galleries/${row.gallery_id}/qr/${row.id}`),
        onSuccess: (r, row) => setShown({ title: row.label || `${titleCase(row.scope)} QR`, url: r.url, qr: r.qr, galleryId: row.gallery_id, tokenId: row.id }),
        onError: (e) => toast.error(e),
    });

    const act = useMutation({
        mutationFn: ({ row, path }: { row: QrRow; path: 'revoke' | 'regenerate' }) =>
            api.send<{ id?: number; url?: string; qr?: string }>('POST', `/api/galleries/${row.gallery_id}/qr/${row.id}/${path}`),
        onSuccess: async (r, { row, path }) => {
            toast.success(r.message);
            await invalidate(['qr-codes', 'galleries']);
            if (path === 'regenerate' && r.data?.url && r.data.qr && r.data.id) {
                setShown({ title: row.label || 'New QR code', url: r.data.url, qr: r.data.qr, galleryId: row.gallery_id, tokenId: r.data.id });
            }
        },
        onError: (e) => toast.error(e),
    });

    return (
        <div>
            <PageHeader
                title="Manage QR"
                actions={
                    <ButtonLink to="/admin/qr/create" size="sm" className="inline-flex items-center gap-1.5">
                        <Plus className="size-4" /> Create QR
                    </ButtonLink>
                }
            />
            <Card padded={false}>
                <div className="flex flex-wrap items-end gap-3 border-b border-stone-100 p-4">
                    <SearchInput value={search} onChange={setSearch} placeholder="Gallery, event, customer or code" className="w-full max-w-xs" inputClassName="rounded-full" />
                    <Select
                        wrapperClassName="w-44"
                        aria-label="State"
                        value={filters.state}
                        onChange={(e) => setFilter('state', e.target.value)}
                        placeholder="All states"
                        options={STATES.map((s) => ({ value: s, label: titleCase(s) }))}
                    />
                </div>
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                empty={<EmptyState title="No QR codes yet" description="Create a QR code to share a gallery, album or photo." action={<ButtonLink to="/admin/qr/create">Create QR</ButtonLink>} />}
                                columns={[
                                    {
                                        key: 'code',
                                        header: 'QR code',
                                        cell: (r) => (
                                            <div>
                                                <p className="font-medium text-stone-900">{r.label || `${titleCase(r.scope)} QR`}</p>
                                                <p className="text-xs text-stone-500">
                                                    {r.token_hint}… · {r.scope === 'ALBUM' ? `Album #${r.album_id}` : r.scope === 'PHOTO' ? `Photo #${r.photo_id}` : 'Whole gallery'}
                                                </p>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'gallery',
                                        header: 'Gallery',
                                        cell: (r) => (
                                            <div>
                                                <Link to={`/admin/galleries/${r.gallery_id}`} className="font-medium text-stone-900 hover:text-brand-700" onClick={(e) => e.stopPropagation()}>
                                                    {r.gallery_title}
                                                </Link>
                                                <p className="text-xs text-stone-500">
                                                    {r.event_code} · {r.customer_name}
                                                </p>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'scope',
                                        header: 'Opens',
                                        cell: (r) => <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${SCOPE_TONE[r.scope]}`}>{titleCase(r.scope)}</span>,
                                        hideOnMobile: true,
                                    },
                                    { key: 'uses', header: 'Scans', cell: (r) => `${num(r.use_count)}${r.max_uses ? ` / ${num(r.max_uses)}` : ''}`, hideOnMobile: true },
                                    { key: 'exp', header: 'Expires', cell: (r) => (r.expires_at ? dateTime(r.expires_at) : 'Never'), hideOnMobile: true },
                                    { key: 'last', header: 'Last scan', cell: (r) => (r.last_used_at ? relative(r.last_used_at) : '—'), hideOnMobile: true },
                                    { key: 'state', header: 'State', cell: (r) => <StatusBadge status={r.state} /> },
                                    {
                                        key: 'act',
                                        header: '',
                                        cell: (r) => (
                                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                {r.state === 'ACTIVE' && (
                                                    <>
                                                        <IconButton label="Show QR" onClick={() => show.mutate(r)} icon={<Eye className="size-4" />} />
                                                        <IconButton label="Download PNG" onClick={() => downloadAuthed(`/api/galleries/${r.gallery_id}/qr/${r.id}/png`, `gallery-${r.gallery_id}-qr-${r.id}.png`).catch((e) => toast.error(e))} icon={<Download className="size-4" />} />
                                                        <IconButton
                                                            label="Revoke"
                                                            tone="danger"
                                                            onClick={async () => (await ask({ title: 'Revoke this QR code?', message: 'People using it will lose access.', confirmLabel: 'Revoke' })) && act.mutate({ row: r, path: 'revoke' })}
                                                            icon={<Ban className="size-4" />}
                                                        />
                                                    </>
                                                )}
                                                <IconButton
                                                    label="Regenerate"
                                                    onClick={async () =>
                                                        (await ask({ title: 'Regenerate QR code?', message: 'A new code is issued with the same settings. The old code stops working.', confirmLabel: 'Regenerate', tone: 'primary' })) &&
                                                        act.mutate({ row: r, path: 'regenerate' })
                                                    }
                                                    icon={<RefreshCw className="size-4" />}
                                                />
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
            <Modal
                open={!!shown}
                onClose={() => setShown(null)}
                title={shown?.title ?? 'QR code'}
                size="sm"
                footer={
                    shown && (
                        <>
                            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(shown.url).then(() => toast.success('Link copied'), () => toast.error('Could not copy the link'))}>
                                Copy link
                            </Button>
                            <Button icon={<Download className="size-4" />} onClick={() => downloadAuthed(`/api/galleries/${shown.galleryId}/qr/${shown.tokenId}/png`, `gallery-${shown.galleryId}-qr-${shown.tokenId}.png`).catch((e) => toast.error(e))}>
                                Download PNG
                            </Button>
                        </>
                    )
                }
            >
                {shown && (
                    <div className="text-center">
                        <img src={shown.qr} alt="Gallery QR code" className="mx-auto w-64 max-w-full rounded-lg border border-stone-200" />
                        <p className="mt-3 break-all text-xs text-stone-500">{shown.url}</p>
                    </div>
                )}
            </Modal>
            {dialog}
        </div>
    );
}
