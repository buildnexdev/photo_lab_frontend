// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui';

function useLockScroll(open: boolean) {
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);
}

export function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    dismissible = true,
}: {
    open: boolean;
    onClose: () => void;
    title?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    dismissible?: boolean;
}) {
    const panel = useRef<HTMLDivElement>(null);
    useLockScroll(open);
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && dismissible) onClose();
        };
        window.addEventListener('keydown', onKey);
        panel.current?.focus();
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose, dismissible]);
    if (!open) return null;
    const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && dismissible && onClose()}>
            <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" className={clsx('flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl', widths[size])}>
                <div className="flex items-center justify-between gap-4 border-b border-stone-100 px-5 py-4">
                    <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
                    {dismissible && (
                        <button type="button" onClick={onClose} className="rounded-lg p-1 text-stone-500 hover:bg-stone-100" aria-label="Close">
                            <X className="size-5" />
                        </button>
                    )}
                </div>
                <div className="overflow-y-auto px-5 py-4">{children}</div>
                {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 px-5 py-3">{footer}</div>}
            </div>
        </div>,
        document.body,
    );
}

export function Drawer({ open, onClose, title, children, footer, width = 'max-w-xl' }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
    useLockScroll(open);
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <aside role="dialog" aria-modal="true" className={clsx('flex h-full w-full flex-col bg-white shadow-2xl', width)}>
                <div className="flex items-center justify-between gap-4 border-b border-stone-100 px-5 py-4">
                    <div className="min-w-0 text-lg font-semibold text-stone-900">{title}</div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-stone-500 hover:bg-stone-100" aria-label="Close">
                        <X className="size-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
                {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 px-5 py-3">{footer}</div>}
            </aside>
        </div>,
        document.body,
    );
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    tone = 'danger',
    loading,
    children,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    tone?: 'danger' | 'primary';
    loading?: boolean;
    children?: ReactNode;
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant={tone} onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="text-sm text-stone-600">{message}</div>
            {children}
        </Modal>
    );
}

/** Promise-based confirm helper for one-off confirmations inside handlers. */
export function useConfirm() {
    const [state, setState] = useState<{ title: string; message: ReactNode; confirmLabel?: string; tone?: 'danger' | 'primary'; resolve: (v: boolean) => void } | null>(null);
    const ask = (opts: { title: string; message: ReactNode; confirmLabel?: string; tone?: 'danger' | 'primary' }) => new Promise<boolean>((resolve) => setState({ ...opts, resolve }));
    const dialog = state ? (
        <ConfirmDialog
            open
            title={state.title}
            message={state.message}
            confirmLabel={state.confirmLabel}
            tone={state.tone}
            onClose={() => {
                state.resolve(false);
                setState(null);
            }}
            onConfirm={() => {
                state.resolve(true);
                setState(null);
            }}
        />
    ) : null;
    return { ask, dialog };
}
