/*
 * Developer by: Buildnexdev.in
 * Developer : Nandhakumar@gmail.com
 * Last Edited : 26-10-2026
 */
import clsx from 'clsx';
import { Clock, X } from 'lucide-react';
import { useId, useMemo, type ReactNode } from 'react';
import { from24Hour, to24Hour } from '../../utils/format';
import { Field } from './Form';

export interface TimeInput12Props {
    label?: ReactNode;
    error?: string;
    hint?: ReactNode;
    required?: boolean;
    wrapperClassName?: string;
    className?: string;
    id?: string;
    value: string | null | undefined; // Expects "HH:mm" (24h) or ""
    onChange: (value24: string) => void;
    placeholderHour?: string;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const BASE_MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export function TimeInput12({
    label,
    error,
    hint,
    required,
    wrapperClassName,
    className,
    id,
    value,
    onChange,
    placeholderHour = 'Hr',
}: TimeInput12Props) {
    const autoId = useId();
    const inputId = id ?? autoId;

    const parsed = useMemo(() => from24Hour(value), [value]);

    const minuteOptions = useMemo(() => {
        if (!parsed?.minute || BASE_MINUTES.includes(parsed.minute)) {
            return BASE_MINUTES;
        }
        return [...BASE_MINUTES, parsed.minute].sort((a, b) => Number(a) - Number(b));
    }, [parsed]);

    const handleHourChange = (newHourStr: string) => {
        if (!newHourStr) {
            onChange('');
            return;
        }
        const hour12 = parseInt(newHourStr, 10);
        const minute = parsed?.minute ?? '00';
        const period = parsed?.period ?? 'AM';
        onChange(to24Hour(hour12, minute, period));
    };

    const handleMinuteChange = (newMinStr: string) => {
        const hour12 = parsed?.hour12 ?? 10;
        const period = parsed?.period ?? 'AM';
        onChange(to24Hour(hour12, newMinStr, period));
    };

    const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
        const hour12 = parsed?.hour12 ?? 10;
        const minute = parsed?.minute ?? '00';
        onChange(to24Hour(hour12, minute, newPeriod));
    };

    const handleClear = () => {
        onChange('');
    };

    const isSet = !!parsed;

    return (
        <Field label={label} error={error} hint={hint} required={required} className={wrapperClassName} htmlFor={`${inputId}-hr`}>
            <div
                className={clsx(
                    'flex flex-wrap items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 shadow-xs transition-colors',
                    error ? 'border-red-400 ring-1 ring-red-400' : 'border-stone-300 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20',
                    className,
                )}
            >
                <Clock className="size-4 text-stone-400 shrink-0" />

                {/* Hour Select */}
                <select
                    id={`${inputId}-hr`}
                    value={parsed?.hour12 ? String(parsed.hour12) : ''}
                    onChange={(e) => handleHourChange(e.target.value)}
                    className="h-8 rounded-md bg-stone-50 px-2 py-0.5 text-sm font-medium text-stone-800 border border-stone-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-600 cursor-pointer"
                >
                    <option value="">{placeholderHour}</option>
                    {HOURS.map((h) => (
                        <option key={h} value={h}>
                            {String(h).padStart(2, '0')}
                        </option>
                    ))}
                </select>

                <span className="font-bold text-stone-400 select-none">:</span>

                {/* Minute Select */}
                <select
                    id={`${inputId}-min`}
                    value={parsed?.minute ?? '00'}
                    disabled={!isSet}
                    onChange={(e) => handleMinuteChange(e.target.value)}
                    className="h-8 rounded-md bg-stone-50 px-2 py-0.5 text-sm font-medium text-stone-800 border border-stone-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:opacity-50 cursor-pointer"
                >
                    {minuteOptions.map((m) => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>

                {/* AM / PM Segmented Control */}
                <div className="inline-flex rounded-md bg-stone-100 p-0.5 border border-stone-200">
                    <button
                        type="button"
                        onClick={() => handlePeriodChange('AM')}
                        className={clsx(
                            'rounded px-2.5 py-0.5 text-xs font-bold transition-all cursor-pointer',
                            parsed?.period === 'AM'
                                ? 'bg-white text-brand-700 shadow-xs'
                                : 'text-stone-600 hover:text-stone-900',
                        )}
                    >
                        AM
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePeriodChange('PM')}
                        className={clsx(
                            'rounded px-2.5 py-0.5 text-xs font-bold transition-all cursor-pointer',
                            parsed?.period === 'PM'
                                ? 'bg-white text-brand-700 shadow-xs'
                                : 'text-stone-600 hover:text-stone-900',
                        )}
                    >
                        PM
                    </button>
                </div>

                {/* Clear Button */}
                {isSet && (
                    <button
                        type="button"
                        title="Clear time"
                        onClick={handleClear}
                        className="ml-auto inline-flex size-6 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors cursor-pointer"
                    >
                        <X className="size-3.5" />
                    </button>
                )}
            </div>
        </Field>
    );
}
