import clsx from 'clsx';
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const control =
    'block w-full rounded-lg border bg-white px-3 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:bg-stone-100 disabled:text-stone-500';

export function Field({ label, error, hint, children, required, className, htmlFor }: { label?: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; required?: boolean; className?: string; htmlFor?: string }) {
    return (
        <div className={clsx('min-w-0', className)}>
            {label && (
                <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-stone-700">
                    {label}
                    {required && <span className="ml-0.5 text-red-600">*</span>}
                </label>
            )}
            {children}
            {error ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="mt-1 text-xs text-stone-500">{hint}</p>
            ) : null}
        </div>
    );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; error?: string; hint?: ReactNode; wrapperClassName?: string; prefix?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, wrapperClassName, className, id, required, prefix, ...rest }, ref) {
    const auto = useId();
    const inputId = id ?? auto;
    const input = (
        <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error || undefined}
            required={required}
            className={clsx(control, 'h-10', error ? 'border-red-400' : 'border-stone-300', prefix && 'pl-8', className)}
            {...rest}
        />
    );
    return (
        <Field label={label} error={error} hint={hint} required={required} className={wrapperClassName} htmlFor={inputId}>
            {prefix ? (
                <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-500">{prefix}</span>
                    {input}
                </div>
            ) : (
                input
            )}
        </Field>
    );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode; error?: string; hint?: ReactNode; wrapperClassName?: string; options: { value: string | number; label: string; disabled?: boolean }[]; placeholder?: string };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, error, hint, wrapperClassName, className, id, options, placeholder, required, ...rest }, ref) {
    const auto = useId();
    const selectId = id ?? auto;
    return (
        <Field label={label} error={error} hint={hint} required={required} className={wrapperClassName} htmlFor={selectId}>
            <select ref={ref} id={selectId} aria-invalid={!!error || undefined} required={required} className={clsx(control, 'h-10 pr-8', error ? 'border-red-400' : 'border-stone-300', className)} {...rest}>
                {placeholder !== undefined && <option value="">{placeholder}</option>}
                {options.map((o) => (
                    <option key={o.value} value={o.value} disabled={o.disabled}>
                        {o.label}
                    </option>
                ))}
            </select>
        </Field>
    );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; error?: string; hint?: ReactNode; wrapperClassName?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, error, hint, wrapperClassName, className, id, required, rows = 4, ...rest }, ref) {
    const auto = useId();
    const areaId = id ?? auto;
    return (
        <Field label={label} error={error} hint={hint} required={required} className={wrapperClassName} htmlFor={areaId}>
            <textarea ref={ref} id={areaId} rows={rows} aria-invalid={!!error || undefined} required={required} className={clsx(control, 'py-2', error ? 'border-red-400' : 'border-stone-300', className)} {...rest} />
        </Field>
    );
});

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }>(function Checkbox({ label, description, className, id, ...rest }, ref) {
    const auto = useId();
    const boxId = id ?? auto;
    return (
        <label htmlFor={boxId} className={clsx('flex cursor-pointer items-start gap-3', className)}>
            <input ref={ref} id={boxId} type="checkbox" className="mt-0.5 size-4 rounded border-stone-300 text-brand-700 accent-brand-700" {...rest} />
            <span className="text-sm">
                <span className="font-medium text-stone-800">{label}</span>
                {description && <span className="block text-stone-500">{description}</span>}
            </span>
        </label>
    );
});

export function FormGrid({ children, cols = 2, className }: { children: ReactNode; cols?: 1 | 2 | 3; className?: string }) {
    return <div className={clsx('grid grid-cols-1 gap-4', cols >= 2 && 'sm:grid-cols-2', cols === 3 && 'lg:grid-cols-3', className)}>{children}</div>;
}
