// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import clsx from 'clsx';
import { Camera, Mail, MapPin, Menu, Phone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { ButtonLink } from '../components/ui';
import { homeFor, useAuth } from '../lib/auth';
import { useSite } from '../lib/site';

const LINKS = [
    { to: '/', label: 'Home', end: true },
    { to: '/about', label: 'About' },
    { to: '/services', label: 'Services' },
    { to: '/packages', label: 'Packages' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/gallery', label: 'My Gallery' },
    { to: '/testimonials', label: 'Reviews' },
    { to: '/contact', label: 'Contact' },
];

export function PublicLayout() {
    const site = useSite();
    const { user, status } = useAuth();
    const [open, setOpen] = useState(false);
    const location = useLocation();
    useEffect(() => {
        setOpen(false);
        window.scrollTo(0, 0);
    }, [location.pathname]);
    const studio = site.data?.studio;

    return (
        <div className="flex min-h-dvh flex-col bg-stone-50">
            <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-white/90 backdrop-blur">
                <div className="container-page flex h-16 items-center gap-4">
                    <Link to="/" className="flex items-center gap-2">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-ink-900 text-brand-400">
                            <Camera className="size-5" />
                        </span>
                        <span className="font-display text-lg font-semibold">{studio?.name ?? 'BuildNexDev Studio'}</span>
                    </Link>
                    <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Main">
                        {LINKS.map((l) => (
                            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => clsx('rounded-md px-3 py-2 text-sm font-medium', isActive ? 'text-brand-700' : 'text-stone-600 hover:text-stone-900')}>
                                {l.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="ml-auto flex items-center gap-2 lg:ml-2">
                        {status === 'authenticated' && user ? (
                            <ButtonLink to={homeFor(user)} variant="secondary" size="sm">
                                My account
                            </ButtonLink>
                        ) : (
                            <Link to="/login" className="hidden text-sm font-medium text-stone-700 hover:text-stone-900 sm:inline">
                                Sign in
                            </Link>
                        )}
                        <ButtonLink to="/book" size="sm">
                            Book now
                        </ButtonLink>
                        <button type="button" className="rounded-lg p-2 text-stone-700 hover:bg-stone-100 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
                            {open ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
                {open && (
                    <nav className="border-t border-stone-100 bg-white lg:hidden" aria-label="Mobile">
                        <ul className="container-page grid grid-cols-2 gap-1 py-3">
                            {LINKS.map((l) => (
                                <li key={l.to}>
                                    <NavLink to={l.to} end={l.end} className={({ isActive }) => clsx('block rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-700 hover:bg-stone-50')}>
                                        {l.label}
                                    </NavLink>
                                </li>
                            ))}
                            {status !== 'authenticated' && (
                                <li>
                                    <NavLink to="/login" className="block rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
                                        Sign in
                                    </NavLink>
                                </li>
                            )}
                        </ul>
                    </nav>
                )}
            </header>

            <main className="flex-1">
                <Outlet />
            </main>

            <footer className="bg-ink-900 text-stone-300">
                <div className="container-page grid gap-10 py-12 md:grid-cols-4">
                    <div className="md:col-span-2">
                        <p className="font-display text-xl font-semibold text-white">{studio?.name ?? 'BuildNexDev Studio'}</p>
                        <p className="mt-2 max-w-md text-sm text-stone-400">{studio?.tagline}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {(
                                [
                                    ['Instagram', studio?.instagram],
                                    ['Facebook', studio?.facebook],
                                    ['YouTube', studio?.youtube],
                                ] as const
                            )
                                .filter(([, href]) => !!href)
                                .map(([label, href]) => (
                                    <a key={label} href={href} target="_blank" rel="noreferrer noopener" className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-white/10 hover:text-white">
                                        {label}
                                    </a>
                                ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">Explore</p>
                        <ul className="mt-3 space-y-2 text-sm">
                            {LINKS.slice(1).map((l) => (
                                <li key={l.to}>
                                    <Link to={l.to} className="hover:text-white">
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">Visit us</p>
                        <ul className="mt-3 space-y-2 text-sm">
                            {studio?.address && (
                                <li className="flex gap-2">
                                    <MapPin className="mt-0.5 size-4 shrink-0" />
                                    <span>
                                        {studio.address}
                                        {studio.city ? `, ${studio.city}` : ''}
                                    </span>
                                </li>
                            )}
                            {studio?.phone && (
                                <li className="flex gap-2">
                                    <Phone className="mt-0.5 size-4 shrink-0" />
                                    <a href={`tel:${studio.phone}`} className="hover:text-white">
                                        {studio.phone}
                                    </a>
                                </li>
                            )}
                            {studio?.email && (
                                <li className="flex gap-2">
                                    <Mail className="mt-0.5 size-4 shrink-0" />
                                    <a href={`mailto:${studio.email}`} className="hover:text-white">
                                        {studio.email}
                                    </a>
                                </li>
                            )}
                            {studio?.hours && <li className="text-stone-400">{studio.hours}</li>}
                        </ul>
                    </div>
                </div>
                <div className="border-t border-white/10">
                    <p className="container-page py-4 text-xs text-stone-500">
                        © {new Date().getFullYear()} {studio?.name ?? 'BuildNexDev Studio'}. Platform by BuildNexDev.
                    </p>
                </div>
            </footer>
        </div>
    );
}

export function AuthLayout() {
    const site = useSite();
    const location = useLocation();
    const studioName = site.data?.studio.name ?? 'BuildNexDev Studio';

    // Full screen view for login page (both / and /login)
    if (location.pathname === '/login' || location.pathname === '/') {
        return <Outlet />;
    }

    return (
        <div className="relative min-h-dvh flex flex-col justify-between bg-[#070d17] text-slate-100 selection:bg-blue-600 selection:text-white overflow-hidden">
            {/* Ambient Glowing Orbs */}
            <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-b from-blue-600/25 via-indigo-600/15 to-transparent blur-3xl rounded-full" />
            <div className="pointer-events-none absolute -bottom-32 -left-20 w-[450px] h-[450px] bg-blue-700/10 blur-3xl rounded-full" />
            <div className="pointer-events-none absolute top-1/3 -right-24 w-[400px] h-[400px] bg-indigo-500/10 blur-3xl rounded-full" />

            {/* Subtle Grid Pattern Overlay */}
            <div
                className="pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_90%)]"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            />

            {/* Top Minimal Navigation Header */}
            <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between border-b border-white/5 backdrop-blur-xs">
                <Link to="/" className="flex items-center gap-2 group">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 group-hover:bg-blue-600/30 group-hover:scale-105 transition-all">
                        <Camera className="size-5" />
                    </span>
                    <div className="flex items-center gap-1 font-extrabold tracking-tight text-white text-xl font-sans">
                        <span>buildnexdev</span>
                        <span className="size-2 rounded-full bg-blue-500 mb-0.5 animate-pulse" />
                    </div>
                </Link>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                        <span className="size-1.5 rounded-full bg-blue-400 animate-ping" />
                        Enterprise Studio Platform
                    </div>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <span>Sign in</span>
                    </Link>
                </div>
            </header>

            {/* Centered Content Container */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
                <Outlet />
            </main>

            {/* Bottom Footer */}
            <footer className="relative z-10 w-full px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/5 text-xs text-slate-500">
                <p>© {new Date().getFullYear()} {studioName}. All rights reserved.</p>
                <div className="flex items-center gap-4">
                    <span className="font-semibold text-blue-400/80 tracking-wide">Buildnexdev.in</span>
                </div>
            </footer>
        </div>
    );
}

