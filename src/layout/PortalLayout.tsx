// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import clsx from 'clsx';
import {
    Building2,
    CircleHelp,
    ExternalLink,
    LogOut,
    Menu,
    ShieldCheck,
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
import { ICON_TONE_TILE, toneForPath } from '../utils/iconThemes';
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

/** Sidebar project banner (Buildnex Studio platform). */
export function NammaqrBrand({ dark = false }: { clientName?: string; clientLogoUrl?: string | null; dark?: boolean }) {
    return (
        <div className={clsx('portal-brand-stack select-none', dark && 'portal-brand-dark')}>
            <div className="portal-project-banner">
                <BrandMark variant="light" className="portal-project-banner__mark" />
                <div className="min-w-0">
                    <p className="portal-project-banner__name">Buildnex Studio</p>
                    <p className="portal-project-banner__tag">Project platform</p>
                </div>
            </div>
        </div>
    );
}

export const BuildnexBrand = NammaqrBrand;

function useLiveClock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);
    return now;
}

function TopbarClock() {
    const now = useLiveClock();
    const dateLabel = new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(now);
    const timeLabel = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    }).format(now);

    return (
        <div className="portal-topbar-clock" aria-live="polite">
            <span className="portal-topbar-clock__date">{dateLabel}</span>
            <span key={timeLabel} className="portal-topbar-clock__time">
                {timeLabel}
            </span>
        </div>
    );
}

function Subheader({
    pageTitle,
    area,
    onMobileMenuOpen,
    notificationsLink,
    supportLink,
    user,
    companyName,
    companyLogoUrl,
    profileLink,
    onLogout,
}: {
    pageTitle: string;
    area?: string;
    onMobileMenuOpen: () => void;
    notificationsLink?: string;
    supportLink?: string;
    user: any;
    companyName: string;
    companyLogoUrl?: string | null;
    profileLink: string;
    onLogout: () => Promise<void>;
}) {
    const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
    const topbarRole = isSuperAdmin ? 'Super Admin' : (ROLE_LABELS[(user?.roles[0] as Role) ?? 'CUSTOMER'] ?? area);
    const companyInitial = companyName.trim().charAt(0).toUpperCase() || 'S';

    return (
        <header className="portal-topbar">
            <div className="portal-topbar__lead">
                <button type="button" onClick={onMobileMenuOpen} className="portal-icon-btn lg:hidden" aria-label="Open menu">
                    <Menu className="size-5" />
                </button>

                <div className="portal-topbar-company" title={companyName}>
                    {companyLogoUrl ? (
                        <img src={companyLogoUrl} alt="" className="portal-topbar-company__logo" />
                    ) : (
                        <span className="portal-topbar-company__badge" aria-hidden>
                            {companyInitial}
                        </span>
                    )}
                    <div className="portal-topbar-company__text">
                        <span className="portal-topbar-company__label">Company</span>
                        <span className="portal-topbar-company__name">{companyName}</span>
                    </div>
                </div>

                <h1 className="sr-only">{pageTitle}</h1>
            </div>

            <TopbarClock />

            <div className="portal-topbar__trail">
                <NotificationBell allLink={notificationsLink} />
                {supportLink ? (
                    <Link to={supportLink} className="portal-help-btn" title="Help & support">
                        <CircleHelp className="size-4" aria-hidden />
                        <span className="portal-help-btn__label">Help & support</span>
                    </Link>
                ) : null}
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
    const navigate = useNavigate();
    useEffect(() => setMobileOpen(false), [location.pathname]);

    const isSuperAdmin = hasRole('SUPER_ADMIN');

    // Super Admin is exclusively for SaaS platform company management
    const SUPER_ADMIN_ALLOWED = ['/admin/companies', '/admin/audit-logs', '/admin/profile', '/admin/notifications'];
    useEffect(() => {
        if (isSuperAdmin && !SUPER_ADMIN_ALLOWED.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))) {
            navigate('/admin/companies', { replace: true });
        }
    }, [isSuperAdmin, location.pathname, navigate]);

    const visible = useMemo(() => {
        if (isSuperAdmin) {
            return [
                {
                    title: 'Platform Administration',
                    items: [
                        { to: '/admin/companies', label: 'Companies & Studios', icon: Building2 },
                        { to: '/admin/audit-logs', label: 'Platform Audit Logs', icon: ShieldCheck },
                    ],
                },
            ];
        }
        return sections
            .map((s) => ({
                ...s,
                items: s.items.filter((i) => (!i.roles?.length || hasRole(...i.roles)) && (!i.anyOf || can(...i.anyOf))),
            }))
            .filter((s) => s.items.length);
    }, [sections, can, hasRole, isSuperAdmin]);

    // Dynamic page title
    const activeItem = visible
        .flatMap((s) => s.items)
        .filter((item) => (item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)))
        .sort((a, b) => b.to.length - a.to.length)[0];
    const areaDashboard = isSuperAdmin ? 'Super Admin Portal' : `${area ? area.charAt(0).toUpperCase() + area.slice(1) : 'Admin'} dashboard`;
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

    const companyName = isSuperAdmin
        ? 'Platform Administration'
        : (user?.companyName?.trim() || site.data?.studio?.name?.trim() || 'Your Studio');
    const companyLogoUrl = isSuperAdmin ? null : (user?.companyLogoUrl || null);

    const brandHeader = (
        <div className="portal-sidebar__brand">
            <Link to={homeFor(user)} className="portal-brand-link">
                <NammaqrBrand dark />
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
                            {s.items.map((item) => {
                                const tone = toneForPath(item.to, item.label);
                                return (
                                    <li key={item.to}>
                                        <NavLink
                                            to={item.to}
                                            end={item.end}
                                            className={({ isActive }) => clsx('portal-nav-link', isActive && 'is-active')}
                                        >
                                            <span className={clsx('nq-icon-tile nq-icon-tile--sm portal-nav-icon', ICON_TONE_TILE[tone])} aria-hidden>
                                                <item.icon className="size-3.5" strokeWidth={2.4} />
                                            </span>
                                            <span className="truncate">{item.label}</span>
                                        </NavLink>
                                    </li>
                                );
                            })}
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
                                    <NammaqrBrand dark />
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
                        area={isSuperAdmin ? 'Platform Admin' : area}
                        onMobileMenuOpen={() => setMobileOpen(true)}
                        notificationsLink={notificationsLink}
                        supportLink={isSuperAdmin ? undefined : profileLink.replace(/\/profile\/?$/, '/tickets')}
                        user={user}
                        companyName={companyName}
                        companyLogoUrl={companyLogoUrl}
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
                    {role !== 'SUPER_ADMIN' && (
                        <Link role="menuitem" to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                            <ExternalLink className="size-4 text-slate-400" /> Visit website
                        </Link>
                    )}
                    <div className="my-1 border-t border-slate-100" />
                    <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="size-4" /> Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
