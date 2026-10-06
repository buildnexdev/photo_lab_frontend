// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import clsx from 'clsx';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { errorMessage } from '../lib/api';

type Tone = 'success' | 'error' | 'info' | 'warning';
interface Toast {
    id: number;
    tone: Tone;
    message: string;
}

interface ToastApi {
    success: (message: string) => void;
    error: (errOrMessage: unknown) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
    const push = useCallback(
        (tone: Tone, message: string) => {
            const id = ++seq;
            setToasts((t) => [...t.slice(-3), { id, tone, message }]);
            setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000);
        },
        [dismiss],
    );
    const api = useMemo<ToastApi>(
        () => ({
            success: (m) => push('success', m),
            error: (e) => push('error', typeof e === 'string' ? e : errorMessage(e)),
            info: (m) => push('info', m),
            warning: (m) => push('warning', m),
        }),
        [push],
    );
    const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: TriangleAlert };
    const tones = { success: 'text-emerald-600', error: 'text-red-600', info: 'text-sky-600', warning: 'text-amber-600' };
    return (
        <ToastContext.Provider value={api}>
            {children}
            <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:right-4 sm:top-4 sm:items-end">
                {toasts.map((t) => {
                    const Icon = icons[t.tone];
                    return (
                        <div key={t.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-lg">
                            <Icon className={clsx('mt-0.5 size-5 shrink-0', tones[t.tone])} aria-hidden />
                            <p className="flex-1 text-sm text-stone-800">{t.message}</p>
                            <button type="button" onClick={() => dismiss(t.id)} className="text-stone-400 hover:text-stone-600" aria-label="Dismiss">
                                <X className="size-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastApi {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside ToastProvider');
    return ctx;
}
