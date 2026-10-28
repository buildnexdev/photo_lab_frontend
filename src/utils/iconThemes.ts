/** Shared colourful icon tones for portal nav + page chrome. */

export type IconTone = 'sky' | 'violet' | 'rose' | 'amber' | 'emerald' | 'fuchsia' | 'cyan' | 'orange' | 'gold' | 'ink';

export const ICON_TONE_TILE: Record<IconTone, string> = {
    sky: 'nq-icon-tile--sky',
    violet: 'nq-icon-tile--violet',
    rose: 'nq-icon-tile--rose',
    amber: 'nq-icon-tile--amber',
    emerald: 'nq-icon-tile--emerald',
    fuchsia: 'nq-icon-tile--fuchsia',
    cyan: 'nq-icon-tile--cyan',
    orange: 'nq-icon-tile--orange',
    gold: 'nq-icon-tile--gold',
    ink: 'nq-icon-tile--ink',
};

/** Tailwind classes for topbar page icon (white glyph on gradient). */
export const ICON_TONE_TOPBAR: Record<IconTone, { bg: string; shadow: string }> = {
    gold: { bg: 'bg-gradient-to-br from-brand-400 to-brand-600', shadow: 'shadow-brand-500/30' },
    emerald: { bg: 'bg-gradient-to-br from-emerald-400 to-teal-600', shadow: 'shadow-emerald-500/30' },
    orange: { bg: 'bg-gradient-to-br from-orange-400 to-amber-600', shadow: 'shadow-orange-500/30' },
    rose: { bg: 'bg-gradient-to-br from-rose-400 to-pink-600', shadow: 'shadow-rose-500/30' },
    violet: { bg: 'bg-gradient-to-br from-violet-400 to-fuchsia-600', shadow: 'shadow-violet-500/30' },
    sky: { bg: 'bg-gradient-to-br from-sky-400 to-indigo-600', shadow: 'shadow-sky-500/30' },
    amber: { bg: 'bg-gradient-to-br from-amber-400 to-yellow-600', shadow: 'shadow-amber-500/30' },
    fuchsia: { bg: 'bg-gradient-to-br from-fuchsia-500 to-purple-700', shadow: 'shadow-fuchsia-500/30' },
    cyan: { bg: 'bg-gradient-to-br from-cyan-400 to-blue-600', shadow: 'shadow-cyan-500/30' },
    ink: { bg: 'bg-gradient-to-br from-zinc-700 to-ink-900', shadow: 'shadow-slate-500/30' },
};

const KEY_TO_TONE: { match: string; tone: IconTone }[] = [
    { match: 'customer', tone: 'emerald' },
    { match: 'booking', tone: 'orange' },
    { match: 'event', tone: 'rose' },
    { match: 'galler', tone: 'violet' },
    { match: 'photo', tone: 'sky' },
    { match: 'order', tone: 'amber' },
    { match: 'payment', tone: 'emerald' },
    { match: 'report', tone: 'fuchsia' },
    { match: 'coupon', tone: 'amber' },
    { match: 'package', tone: 'violet' },
    { match: 'service', tone: 'cyan' },
    { match: 'product', tone: 'sky' },
    { match: 'task', tone: 'emerald' },
    { match: 'proof', tone: 'violet' },
    { match: 'print', tone: 'cyan' },
    { match: 'deliver', tone: 'orange' },
    { match: 'dispatch', tone: 'orange' },
    { match: 'staff', tone: 'rose' },
    { match: 'setting', tone: 'ink' },
    { match: 'qr', tone: 'fuchsia' },
    { match: 'asset', tone: 'sky' },
    { match: 'website', tone: 'violet' },
    { match: 'studio', tone: 'gold' },
    { match: 'audit', tone: 'ink' },
    { match: 'notif', tone: 'amber' },
    { match: 'dashboard', tone: 'gold' },
];

export function toneForPath(pathname: string, label = ''): IconTone {
    const hay = `${pathname} ${label}`.toLowerCase();
    for (const { match, tone } of KEY_TO_TONE) {
        if (hay.includes(match)) return tone;
    }
    return 'gold';
}
