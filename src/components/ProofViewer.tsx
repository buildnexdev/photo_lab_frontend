// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProofDetail } from '../lib/types';

/** Page-by-page album proof viewer with a thumbnail strip. */
export function ProofViewer({ pages }: { pages: ProofDetail['pages'] }) {
    const [i, setI] = useState(0);
    useEffect(() => setI(0), [pages]);
    const page = pages[i];
    if (!page) return <p className="text-sm text-stone-500">This proof has no pages.</p>;
    return (
        <div className="space-y-3" onContextMenu={(e) => e.preventDefault()}>
            <div className="relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-lg bg-stone-900">
                <img src={page.url} alt={`Page ${page.index}`} draggable={false} className="protected-img max-h-full max-w-full object-contain" />
                {i > 0 && (
                    <button type="button" onClick={() => setI(i - 1)} className="absolute left-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70" aria-label="Previous page">
                        <ChevronLeft className="size-5" />
                    </button>
                )}
                {i < pages.length - 1 && (
                    <button type="button" onClick={() => setI(i + 1)} className="absolute right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70" aria-label="Next page">
                        <ChevronRight className="size-5" />
                    </button>
                )}
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                    Page {page.index} / {pages.length}
                </span>
            </div>
            <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
                {pages.map((p, j) => (
                    <button key={p.index} type="button" onClick={() => setI(j)} className={clsx('relative h-14 w-20 shrink-0 overflow-hidden rounded border-2', j === i ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100')}>
                        <img src={p.url} alt="" loading="lazy" draggable={false} className="protected-img size-full object-cover" />
                        <span className="absolute bottom-0 right-0 bg-black/60 px-1 text-[10px] text-white">{p.index}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
