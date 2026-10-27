import { BRAND_BACKGROUND_SRC } from '../lib/brand';

/** Soft light wash + slow photo drift for auth screens. */
export function AuthPhotoBackground() {
    return (
        <>
            <img
                src={BRAND_BACKGROUND_SRC}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-30 saturate-[0.9] animate-kenburns"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/94 via-amber-50/88 to-slate-100/92" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(251,191,36,0.12)_0%,transparent_50%)]" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-white/80 to-transparent" />
        </>
    );
}
