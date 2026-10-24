import brandEmblem from '../assets/nq-emblem.png';
import brandEmblemLight from '../assets/nq-emblem-light.png';

export const BRAND_NAME = 'Nammaqr';
export const BRAND_TAGLINE = 'Moments beyond time';
/** Bundled transparent emblem (Vite) — use in React `<img src={…} />` on light surfaces. */
export const BRAND_LOGO_SRC = brandEmblem;
/** Transparent emblem with ivory strokes, for dark surfaces (sidebar, dark heroes). */
export const BRAND_LOGO_LIGHT_SRC = brandEmblemLight;
/** Static path on the dev server / CDN — use in HTML or external links. */
export const BRAND_LOGO_PUBLIC = '/nq-emblem.png';

/** Default auth background (register, forgot password shell). */
export const BRAND_BACKGROUND_SRC = '/images/login-showcase-1.jpg';

/** Login page — wedding / marriage hero. */
export const LOGIN_BACKGROUND_SRC = '/images/hero-couple-petals.jpg';
