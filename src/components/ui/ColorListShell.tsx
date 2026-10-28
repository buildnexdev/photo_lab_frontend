import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ICON_TONE_TILE, type IconTone } from '../../utils/iconThemes';

/** Shared colourful list page chrome — icon tile + title + toolbar actions. */
export function ColorListShell({
    icon: Icon,
    tone = 'gold',
    title,
    subtitle,
    actions,
    children,
    className,
}: {
    icon: LucideIcon;
    tone?: IconTone;
    title: string;
    subtitle?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={clsx('nq-list-shell', className)}>
            <header className="flex flex-wrap items-center gap-2 border-b border-stone-200/90 bg-gradient-to-b from-[#fffefb] to-white px-3 py-3 sm:gap-3 sm:px-4">
                <div className="mr-0.5 flex min-w-0 items-center gap-2.5">
                    <span className={clsx('nq-icon-tile', ICON_TONE_TILE[tone])} aria-hidden>
                        <Icon className="size-5" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 leading-tight">
                        <p className="truncate font-display text-base font-semibold tracking-tight text-stone-900 sm:text-lg">{title}</p>
                        {subtitle != null && subtitle !== '' ? <p className="truncate text-xs text-stone-500">{subtitle}</p> : null}
                    </div>
                </div>
                {actions ? <div className="ml-auto flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">{actions}</div> : null}
            </header>
            {children}
        </section>
    );
}
