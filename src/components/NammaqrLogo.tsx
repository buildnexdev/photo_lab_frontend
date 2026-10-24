import clsx from 'clsx';
import { BRAND_LOGO_SRC, BRAND_NAME, BRAND_TAGLINE } from '../lib/brand';

type Props = {
    className?: string;
    logoClassName?: string;
    showTagline?: boolean;
    compact?: boolean;
    hero?: boolean;
    /** Login: full emblem, lightened blend on dark wedding background */
    transparent?: boolean;
};

export function NammaqrLogo({
    className,
    logoClassName,
    showTagline = false,
    compact = false,
    hero = false,
    transparent = false,
}: Props) {
    if (transparent) {
        return (
            <div className={clsx('flex flex-col items-center text-center animate-auth-float', className)}>
                <img
                    src={BRAND_LOGO_SRC}
                    alt={BRAND_NAME}
                    className={clsx(
                        'max-h-[7.5rem] w-auto max-w-[min(100%,16rem)] sm:max-h-[9.5rem] sm:max-w-[18rem] object-contain',
                        'mix-blend-screen opacity-95 drop-shadow-[0_8px_28px_rgba(251,191,36,0.35)]',
                        logoClassName,
                    )}
                    draggable={false}
                />
                {showTagline && (
                    <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.28em] text-amber-100/90">{BRAND_TAGLINE}</p>
                )}
            </div>
        );
    }

    return (
        <div className={clsx('flex flex-col items-center text-center', hero && 'animate-auth-float w-full', className)}>
            <img
                src={BRAND_LOGO_SRC}
                alt={BRAND_NAME}
                className={clsx(
                    'object-contain',
                    hero
                        ? 'w-full max-w-[min(100%,20rem)] sm:max-w-[22rem] lg:max-w-[26rem] h-auto max-h-[min(36dvh,18rem)] sm:max-h-[min(40dvh,22rem)] lg:max-h-[min(78dvh,32rem)] drop-shadow-[0_12px_32px_rgba(180,83,9,0.18)]'
                        : compact
                          ? 'max-h-12 w-auto'
                          : 'max-h-36 sm:max-h-44 w-auto max-w-full drop-shadow-[0_4px_16px_rgba(180,83,9,0.15)]',
                    logoClassName,
                )}
                draggable={false}
            />
            {showTagline && (
                <p className="mt-3 text-[10px] font-sans font-medium uppercase tracking-[0.32em] text-amber-800/75">{BRAND_TAGLINE}</p>
            )}
        </div>
    );
}
