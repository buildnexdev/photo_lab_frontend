import { useQuery } from '@tanstack/react-query';
import { Download, ImageDown } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, QueryState } from '../../components/data';
import { useToast } from '../../components/toast';
import { Button, ButtonLink, Card, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { downloadPhoto } from '../../lib/downloads';
import { useInvalidate } from '../../lib/hooks';

interface DownloadGroup {
    event_id: number;
    event_title: string;
    photos: { id: number; file_name: string; thumb_url: string | null; status: string; allow_download: number; downloads: number }[];
}

export default function CustomerDownloads() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [busy, setBusy] = useState<number | 'all' | null>(null);
    const q = useQuery({ queryKey: ['downloads'], queryFn: () => api.get<DownloadGroup[]>('/api/downloads') });

    const one = async (id: number) => {
        setBusy(id);
        try {
            await downloadPhoto(id);
            void invalidate(['downloads']);
        } catch (e) {
            toast.error(e);
        } finally {
            setBusy(null);
        }
    };
    const all = async (g: DownloadGroup) => {
        setBusy('all');
        const list = g.photos.filter((p) => p.allow_download);
        let failed = 0;
        for (const p of list) {
            try {
                await downloadPhoto(p.id);
                await new Promise((r) => setTimeout(r, 400));
            } catch {
                failed += 1;
            }
        }
        setBusy(null);
        void invalidate(['downloads']);
        if (failed) toast.warning(`${failed} of ${list.length} downloads could not start. Try those again individually.`);
        else toast.success(`Started ${list.length} downloads. Your browser may ask to allow multiple downloads.`);
    };

    return (
        <div>
            <PageHeader title="Downloads" subtitle="Full-resolution files you've purchased or that are included in your package. Links are generated securely for each download." />
            <QueryState query={q} isEmpty={(d) => !d.length} empty={<EmptyState icon={<ImageDown className="size-10" />} title="No HD photos yet" description="Buy photos from your gallery, or they'll appear here when your package includes digital delivery." action={<ButtonLink to="/customer/galleries">Go to galleries</ButtonLink>} />}>
                {(groups) => (
                    <div className="space-y-6">
                        {groups.map((g) => {
                            const allowed = g.photos.some((p) => p.allow_download);
                            return (
                                <Card
                                    key={g.event_id}
                                    title={`${g.event_title} · ${g.photos.length} photos`}
                                    actions={
                                        allowed && g.photos.length > 1 ? (
                                            <Button size="sm" variant="secondary" icon={<Download className="size-4" />} loading={busy === 'all'} disabled={busy !== null} onClick={() => all(g)}>
                                                Download all
                                            </Button>
                                        ) : undefined
                                    }
                                >
                                    {!allowed && <p className="mb-3 text-sm text-amber-700">Downloads for this gallery are paused by the studio. Contact them if you need the files.</p>}
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                                        {g.photos.map((p) => (
                                            <div key={p.id} className="overflow-hidden rounded-lg border border-stone-200">
                                                <div className="aspect-square bg-stone-100">{p.thumb_url && <img src={p.thumb_url} alt="" loading="lazy" draggable={false} className="protected-img size-full object-cover" />}</div>
                                                <div className="p-2">
                                                    <p className="truncate text-xs text-stone-600" title={p.file_name}>
                                                        {p.file_name}
                                                    </p>
                                                    <Button size="sm" variant="secondary" className="mt-1.5 w-full" icon={<Download className="size-3.5" />} disabled={!p.allow_download || busy !== null} loading={busy === p.id} onClick={() => one(p.id)}>
                                                        {p.downloads ? `Again (${p.downloads})` : 'Download'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </QueryState>
        </div>
    );
}
