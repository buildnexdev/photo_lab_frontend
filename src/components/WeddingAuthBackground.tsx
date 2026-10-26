import { LOGIN_BACKGROUND_SRC } from '../lib/brand';

/** Full-screen wedding hero with a light cream overlay for auth screens. */
export function WeddingAuthBackground() {
    return (
        <>
            <img
                src={LOGIN_BACKGROUND_SRC}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center animate-kenburns opacity-90 saturate-[1.05]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/75 via-amber-50/70 to-white/85" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.2)_0%,rgba(255,251,235,0.85)_100%)]" />
        </>
    );
}
