const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** Amounts are stored in paise. */
export const money = (paise: number | string | null | undefined, whole = false) => {
    const n = Number(paise ?? 0) / 100;
    return (whole ? inrWhole : inr).format(Number.isFinite(n) ? n : 0);
};

/** Rupees typed in a form -> paise for the API. */
export const toPaise = (rupees: number | string) => Math.round(Number(rupees) * 100);
export const toRupees = (paise: number | string | null | undefined) => (paise === null || paise === undefined ? '' : String(Number(paise) / 100));

const STUDIO_TZ = 'Asia/Kolkata';

/** DATE columns arrive as 'YYYY-MM-DD'; render without timezone shifting. */
export function date(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
    if (!value) return '—';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { ...opts, timeZone: STUDIO_TZ });
}

/** DATETIME values are UTC (ISO strings from the API). */
export function dateTime(value: string | Date | null | undefined) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: STUDIO_TZ });
}

export function time(value: string | null | undefined) {
    if (!value) return '';
    const [h, m] = value.split(':').map(Number);
    const d = new Date(Date.UTC(2000, 0, 1, h, m));
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}

export function relative(value: string | Date | null | undefined) {
    if (!value) return '';
    const diff = (Date.now() - new Date(value).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
    return date(value instanceof Date ? value : String(value));
}

/** Studio-local today as YYYY-MM-DD (for date input min values). */
export function todayYmd() {
    const now = new Date(Date.now() + 330 * 60_000);
    return now.toISOString().slice(0, 10);
}

export function addDaysYmd(ymd: string, days: number) {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD HH:MM:SS' or ISO -> value for <input type="datetime-local"> in studio time. */
export function toLocalInput(value: string | null | undefined) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value (studio time) -> UTC 'YYYY-MM-DD HH:MM' for the API. */
export function localInputToUtc(value: string) {
    if (!value) return null;
    const d = new Date(`${value}:00Z`);
    return new Date(d.getTime() - 330 * 60_000).toISOString().slice(0, 16).replace('T', ' ');
}

export const bytes = (n: number | null | undefined) => {
    const v = Number(n ?? 0);
    if (v < 1024) return `${v} B`;
    if (v < 1024 ** 2) return `${(v / 1024).toFixed(0)} KB`;
    if (v < 1024 ** 3) return `${(v / 1024 ** 2).toFixed(1)} MB`;
    return `${(v / 1024 ** 3).toFixed(2)} GB`;
};

export const titleCase = (s: string | null | undefined) =>
    (s ?? '')
        .toLowerCase()
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ');

export const initials = (name: string | null | undefined) =>
    (name ?? '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('');

export const num = (v: number | string | null | undefined) => new Intl.NumberFormat('en-IN').format(Number(v ?? 0));

export function parseJson<T>(value: unknown, fallback: T): T {
    if (value === null || value === undefined) return fallback;
    if (typeof value !== 'string') return value as T;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}
