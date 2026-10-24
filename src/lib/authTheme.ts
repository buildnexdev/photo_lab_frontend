/** Shared light theme for sign-in, register, and related auth screens. */

export const authPage =
    'relative min-h-dvh w-full flex flex-col items-center justify-center px-4 py-3 select-none font-sans bg-gradient-to-br from-amber-50 via-white to-slate-100 text-slate-800 selection:bg-amber-200 selection:text-slate-900 lg:min-h-dvh lg:h-dvh lg:max-h-dvh';

export const authPageFixed = 'relative h-dvh max-h-dvh w-full overflow-hidden font-sans bg-gradient-to-br from-amber-50 via-white to-slate-100 text-slate-800 selection:bg-amber-200 selection:text-slate-900';

export const authCard =
    'relative z-10 w-full max-w-[420px] rounded-3xl border border-amber-200/80 bg-white/90 backdrop-blur-md p-6 sm:p-7 lg:p-8 shadow-2xl shadow-amber-900/10 ring-1 ring-white/80 auth-card-shine mx-auto lg:mx-0';

export const authCardWide =
    'flex h-full max-h-[720px] w-full max-w-4xl flex-col rounded-2xl border border-amber-200/90 bg-white/95 backdrop-blur-sm shadow-xl shadow-amber-900/5 ring-1 ring-amber-100';

export const authCardInner =
    'relative w-full max-w-[460px] mx-auto rounded-2xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100 text-slate-800';

export const authLabel = 'mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-slate-600';

export const authLabelSm = 'text-[10px] font-medium uppercase tracking-wider text-slate-600';

export const authInput =
    'auth-input w-full rounded-xl border border-slate-200/90 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)] transition-all duration-200';

export const authInputSm =
    'w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20';

export const authInputIcon = 'pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400';

export const authInputIconSm = 'pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-slate-400';

export const authLink = 'text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors';

export const authMuted = 'text-sm text-slate-600';

export const authBtnPrimary =
    'w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 px-6 shadow-md shadow-amber-600/30 hover:shadow-lg hover:shadow-amber-600/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 transition-all duration-200 cursor-pointer text-xs uppercase tracking-[0.2em]';

export const authBtnSm =
    'inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50 shadow-sm';

export const authError =
    'mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700';

export const authErrorSm = 'mb-2 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700';

/** Login / register field chrome (light). */
export const authFieldLabel =
    'text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600';

export const authFieldLabelLogin = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600';

export const authFieldInput =
    'auth-input w-full rounded-xl border border-slate-200/90 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 transition-all';

export const authFieldInputLogin =
    'auth-input w-full rounded-xl border border-slate-200/90 bg-white pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 transition-all';

export const authFieldIcon =
    'pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 group-focus-within:text-amber-600 transition-colors';

export const authFieldIconLogin =
    'pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400 group-focus-within:text-amber-600 transition-colors';

export const authBtnAction =
    'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white shadow-md shadow-amber-600/25 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 transition-all';

export const authRegisterCard =
    'register-card-glow relative z-10 flex h-full max-h-[min(720px,92dvh)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-amber-200/90 bg-white/95 shadow-2xl shadow-amber-900/10 backdrop-blur-md auth-card-shine animate-auth-rise lg:flex-row';

export const authRegisterAside =
    'hidden shrink-0 flex-col justify-between border-r border-slate-200/80 bg-gradient-to-b from-amber-50/90 to-white px-5 py-6 lg:flex lg:w-[13.5rem]';

export const authStepActive =
    'border-amber-300/80 bg-amber-50 shadow-sm shadow-amber-900/5';

export const authStepDone = 'border-amber-200/80 bg-amber-50/50';

export const authStepPending = 'border-slate-200/80 bg-slate-50/50 opacity-80';

export const authModuleCardOn =
    'border-amber-400/80 bg-gradient-to-br from-amber-50 to-white shadow-md shadow-amber-900/10 ring-1 ring-amber-200/80';

export const authModuleCardOff =
    'border-slate-200/90 bg-white hover:border-amber-300/80 hover:bg-amber-50/40';

/** Login — split hero + form card. */
export const authLoginShell =
    'relative z-10 flex w-full max-w-[980px] flex-col overflow-hidden rounded-none border-0 bg-white/95 shadow-none backdrop-blur-md sm:rounded-[2rem] sm:border sm:border-amber-200/70 sm:shadow-2xl sm:shadow-amber-950/10 lg:min-h-[min(640px,88dvh)] lg:flex-row lg:ring-1 lg:ring-white/90 animate-auth-rise';

export const authLoginHero =
    'relative flex min-h-[220px] flex-col justify-between overflow-hidden px-8 py-10 text-white sm:min-h-[260px] lg:min-h-0 lg:w-[44%] lg:px-10 lg:py-12';

export const authLoginFormPane =
    'flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12';
