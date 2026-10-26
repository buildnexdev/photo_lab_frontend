import clsx from 'clsx';
import type { HTMLAttributes } from 'react';
import { BRAND_LOGO_SRC, BRAND_NAME } from '../../lib/brand';
import './NqLoader.scss';

export type NqLoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const PX: Record<NqLoaderSize, number> = {
    xs: 16,
    sm: 20,
    md: 28,
    lg: 40,
    xl: 56,
};

type Props = HTMLAttributes<HTMLSpanElement> & {
    size?: NqLoaderSize;
    /** Aperture-only SVG, or emblem with rotating gold ring */
    variant?: 'aperture' | 'emblem';
    className?: string;
    label?: string;
};

function ApertureSvg() {
    const blades = Array.from({ length: 8 }, (_, i) => {
        const angle = (360 / 8) * i;
        return (
            <path
                key={i}
                d="M50 50 L50 18 A32 32 0 0 1 72 28 Z"
                fill="currentColor"
                transform={`rotate(${angle} 50 50)`}
                opacity={0.92 - (i % 2) * 0.08}
            />
        );
    });

    return (
        <svg className="nq-loader__svg" viewBox="0 0 100 100" aria-hidden>
            <circle className="nq-loader__ring-outer" cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.35" />
            <g className="nq-loader__blades">{blades}</g>
            <circle className="nq-loader__core" cx="50" cy="50" r="10" fill="#c9a24b" />
            <circle cx="50" cy="50" r="4" fill="#1c1917" opacity="0.85" />
        </svg>
    );
}

/** Camera-aperture loader aligned with the NQ emblem brand. */
export function NqLoader({ size = 'md', variant = 'aperture', className, label = 'Loading', ...rest }: Props) {
    const px = PX[size];

    if (variant === 'emblem') {
        return (
            <span
                className={clsx('nq-loader nq-loader--emblem', className)}
                style={{ width: px, height: px }}
                role="status"
                aria-label={label}
                {...rest}
            >
                <span className="nq-loader__emblem-glow" aria-hidden />
                <span className="nq-loader__emblem-ring" aria-hidden />
                <img src={BRAND_LOGO_SRC} alt="" className="nq-loader__mark" draggable={false} />
            </span>
        );
    }

    return (
        <span
            className={clsx('nq-loader nq-loader--aperture', className)}
            style={{ width: px, height: px }}
            role="status"
            aria-label={label}
            {...rest}
        >
            <ApertureSvg />
        </span>
    );
}

export function NqLoaderPage({ label = 'Loading…', className }: { label?: string; className?: string }) {
    return (
        <div className={clsx('flex flex-col items-center justify-center gap-4 py-16', className)} role="status">
            <NqLoader size="xl" variant="emblem" label={label} />
            <p className="text-sm font-medium text-stone-500">{label}</p>
            <span className="sr-only">{BRAND_NAME}</span>
        </div>
    );
}
