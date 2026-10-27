import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { authFieldIcon, authFieldInput, authFieldLabel } from '../../lib/authTheme';
import { PasswordToggleButton } from './PasswordToggleButton';

export type RegisterFieldProps = {
    label: string;
    icon: LucideIcon;
    error?: string;
    placeholder?: string;
    inputType?: InputHTMLAttributes<HTMLInputElement>['type'];
    autoComplete?: string;
    className?: string;
    delay?: 1 | 2 | 3 | 4;
    children?: ReactNode;
    passwordVisible?: boolean;
    onTogglePassword?: () => void;
};

export function registerInputClass(extra?: string) {
    return clsx(authFieldInput, extra);
}

export { authFieldLabel as labelClass };

export function RegisterField({
    label,
    icon: Icon,
    error,
    placeholder,
    inputType = 'text',
    autoComplete,
    className,
    delay,
    children,
    passwordVisible,
    onTogglePassword,
}: RegisterFieldProps) {
    const isPassword = inputType === 'password' || onTogglePassword != null;

    return (
        <label
            className={clsx(
                'register-field-rise flex flex-col gap-1.5',
                delay === 1 && 'animate-auth-delay-1',
                delay === 2 && 'animate-auth-delay-2',
                delay === 3 && 'animate-auth-delay-3',
                delay === 4 && 'animate-auth-delay-4',
                className,
            )}
        >
            <span className={authFieldLabel}>{label}</span>
            <div className="relative z-10 group">
                <span className={authFieldIcon}>
                    <Icon className="size-4" strokeWidth={1.75} />
                </span>
                {children ?? (
                    <>
                        <input
                            type={isPassword && passwordVisible ? 'text' : inputType}
                            placeholder={placeholder}
                            autoComplete={autoComplete}
                            className={clsx(authFieldInput, isPassword && 'pr-10')}
                        />
                        {isPassword && onTogglePassword != null && (
                            <PasswordToggleButton visible={!!passwordVisible} onToggle={onTogglePassword} className="right-2.5" />
                        )}
                    </>
                )}
            </div>
            {error && <span className="text-[10px] text-red-600">{error}</span>}
        </label>
    );
}
