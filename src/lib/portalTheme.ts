/** Admin / portal shell — shared layout tokens (Nammaqr studio suite). */

export const portalSidebarWidth = 'lg:pl-[280px]';

export const portalSidebarShell =
    'border-r border-stone-200/90 bg-[#fffcf7] shadow-[1px_0_0_rgba(255,255,255,0.8)_inset,4px_0_24px_-12px_rgba(120,53,15,0.08)]';

export const portalSidebarBrandStrip =
    'border-b border-amber-200/60 bg-gradient-to-br from-amber-50 via-[#fff9f0] to-white';

export const portalPageCanvas =
    'pointer-events-none fixed inset-0 -z-10 lg:left-[280px] bg-[#f3efe6] bg-[radial-gradient(ellipse_90%_60%_at_50%_-20%,rgba(251,191,36,0.12),transparent_50%),radial-gradient(ellipse_50%_40%_at_100%_0%,rgba(255,255,255,0.9),transparent_45%)]';

export const portalShell = `portal-app min-h-dvh flex flex-col ${portalSidebarWidth}`;

export const portalHeader =
    'sticky top-0 z-20 border-b border-stone-200/80 bg-white/80 px-4 py-3 backdrop-blur-lg shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] sm:px-6 lg:px-8';

export const portalMain = 'relative mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8';

export const portalFooter =
    'mt-auto border-t border-stone-200/80 bg-white/70 px-4 py-3 backdrop-blur-sm sm:px-8';

export const portalNavScroll =
    'scrollbar-thin [scrollbar-color:rgba(180,83,9,0.25)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-300/60';

export const portalSectionLabel =
    'px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 first:pt-1';

export const portalNavLinkActive =
    'relative bg-gradient-to-r from-amber-100/90 to-amber-50/40 text-brand-900 font-semibold shadow-sm ring-1 ring-amber-200/80 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-amber-400 before:to-brand-700';

export const portalNavLinkIdle =
    'text-stone-600 hover:bg-white hover:text-stone-900 hover:shadow-sm hover:ring-1 hover:ring-stone-200/80';

export const portalUserMenu =
    'absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-stone-200/90 bg-[#fffcf9] py-1.5 shadow-xl shadow-stone-900/10 ring-1 ring-white';
