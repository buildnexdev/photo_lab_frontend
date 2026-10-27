// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import clsx from 'clsx';
import {
    ExternalLink,
    LayoutGrid,
    LogOut,
    Menu,
    Search,
    User,
    X,
    type LucideIcon,
} from 'lucide-react';
import './PortalLayout.scss';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { BrandMark } from '../components/brand';
import { NotificationBell } from '../components/layout/NotificationBell';
import { useToast } from '../components/ui/Toast';
import { ROLE_LABELS, homeFor, useAuth, type Role } from '../hooks/useAuth';
import { useSite } from '../utils/site';

export interface NavItem {
    to: string;
    label: string;
    icon: LucideIcon;
    anyOf?: string[];
    roles?: Role[];
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

/** Nammaqr Photography brand mark. The lockup already includes the name. */
export function NammaqrBrand({ subtitle, dark = false }: { subtitle?: string; dark?: boolean }) {
    return (
        <div className={clsx('group flex select-none items-center gap-3', dark && 'portal-brand-dark')}>
            <BrandMark variant={dark ? 'light' : 'default'} className="h-10 w-14 shrink-0" />
            <div className="min-w-0 text-left">
                <p className={clsx('portal-brand-title truncate', !dark && 'font-semibold tracking-tight text-stone-900')}>Nammaqr</p>
                <p className={clsx('portal-brand-sub truncate', !dark && 'text-[10px] font-medium uppercase tracking-[0.18em] text-brand-700')}>
                    Photography
                </p>
                {subtitle ? (
                    <p className={clsx('portal-brand-studio truncate', !dark && 'mt-0.5 text-xs font-medium text-stone-500')}>{subtitle}</p>
                ) : null}
            </div>
        </div>
    );
}

const COLORFUL_ICON_THEMES: Record<string, { bg: string; shadow: string }> = {
    dashboard: { bg: 'bg-gradient-to-tr from-brand-500 to-brand-600', shadow: 'shadow-brand-500/25' },
    customers: { bg: 'bg-gradient-to-tr from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/25' },
    bookings: { bg: 'bg-gradient-to-tr from-brand-500 to-orange-600', shadow: 'shadow-brand-500/25' },
    events: { bg: 'bg-gradient-to-tr from-rose-500 to-brand-600', shadow: 'shadow-orange-500/25' },
    galleries: { bg: 'bg-gradient-to-tr from-purple-500 to-pink-600', shadow: 'shadow-rose-500/25' },
    photos: { bg: 'bg-gradient-to-tr from-sky-500 to-indigo-600', shadow: 'shadow-sky-500/25' },
    orders: { bg: 'bg-gradient-to-tr from-brand-500 to-yellow-600', shadow: 'shadow-brand-500/25' },
    payments: { bg: 'bg-gradient-to-tr from-emerald-600 to-green-600', shadow: 'shadow-emerald-500/25' },
    reports: { bg: 'bg-gradient-to-tr from-fuchsia-600 to-purple-600', shadow: 'shadow-fuchsia-500/25' },
    coupons: { bg: 'bg-gradient-to-tr from-brand-500 to-yellow-500', shadow: 'shadow-brand-500/25' },
    packages: { bg: 'bg-gradient-to-tr from-indigo-600 to-violet-600', shadow: 'shadow-indigo-500/25' },
    tasks: { bg: 'bg-gradient-to-tr from-teal-500 to-emerald-600', shadow: 'shadow-teal-500/25' },
    proofs: { bg: 'bg-gradient-to-tr from-purple-500 to-pink-600', shadow: 'shadow-purple-500/25' },
    printing: { bg: 'bg-gradient-to-tr from-cyan-600 to-blue-600', shadow: 'shadow-cyan-500/25' },
    dispatch: { bg: 'bg-gradient-to-tr from-brand-500 to-red-500', shadow: 'shadow-brand-500/25' },
    staff: { bg: 'bg-gradient-to-tr from-rose-600 to-orange-500', shadow: 'shadow-rose-500/25' },
    settings: { bg: 'bg-gradient-to-tr from-slate-700 to-ink-900', shadow: 'shadow-slate-500/25' },
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
    notificationsLink,
    user,
    profileLink,
    onLogout,
}: {
    pageTitle: string;
    activeItem?: NavItem;
    area?: string;
    onMobileMenuOpen: () => void;
    notificationsLink?: string;
    user: any;
    profileLink: string;
    onLogout: () => Promise<void>;
}) {
    const IconComponent = activeItem?.icon ?? LayoutGrid;

    const topbarRole = ROLE_LABELS[(user?.roles[0] as Role) ?? 'CUSTOMER'] ?? area;

    return (
        <header className="portal-topbar">
            <div className="portal-topbar__lead">
                <button type="button" onClick={onMobileMenuOpen} className="portal-icon-btn lg:hidden" aria-label="Open menu">
                    <Menu className="size-5" />
                </button>
                <div className="portal-page-icon">
                    <IconComponent className="size-5" />
                </div>
                <h1 className="portal-page-title">{pageTitle}</h1>
            </div>

            <div className="portal-topbar__trail">
                <label className="portal-search">
                    <Search className="size-4 shrink-0 text-accent-500" aria-hidden />
                    <input type="search" placeholder="Search…" aria-label="Search" />
                </label>
                <NotificationBell allLink={notificationsLink} />
                <div className="portal-topbar-user">
                    <div className="portal-topbar-user__name">
                        {user?.name ?? 'Account'}
                        {topbarRole && topbarRole !== user?.name ? <div className="portal-topbar-user__role">{topbarRole}</div> : null}
                    </div>
                    <UserMenu name={user?.name ?? ''} role={(user?.roles[0] as Role) ?? 'CUSTOMER'} profileLink={profileLink} onLogout={onLogout} />
                </div>
            </div>
        </header>
    );
}

export function PortalLayout({ area, sections, profileLink, notificationsLink }: { area: string; sections: NavSection[]; profileLink: string; notificationsLink?: string }) {
    const { user, can, hasRole, logout } = useAuth();
    const site = useSite();
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    useEffect(() => setMobileOpen(false), [location.pathname]);

    const visible = useMemo(
        () =>
            sections
                .map((s) => ({
                    ...s,
                    items: s.items.filter((i) => (!i.roles?.length || hasRole(...i.roles)) && (!i.anyOf || can(...i.anyOf))),
                }))
                .filter((s) => s.items.length),
        [sections, can, hasRole],
    );

    // Dynamic page title
    const activeItem = visible
        .flatMap((s) => s.items)
        .filter((item) => (item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)))
        .sort((a, b) => b.to.length - a.to.length)[0];
    const areaDashboard = `${area ? area.charAt(0).toUpperCase() + area.slice(1) : 'Admin'} dashboard`;
    const pageTitle =
        location.pathname === profileLink
            ? 'My profile'
            : location.pathname === notificationsLink
              ? 'Notifications'
              : activeItem
                ? activeItem.label.toLowerCase().includes('dashboard')
                    ? areaDashboard
                    : activeItem.label
                : areaDashboard;

    const subtitleText = site.data?.studio.name ?? 'Studio suite';

    const brandHeader = (
        <div className="portal-sidebar__brand">
            <Link to={homeFor(user)} className="portal-brand-link">
                <NammaqrBrand subtitle={subtitleText} dark />
            </Link>
        </div>
    );

    const navContent = (
        <nav className="portal-sidebar__nav" aria-label={`${area} navigation`}>
            {visible.map((s, idx) => {
                const sectionKey = s.title || `section-${idx}`;
                return (
                    <div key={sectionKey}>
                        {s.title ? <p className="portal-nav-section-label">{s.title}</p> : null}
                        <ul>
                            {s.items.map((item) => (
                                <li key={item.to}>
                                    <NavLink
                                        to={item.to}
                                        end={item.end}
                                        className={({ isActive }) => clsx('portal-nav-link', isActive && 'is-active')}
                                    >
                                        <item.icon className="size-[18px]" aria-hidden />
                                        <span className="truncate">{item.label}</span>
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </nav>
    );

    const sidebar = (
        <>
            {brandHeader}
            {navContent}
        </>
    );

    return (
        <div className="portal-shell">
            <div className="portal-grid">
                <aside className="portal-sidebar">{sidebar}</aside>

                {mobileOpen && (
                    <div className="portal-mobile-drawer fixed inset-0 z-40 lg:hidden">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
                        <aside className="portal-sidebar">
                            <div className="portal-sidebar__brand flex items-start justify-between gap-2">
                                <Link to={homeFor(user)} className="portal-brand-link min-w-0 flex-1" onClick={() => setMobileOpen(false)}>
                                    <NammaqrBrand subtitle={subtitleText} dark />
                                </Link>
                                <button type="button" onClick={() => setMobileOpen(false)} className="portal-icon-btn shrink-0 text-white/80" aria-label="Close menu">
                                    <X className="size-5" />
                                </button>
                            </div>
                            {navContent}
                        </aside>
                    </div>
                )}

                <div className="portal-content">
                    <Subheader
                        pageTitle={pageTitle}
                        activeItem={activeItem}
                        area={area}
                        onMobileMenuOpen={() => setMobileOpen(true)}
                        notificationsLink={notificationsLink}
                        user={user}
                        profileLink={profileLink}
                        onLogout={logout}
                    />

                    <main key={location.pathname} className="portal-main page-enter">
                        <div className="portal-main-inner">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </div>
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
                className="relative flex size-9 items-center justify-center rounded-full bg-[image:var(--portal-gold-gradient)] text-sm font-bold text-ink-900 shadow-md ring-2 ring-white transition-transform hover:scale-105 cursor-pointer select-none"
                aria-haspopup="menu"
                aria-expanded={open}
                title={name}
            >
                {initial}
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5 shadow-[var(--soft-shadow-lg)]">
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
