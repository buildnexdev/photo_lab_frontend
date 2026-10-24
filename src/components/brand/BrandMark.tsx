import clsx from 'clsx';
import type { ImgHTMLAttributes } from 'react';
import { BRAND_LOGO_LIGHT_SRC, BRAND_LOGO_SRC, BRAND_NAME } from '../../lib/brand';

type Props = ImgHTMLAttributes<HTMLImageElement> & {
    /** Use bundled asset (default) or public URL path */
    src?: string;
    /** `light` swaps the black strokes for ivory so the mark reads on dark backgrounds. */
    variant?: 'default' | 'light';
};

/** Standard NQ / Nammaqr emblem image (transparent PNG). */
export function BrandMark({ className, alt = BRAND_NAME, variant = 'default', src, ...rest }: Props) {
    const source = src ?? (variant === 'light' ? BRAND_LOGO_LIGHT_SRC : BRAND_LOGO_SRC);
    return <img src={source} alt={alt} className={clsx('object-contain', className)} draggable={false} {...rest} />;
}
