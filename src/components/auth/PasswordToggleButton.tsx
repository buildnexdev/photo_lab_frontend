import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

type Props = {
    visible: boolean;
    onToggle: () => void;
    className?: string;
};

/** Show/hide password control — use onMouseDown preventDefault so the input keeps focus. */
export function PasswordToggleButton({ visible, onToggle, className }: Props) {
    return (
        <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggle}
            className={clsx(
                'absolute inset-y-0 right-2.5 z-20 flex items-center text-slate-400 hover:text-amber-700 cursor-pointer',
                className,
            )}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
        >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
    );
}
