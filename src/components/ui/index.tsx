// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'success';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-700/50',
    secondary: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 disabled:text-stone-400',
    ghost: 'text-stone-700 hover:bg-stone-100 disabled:text-stone-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
    dark: 'bg-ink-900 text-white hover:bg-ink-800 disabled:bg-ink-900/50',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/50',
};
const sizes: Record<Size, string> = {
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
    clsx('inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed', variants[variant], sizes[size], className);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest }, ref) {
    return (
        <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
            {children}
        </button>
    );
});

export function IconButton({ label, icon, tone, className, ...rest }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { label: string; icon: ReactNode; tone?: 'danger' }) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            className={clsx('rounded-md p-1.5 transition-colors disabled:opacity-40', tone === 'danger' ? 'text-stone-400 hover:bg-red-50 hover:text-red-600' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900', className)}
            {...rest}
        >
            {icon}
        </button>
    );
}

export function ButtonLink({ variant = 'primary', size = 'md', className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
    return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function Card({ className, children, title, actions, padded = true }: { className?: string; children: ReactNode; title?: ReactNode; actions?: ReactNode; padded?: boolean }) {
    return (
        <section className={clsx('card', className)}>
            {(title || actions) && (
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3 sm:px-5">
                    {typeof title === 'string' ? <h2 className="font-semibold text-stone-900">{title}</h2> : title}
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </header>
            )}
            <div className={clsx(padded && 'p-4 sm:p-5')}>{children}</div>
        </section>
    );
}

export function PageHeader({ title: _title, subtitle: _subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            {back && <div>{back}</div>}
            <div className="flex-1" />
            {actions && <div className="flex flex-wrap items-center gap-2" data-page-actions>{actions}</div>}
        </div>
    );
}

export function Spinner({ className }: { className?: string }) {
    return <Loader2 className={clsx('animate-spin text-brand-700', className ?? 'size-6')} aria-label="Loading" />;
}

export function Avatar({ name, className }: { name: string | null | undefined; className?: string }) {
    const initials = (name ?? '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('');
    return <span className={clsx('inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800', className)}>{initials || '?'}</span>;
}

export function Tabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
    return (
        <div role="tablist" className={clsx('scrollbar-thin -mx-1 flex gap-1 overflow-x-auto border-b border-stone-200 px-1', className)}>
            {tabs.map((t) => (
                <button
                    key={t.value}
                    role="tab"
                    type="button"
                    aria-selected={value === t.value}
                    onClick={() => onChange(t.value)}
                    className={clsx(
                        '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                        value === t.value ? 'border-brand-700 text-brand-800' : 'border-transparent text-stone-500 hover:text-stone-800',
                    )}
                >
                    {t.label}
                    {t.count !== undefined && <span className="rounded-full bg-stone-100 px-1.5 text-xs text-stone-600">{t.count}</span>}
                </button>
            ))}
        </div>
    );
}

export function KeyValue({ items, className }: { items: [ReactNode, ReactNode][]; className?: string }) {
    return (
        <dl className={clsx('grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
            {items.map(([k, v], i) => (
                <div key={i} className="min-w-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{k}</dt>
                    <dd className="mt-0.5 break-words text-sm text-stone-900">{v ?? '—'}</dd>
                </div>
            ))}
        </dl>
    );
}

export function Alert({ tone = 'info', title, children, className }: { tone?: 'info' | 'warning' | 'error' | 'success'; title?: ReactNode; children?: ReactNode; className?: string }) {
    const tones = {
        info: 'border-sky-200 bg-sky-50 text-sky-900',
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
        error: 'border-red-200 bg-red-50 text-red-900',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    };
    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={clsx('rounded-lg border px-4 py-3 text-sm', tones[tone], className)}>
            {title && <p className="font-semibold">{title}</p>}
            {children && <div className={clsx(title && 'mt-1')}>{children}</div>}
        </div>
    );
}
