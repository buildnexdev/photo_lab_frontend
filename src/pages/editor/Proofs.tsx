// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import { BookImage, CheckCircle2, Plus, Send, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { DataTable, EmptyState, Pagination, QueryState, SearchInput, StatusBadge } from '../../components/data';
import { Select } from '../../components/form';
import { Drawer, useConfirm } from '../../components/overlay';
import { ProofViewer } from '../../components/ProofViewer';
import { useToast } from '../../components/toast';
import { Alert, Button, ButtonLink, Card, KeyValue, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { dateTime, relative, titleCase } from '../../lib/format';
import { useInvalidate, useListParams, useOpenParam, usePaged } from '../../lib/hooks';
import type { Proof, ProofDetail } from '../../lib/types';

const STATUSES = ['DRAFT', 'SENT', 'REVISION_REQUESTED', 'APPROVED'] as const;
type ProofRow = Proof & { customer_name: string };

export default function EditorProofs() {
    const navigate = useNavigate();
    const { page, search, filters, setPage, setSearch, setFilter } = useListParams(['status'] as const);
    const [openId, setOpenId] = useOpenParam();
    const q = usePaged<ProofRow>(['proofs', 'list'], '/api/proofs', { page, pageSize: 20, status: filters.status || undefined, search: search || undefined });

    return (
        <div>
            <PageHeader
                title="Proofs & revisions"
                subtitle="Send album proofs to customers and track their change requests."
                actions={
                    <ButtonLink to="/editor/albums">
                        <Plus className="size-4" /> New proof
                    </ButtonLink>
                }
            />
            <div className="mb-4 flex flex-wrap items-end gap-3">
                <Select wrapperClassName="w-full sm:w-56" label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="All statuses" options={STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
                <SearchInput value={search} onChange={setSearch} placeholder="Event, customer or title…" className="w-full sm:w-72" />
            </div>
            <Card padded={false}>
                <QueryState query={q}>
                    {(data) => (
                        <>
                            <DataTable
                                rows={data.items}
                                rowKey={(r) => r.id}
                                onRowClick={(r) => setOpenId(r.id)}
                                empty={<EmptyState icon={<BookImage className="size-10" />} title="No proofs" description={filters.status || search ? 'Try clearing the filters.' : 'Upload album spreads from Album design.'} action={!filters.status && !search ? <Button size="sm" onClick={() => navigate('/editor/albums')}>Upload a proof</Button> : undefined} />}
                                columns={[
                                    {
                                        key: 'proof',
                                        header: 'Proof',
                                        cell: (r) => (
                                            <span className="flex items-center gap-3">
                                                <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-stone-100">{r.cover_url ? <img src={r.cover_url} alt="" className="size-full object-cover" /> : <BookImage className="size-5 text-stone-400" />}</span>
                                                <span className="min-w-0">
                                                    <span className="block truncate font-medium">
                                                        {r.title} <span className="text-stone-500">v{r.version}</span>
                                                    </span>
                                                    <span className="block truncate text-xs text-stone-500">{r.page_count} pages</span>
                                                </span>
                                            </span>
                                        ),
                                    },
                                    { key: 'event', header: 'Event', cell: (r) => <span>{r.event_title}<span className="block text-xs text-stone-500">{r.customer_name}</span></span>, hideOnMobile: true },
                                    { key: 'rev', header: 'Open revisions', cell: (r) => (Number(r.open_revisions) ? <span className="font-semibold text-rose-700">{r.open_revisions}</span> : '—'), hideOnMobile: true },
                                    { key: 'updated', header: 'Uploaded', cell: (r) => relative(r.created_at), hideOnMobile: true },
                                    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                ]}
                            />
                            <div className="border-t border-stone-100 px-4 py-3">
                                <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
                            </div>
                        </>
                    )}
                </QueryState>
            </Card>
            <ProofDrawer id={openId} onClose={() => setOpenId(null)} />
        </div>
    );
}

function ProofDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const q = useQuery({ queryKey: ['proofs', 'detail', id], queryFn: () => api.get<ProofDetail>(`/api/proofs/${id}`), enabled: !!id });
    const done = (message: string) => {
        toast.success(message);
        invalidate(['proofs']);
    };
    const send = useMutation({ mutationFn: () => api.send('POST', `/api/proofs/${id}/send`), onSuccess: (r) => done(r.message), onError: (e) => toast.error(e) });
    const resolve = useMutation({ mutationFn: (revisionId: number) => api.send('POST', `/api/proofs/revisions/${revisionId}/resolve`), onSuccess: (r) => done(r.message), onError: (e) => toast.error(e) });
    const del = useMutation({
        mutationFn: () => api.send('DELETE', `/api/proofs/${id}`),
        onSuccess: (r) => {
            done(r.message);
            onClose();
        },
        onError: (e) => toast.error(e),
    });

    const p = q.data;
    const openRevisions = p?.revisions.filter((r) => r.status === 'OPEN').length ?? 0;
    return (
        <Drawer
            open={!!id}
            onClose={onClose}
            width="max-w-3xl"
            title={p ? `${p.title} · v${p.version}` : 'Album proof'}
            footer={
                p && (
                    <>
                        {p.status !== 'APPROVED' && (
                            <Button
                                variant="ghost"
                                icon={<Trash2 className="size-4" />}
                                loading={del.isPending}
                                onClick={async () => {
                                    if (await ask({ title: 'Delete this proof?', message: 'The uploaded pages are removed permanently.', confirmLabel: 'Delete' })) del.mutate();
                                }}
                            >
                                Delete
                            </Button>
                        )}
                        {p.status !== 'APPROVED' && (
                            <Button
                                icon={<Send className="size-4" />}
                                loading={send.isPending}
                                onClick={async () => {
                                    const again = p.status === 'SENT' || p.status === 'REVISION_REQUESTED';
                                    if (await ask({ title: again ? 'Send again?' : 'Send to customer?', message: 'The customer is notified and can approve the design or request changes. Open revisions on earlier versions are marked resolved.', confirmLabel: 'Send', tone: 'primary' })) send.mutate();
                                }}
                            >
                                {p.status === 'DRAFT' ? 'Send to customer' : 'Send again'}
                            </Button>
                        )}
                    </>
                )
            }
        >
            <QueryState query={q}>
                {(proof) => (
                    <div className="space-y-5">
                        {proof.status === 'APPROVED' && <Alert tone="success">The customer approved this design{proof.approved_at ? ` on ${dateTime(proof.approved_at)}` : ''}. A print job was created for production.</Alert>}
                        {proof.status === 'REVISION_REQUESTED' && <Alert tone="warning">The customer asked for changes. Upload a new version from Album design, then send it.</Alert>}
                        <ProofViewer pages={proof.pages} />
                        <KeyValue
                            items={[
                                ['Status', <StatusBadge key="s" status={proof.status} />],
                                ['Event', proof.event_title ?? null],
                                ['Pages', String(proof.pages.length)],
                                ['Uploaded', dateTime(proof.created_at)],
                                ['Sent', proof.sent_at ? dateTime(proof.sent_at) : null],
                                ['Customer note', proof.customer_note],
                            ]}
                        />
                        <div>
                            <h3 className="mb-2 text-sm font-semibold">
                                Revision requests {openRevisions ? <span className="text-rose-700">({openRevisions} open)</span> : null}
                            </h3>
                            {proof.revisions.length ? (
                                <ul className="space-y-2">
                                    {proof.revisions.map((r) => (
                                        <li key={r.id} className="rounded-lg border border-stone-200 p-3 text-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="whitespace-pre-wrap">{r.notes}</p>
                                                    <p className="mt-1 text-xs text-stone-500">
                                                        {r.page_refs ? `Pages ${r.page_refs} · ` : ''}
                                                        {r.requested_by_name ?? 'Customer'} · {relative(r.created_at)}
                                                        {r.resolved_at ? ` · resolved ${relative(r.resolved_at)}` : ''}
                                                    </p>
                                                </div>
                                                {r.status === 'OPEN' ? (
                                                    <Button size="sm" variant="secondary" icon={<CheckCircle2 className="size-4" />} loading={resolve.isPending && resolve.variables === r.id} onClick={() => resolve.mutate(r.id)}>
                                                        Resolve
                                                    </Button>
                                                ) : (
                                                    <StatusBadge status={r.status} />
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-stone-500">No change requests for this version.</p>
                            )}
                        </div>
                    </div>
                )}
            </QueryState>
            {dialog}
        </Drawer>
    );
}
