import clsx from 'clsx';
import {
    ChevronDown,
    ExternalLink,
    LayoutGrid,
    LogOut,
    Menu,
    User,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { NotificationBell } from '../components/NotificationBell';
import { useToast } from '../components/toast';
import { ROLE_LABELS, homeFor, useAuth, type Role } from '../lib/auth';
import { useSite } from '../lib/site';

export interface NavItem {
    to: string;
    label: string;
    icon: LucideIcon;
    anyOf?: string[];
    end?: boolean;
}

export interface NavSection {
    title?: string;
    items: NavItem[];
}

export interface AreaLink {
    to: string;
    label: string;
    anyOf: string[];
}

export const AREA_LINKS: AreaLink[] = [
    { to: '/admin/dashboard', label: 'Studio admin', anyOf: ['dashboard.view', 'bookings.view', 'customers.view', 'galleries.manage', 'users.manage', 'reports.view', 'settings.manage'] },
    { to: '/photographer/dashboard', label: 'Photographer', anyOf: ['photos.upload'] },
    { to: '/editor/dashboard', label: 'Editor', anyOf: ['photos.edit', 'proofs.manage'] },
    { to: '/delivery/dashboard', label: 'Printing & delivery', anyOf: ['printing.manage', 'delivery.manage'] },
    { to: '/customer/dashboard', label: 'My account', anyOf: ['customer.portal'] },
];

/** FlashLight Photography Brand Logo */
export function FlashLightBrand({ subtitle = 'STUDIO PLATFORM' }: { subtitle?: string }) {
    return (
        <div className="group block select-none">
            <div className="flex items-center gap-2.5">
                <img
                    src="/images/flashlight-emblem.png"
                    alt="FlashLight"
                    className="h-8 w-auto filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)] transition-transform group-hover:scale-105"
                />
                <div>
                    <span className="block font-serif text-sm font-medium tracking-[0.2em] uppercase text-white leading-none">
                        Flash Light
                    </span>
                    <span className="block text-[8px] font-sans font-light tracking-[0.28em] text-amber-400 uppercase mt-1">
                        {subtitle}
                    </span>
                </div>
            </div>
        </div>
    );
}

/** Live clock formatted as: Thu, 01 Oct, 03:31:52 pm */
function useLiveTime() {
    const formatTime = () => {
        const now = new Date();
        const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
        const day = String(now.getDate()).padStart(2, '0');
        const month = now.toLocaleDateString('en-US', { month: 'short' });
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();
        return `${weekday}, ${day} ${month}, ${time}`;
    };

    const [time, setTime] = useState(formatTime);

    useEffect(() => {
        const timer = setInterval(() => setTime(formatTime()), 1000);
        return () => clearInterval(timer);
    }, []);

    return time;
}

const COLORFUL_ICON_THEMES: Record<string, { bg: string; shadow: string }> = {
    dashboard: { bg: 'bg-gradient-to-tr from-amber-500 to-amber-600', shadow: 'shadow-amber-500/25' },
    customers: { bg: 'bg-gradient-to-tr from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/25' },
    bookings: { bg: 'bg-gradient-to-tr from-amber-600 to-orange-600', shadow: 'shadow-amber-500/25' },
    events: { bg: 'bg-gradient-to-tr from-rose-500 to-amber-600', shadow: 'shadow-orange-500/25' },
    galleries: { bg: 'bg-gradient-to-tr from-purple-500 to-pink-600', shadow: 'shadow-rose-500/25' },
    photos: { bg: 'bg-gradient-to-tr from-sky-500 to-indigo-600', shadow: 'shadow-sky-500/25' },
    orders: { bg: 'bg-gradient-to-tr from-amber-500 to-yellow-600', shadow: 'shadow-amber-500/25' },
    payments: { bg: 'bg-gradient-to-tr from-emerald-600 to-green-600', shadow: 'shadow-emerald-500/25' },
    reports: { bg: 'bg-gradient-to-tr from-fuchsia-600 to-purple-600', shadow: 'shadow-fuchsia-500/25' },
    coupons: { bg: 'bg-gradient-to-tr from-amber-600 to-yellow-500', shadow: 'shadow-amber-500/25' },
    packages: { bg: 'bg-gradient-to-tr from-indigo-600 to-violet-600', shadow: 'shadow-indigo-500/25' },
    tasks: { bg: 'bg-gradient-to-tr from-teal-500 to-emerald-600', shadow: 'shadow-teal-500/25' },
    proofs: { bg: 'bg-gradient-to-tr from-purple-500 to-pink-600', shadow: 'shadow-purple-500/25' },
    printing: { bg: 'bg-gradient-to-tr from-cyan-600 to-blue-600', shadow: 'shadow-cyan-500/25' },
    dispatch: { bg: 'bg-gradient-to-tr from-amber-500 to-red-500', shadow: 'shadow-amber-500/25' },
    staff: { bg: 'bg-gradient-to-tr from-rose-600 to-orange-500', shadow: 'shadow-rose-500/25' },
    settings: { bg: 'bg-gradient-to-tr from-slate-700 to-[#0e131d]', shadow: 'shadow-slate-500/25' },
};

function getThemeKey(pathname: string, label: string) {
    const lower = `${pathname} ${label}`.toLowerCase();
    for (const key of Object.keys(COLORFUL_ICON_THEMES)) {
        if (lower.includes(key)) return key;
    }
    return 'dashboard';
}

function Subheader({
    pageTitle,
    activeItem,
    area,
    onMobileMenuOpen,
    liveTime,
    areas,
    notificationsLink,
    user,
    profileLink,
    onLogout,
}: {
    pageTitle: string;
    activeItem?: NavItem;
    area?: string;
    onMobileMenuOpen: () => void;
    liveTime: string;
    areas: AreaLink[];
    notificationsLink?: string;
    user: any;
    profileLink: string;
    onLogout: () => Promise<void>;
}) {
    const location = useLocation();
    const themeKey = getThemeKey(location.pathname, activeItem?.label ?? pageTitle);
    const theme = COLORFUL_ICON_THEMES[themeKey] ?? COLORFUL_ICON_THEMES.dashboard;
    const IconComponent = activeItem?.icon ?? LayoutGrid;

    return (
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-2.5 backdrop-blur-md shadow-xs sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
                {/* LEFTSIDE CORNER: Mobile Menu Toggle + ICON & PAGENAME */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onMobileMenuOpen}
                        className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 lg:hidden shadow-xs cursor-pointer"
                        aria-label="Open menu"
                    >
                        <Menu className="size-5" />
                    </button>

                    <div className={clsx('flex size-10 sm:size-11 items-center justify-center rounded-xl text-white shadow-md transition-transform hover:scale-105', theme.bg, theme.shadow)}>
                        <IconComponent className="size-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 font-sans">
                                {pageTitle}
                            </h1>
                            <span className="hidden sm:inline-block rounded-md bg-amber-50 border border-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                                {area ?? 'Studio'}
                            </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500">
                            FlashLight Photography • Studio Operating Suite
                        </p>
                    </div>
                </div>

                {/* RIGHTSIDE CORNER: TIMING CLOCK, AREA SWITCHER, NOTIFICATION BELL, ANIMATED PROFILE AVATAR */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Live Timing Clock */}
                    <div className="hidden md:flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs select-none">
                        <span>{liveTime}</span>
                    </div>

                    {/* Area Switcher (if multiple roles/areas) */}
                    {areas.length > 1 && <AreaSwitcher areas={areas} />}

                    {/* Notification Bell */}
                    <NotificationBell allLink={notificationsLink} />

                    {/* Profile Avatar Animation Menu */}
                    <UserMenu name={user?.name ?? ''} role={(user?.roles[0] as Role) ?? 'CUSTOMER'} profileLink={profileLink} onLogout={onLogout} />
                </div>
            </div>
        </header>
    );
}

export function PortalLayout({ area, sections, profileLink, notificationsLink }: { area: string; sections: NavSection[]; profileLink: string; notificationsLink?: string }) {
    const { user, can, logout } = useAuth();
    const site = useSite();
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const liveTime = useLiveTime();

    // Accordion collapse state for sections
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const toggleSection = (key: string) => {
        setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => setMobileOpen(false), [location.pathname]);

    const visible = useMemo(
        () => sections.map((s) => ({ ...s, items: s.items.filter((i) => !i.anyOf || can(...i.anyOf)) })).filter((s) => s.items.length),
        [sections, can],
    );
    const areas = AREA_LINKS.filter((a) => can(...a.anyOf));

    // Dynamic page title
    const activeItem = visible.flatMap((s) => s.items).find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)));
    const pageTitle = activeItem
        ? activeItem.label.toLowerCase().includes('dashboard')
            ? `${area ? area.charAt(0).toUpperCase() + area.slice(1) : 'Admin'} dashboard`
            : activeItem.label
        : `${area ? area.charAt(0).toUpperCase() + area.slice(1) : 'Admin'} dashboard`;

    const subtitleText = site.data?.studio.name ? site.data.studio.name.toUpperCase() : 'STUDIO SUITE';

    const brandHeader = (
        <div className="px-4 pt-5 pb-3">
            <Link to={homeFor(user)} className="focus:outline-none block">
                <FlashLightBrand subtitle={subtitleText} />
            </Link>
            <div className="mt-3.5 border-b border-white/10" />
        </div>
    );

    const navContent = (
        <nav className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 py-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" aria-label={`${area} navigation`}>
            {/* Dynamic sections with collapsible accordion */}
            {visible.map((s, idx) => {
                const sectionKey = s.title || `section-${idx}`;
                const isCollapsed = !!collapsedSections[sectionKey];
                return (
                    <div key={sectionKey} className="space-y-0.5">
                        {s.title && (
                            <button
                                type="button"
                                onClick={() => toggleSection(sectionKey)}
                                className="flex w-full items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none"
                            >
                                <span>{s.title}</span>
                                <ChevronDown className={clsx('size-3 text-slate-400 transition-transform duration-200', isCollapsed && '-rotate-90')} />
                            </button>
                        )}
                        {!isCollapsed && (
                            <ul className="space-y-0.5">
                                {s.items.map((item) => (
                                    <li key={item.to}>
                                        <NavLink
                                            to={item.to}
                                            end={item.end}
                                            className={({ isActive }) =>
                                                clsx(
                                                    'group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150',
                                                    isActive
                                                        ? 'bg-amber-500/15 text-amber-400 font-semibold border-l-2 border-amber-400 rounded-l-none'
                                                        : 'text-slate-400 hover:bg-white/5 hover:text-white',
                                                )
                                            }
                                        >
                                            <item.icon className="size-4 shrink-0 text-slate-400 group-hover:text-white transition-colors" aria-hidden />
                                            <span className="truncate">{item.label}</span>
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                );
            })}
        </nav>
    );

    const asideFooter = (
        <div className="mt-auto border-t border-white/10 bg-[#090d14] px-4 py-3.5">
            <div className="flex items-center justify-between text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                <span>FlashLight Studio</span>
                <span className="flex size-2 items-center justify-center">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </span>
            </div>
        </div>
    );

    return (
        <div className="min-h-dvh flex flex-col bg-[#f8fafc] lg:pl-56">
            {/* Desktop Aside (Sidebar): w-56 (224px compact width) */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col bg-[#0e131d] lg:flex border-r border-white/10 shadow-2xl rounded-tr-2xl lg:rounded-tr-3xl overflow-hidden">
                {brandHeader}
                {navContent}
                {asideFooter}
            </aside>

            {/* Mobile Aside Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setMobileOpen(false)} />
                    <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col bg-[#0e131d] shadow-2xl rounded-tr-3xl overflow-hidden">
                        <div className="flex items-center justify-between pr-2">
                            {brandHeader}
                            <button
                                type="button"
                                onClick={() => setMobileOpen(false)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 transition-colors"
                                aria-label="Close menu"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        {navContent}
                        {asideFooter}
                    </aside>
                </div>
            )}

            {/* Header */}
            <Subheader
                pageTitle={pageTitle}
                activeItem={activeItem}
                area={area}
                onMobileMenuOpen={() => setMobileOpen(true)}
                liveTime={liveTime}
                areas={areas}
                notificationsLink={notificationsLink}
                user={user}
                profileLink={profileLink}
                onLogout={logout}
            />

            {/* Main Content Area */}
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
                <Outlet />
            </main>

            {/* Bottom Footer */}
            <footer className="mt-auto border-t border-slate-200/80 bg-white/80 px-4 py-3.5 backdrop-blur-xs sm:px-8">
                <div className="flex flex-col items-center justify-between gap-2.5 text-xs text-slate-500 sm:flex-row">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-700">
                            © {new Date().getFullYear()} FlashLight Photography
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-600">
                            version 1.0.0
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span>Studio Suite</span>
                        <span className="text-amber-500 font-bold">•</span>
                        <a
                            href="http://localhost:5174"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-amber-600 hover:text-amber-700 hover:underline transition-colors tracking-wide"
                        >
                            Open Public Site →
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function AreaSwitcher({ areas }: { areas: AreaLink[] }) {
    const navigate = useNavigate();
    const location = useLocation();
    const current = areas.find((a) => location.pathname.startsWith(a.to.split('/').slice(0, 2).join('/')));
    return (
        <select
            aria-label="Switch work area"
            value={current?.to ?? ''}
            onChange={(e) => navigate(e.target.value)}
            className="hidden h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:block cursor-pointer"
        >
            {areas.map((a) => (
                <option key={a.to} value={a.to}>
                    {a.label}
                </option>
            ))}
        </select>
    );
}

function UserMenu({ name, role, profileLink, onLogout }: { name: string; role: Role; profileLink: string; onLogout: () => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const toast = useToast();

    useEffect(() => {
        const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const signOut = async () => {
        try {
            await onLogout();
            navigate('/login', { replace: true });
        } catch (e) {
            toast.error(e);
        }
    };

    const initial = name ? name.trim().charAt(0).toUpperCase() : 'A';

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="relative flex size-9.5 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-sm font-bold text-white shadow-md border-2 border-white hover:scale-105 transition-all cursor-pointer select-none animate-avatar-ring ring-2 ring-amber-400/50"
                aria-haspopup="menu"
                aria-expanded={open}
                title={name}
            >
                {initial}
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-2.5">
                        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500">{ROLE_LABELS[role] ?? role}</p>
                    </div>
                    <Link role="menuitem" to={profileLink} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <User className="size-4 text-slate-400" /> My profile
                    </Link>
                    <Link role="menuitem" to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <ExternalLink className="size-4 text-slate-400" /> Visit website
                    </Link>
                    <div className="my-1 border-t border-slate-100" />
                    <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="size-4" /> Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
