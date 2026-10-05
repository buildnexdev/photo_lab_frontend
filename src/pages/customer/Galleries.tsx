import { useQuery } from '@tanstack/react-query';
import { Images } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState, QueryState, StatusBadge } from '../../components/data';
import { ButtonLink, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { date } from '../../lib/format';

interface CustomerGallery {
    id: number;
    title: string;
    status: string;
    expires_at: string | null;
    event_id: number;
    event_title: string;
    event_date: string;
    event_status: string;
    photo_count: number;
    cover_url: string | null;
}

export default function CustomerGalleries() {
    const q = useQuery({ queryKey: ['portal', 'galleries'], queryFn: () => api.get<CustomerGallery[]>('/api/portal/galleries') });
    return (
        <div>
            <PageHeader title="My galleries" subtitle="View, favourite and select photos, buy HD downloads and order prints." actions={<ButtonLink to="/gallery" variant="secondary">Open a shared QR gallery</ButtonLink>} />
            <QueryState query={q} isEmpty={(d) => !d.length} empty={<EmptyState icon={<Images className="size-10" />} title="No galleries yet" description="Your gallery appears here as soon as the studio shares photos from your event." />}>
                {(rows) => (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {rows.map((g) => (
                            <Link key={g.id} to={`/customer/galleries/${g.id}`} className="card group overflow-hidden">
                                <div className="aspect-[4/3] bg-stone-100">
                                    {g.cover_url ? (
                                        <img src={g.cover_url} alt="" draggable={false} className="protected-img size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    ) : (
                                        <div className="flex size-full items-center justify-center text-stone-300">
                                            <Images className="size-12" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold">{g.title}</p>
                                        <StatusBadge status={g.status} />
                                    </div>
                                    <p className="mt-1 text-sm text-stone-500">
                                        {g.event_title} · {date(g.event_date)}
                                    </p>
                                    <p className="mt-1 text-xs text-stone-500">
                                        {g.photo_count} photos{g.expires_at ? ` · available until ${date(g.expires_at)}` : ''}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </QueryState>
        </div>
    );
}
