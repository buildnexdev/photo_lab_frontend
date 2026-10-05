import {
    Banknote,
    BarChart3,
    BookOpen,
    Briefcase,
    Calendar,
    CalendarCheck,
    Camera,
    ClipboardList,
    Download,
    Globe,
    Image,
    Images,
    LayoutDashboard,
    ListChecks,
    Package as PackageIcon,
    Palette,
    Printer,
    Receipt,
    Settings,
    ShieldCheck,
    ShoppingBag,
    Tag,
    Truck,
    Upload,
    User,
    UserCog,
    Users,
    Bell,
    Wand2,
    BookImage,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { GuestOnly, RequireAuth } from './layouts/guards';
import { PortalLayout, type NavSection } from './layouts/PortalLayout';
import { AuthLayout } from './layouts/PublicLayout';
import { RouteError } from './pages/RouteError';

type Loader = () => Promise<{ default: ComponentType }>;
const page = (load: Loader): Pick<RouteObject, 'lazy'> => ({ lazy: async () => ({ Component: (await load()).default }) });

const ADMIN_ACCESS = ['dashboard.view', 'customers.view', 'bookings.view', 'events.view', 'galleries.manage', 'photos.manage', 'orders.view', 'payments.view', 'pricing.manage', 'users.manage', 'staff.manage', 'reports.view', 'settings.manage', 'audit.view'];

const adminNav: NavSection[] = [
    { items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, anyOf: ['dashboard.view', 'reports.view'] }] },
    {
        title: 'Studio',
        items: [
            { to: '/admin/customers', label: 'Customers', icon: Users, anyOf: ['customers.view', 'customers.manage'] },
            { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck, anyOf: ['bookings.view', 'bookings.manage'] },
            { to: '/admin/events', label: 'Events', icon: Calendar, anyOf: ['events.view', 'events.manage'] },
            { to: '/admin/galleries', label: 'Galleries & QR', icon: Images, anyOf: ['galleries.manage'] },
            { to: '/admin/photos', label: 'Photos', icon: Image, anyOf: ['photos.manage'] },
        ],
    },
    {
        title: 'Sales',
        items: [
            { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, anyOf: ['orders.view', 'orders.manage'] },
            { to: '/admin/payments', label: 'Payments', icon: Banknote, anyOf: ['payments.view'] },
            { to: '/admin/services', label: 'Services', icon: Briefcase, anyOf: ['pricing.manage'] },
            { to: '/admin/packages', label: 'Packages', icon: PackageIcon, anyOf: ['pricing.manage'] },
            { to: '/admin/coupons', label: 'Coupons', icon: Tag, anyOf: ['pricing.manage'] },
            { to: '/admin/website', label: 'Website content', icon: Globe, anyOf: ['pricing.manage'] },
        ],
    },
    {
        title: 'Team',
        items: [
            { to: '/admin/staff', label: 'Staff', icon: UserCog, anyOf: ['users.manage', 'staff.manage'] },
            { to: '/admin/photographers', label: 'Photographers', icon: Camera, anyOf: ['users.manage', 'staff.manage'] },
            { to: '/admin/editors', label: 'Editors', icon: Palette, anyOf: ['users.manage', 'staff.manage'] },
        ],
    },
    {
        title: 'Production',
        items: [
            { to: '/admin/printing', label: 'Printing', icon: Printer, anyOf: ['printing.manage'] },
            { to: '/admin/delivery', label: 'Delivery', icon: Truck, anyOf: ['delivery.manage'] },
        ],
    },
    {
        title: 'Insights',
        items: [
            { to: '/admin/reports', label: 'Reports', icon: BarChart3, anyOf: ['reports.view'] },
            { to: '/admin/settings', label: 'Settings', icon: Settings, anyOf: ['settings.manage', 'pricing.manage', 'roles.manage'] },
            { to: '/admin/audit-logs', label: 'Audit logs', icon: ShieldCheck, anyOf: ['audit.view'] },
        ],
    },
];

const customerNav: NavSection[] = [
    {
        items: [
            { to: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/customer/bookings', label: 'Bookings', icon: CalendarCheck },
            { to: '/customer/events', label: 'Events & albums', icon: Calendar },
            { to: '/customer/galleries', label: 'Galleries', icon: Images },
            { to: '/customer/orders', label: 'Orders', icon: ShoppingBag },
            { to: '/customer/payments', label: 'Payments', icon: Receipt },
            { to: '/customer/downloads', label: 'Downloads', icon: Download },
            { to: '/customer/notifications', label: 'Notifications', icon: Bell },
            { to: '/customer/profile', label: 'Profile', icon: User },
        ],
    },
];

const photographerNav: NavSection[] = [
    {
        items: [
            { to: '/photographer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/photographer/events', label: 'My events', icon: Calendar },
            { to: '/photographer/upload', label: 'Upload', icon: Upload },
            { to: '/photographer/tasks', label: 'Tasks', icon: ListChecks },
            { to: '/photographer/profile', label: 'Profile', icon: User },
        ],
    },
];

const editorNav: NavSection[] = [
    {
        items: [
            { to: '/editor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/editor/tasks', label: 'Tasks', icon: ClipboardList, anyOf: ['photos.edit'] },
            { to: '/editor/photos', label: 'Photos', icon: Wand2, anyOf: ['photos.edit'] },
            { to: '/editor/albums', label: 'Albums', icon: BookImage, anyOf: ['proofs.manage'] },
            { to: '/editor/proofs', label: 'Proofs & revisions', icon: BookOpen, anyOf: ['proofs.manage'] },
            { to: '/editor/profile', label: 'Profile', icon: User },
        ],
    },
];

const deliveryNav: NavSection[] = [
    {
        items: [
            { to: '/delivery/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/delivery/orders', label: 'Orders', icon: ShoppingBag, anyOf: ['orders.view'] },
            { to: '/delivery/printing', label: 'Printing', icon: Printer, anyOf: ['printing.manage'] },
            { to: '/delivery/dispatch', label: 'Dispatch', icon: Truck, anyOf: ['delivery.manage'] },
            { to: '/delivery/profile', label: 'Profile', icon: User },
        ],
    },
];

const profile = page(() => import('./pages/shared/ProfilePage'));
const notifications = page(() => import('./pages/shared/NotificationsPage'));

export const router = createBrowserRouter([
    {
        errorElement: <RouteError />,
        children: [
            {
                element: (
                    <GuestOnly>
                        <AuthLayout />
                    </GuestOnly>
                ),
                children: [
                    { index: true, ...page(() => import('./pages/auth/Login')) },
                    { path: 'login', ...page(() => import('./pages/auth/Login')) },
                    { path: 'register', ...page(() => import('./pages/auth/Register')) },
                    { path: 'forgot-password', ...page(() => import('./pages/auth/ForgotPassword')) },
                    { path: 'reset-password', ...page(() => import('./pages/auth/ResetPassword')) },
                ],
            },
            {
                element: <AuthLayout />,
                children: [{ path: 'verify-otp', ...page(() => import('./pages/auth/VerifyOtp')) }],
            },
            { path: 'g/:token', ...page(() => import('./pages/gallery/QrGallery')) },
            {
                path: 'customer',
                element: (
                    <RequireAuth anyOf={['customer.portal']}>
                        <PortalLayout area="My account" sections={customerNav} profileLink="/customer/profile" notificationsLink="/customer/notifications" />
                    </RequireAuth>
                ),
                children: [
                    { index: true, element: <Navigate to="dashboard" replace /> },
                    { path: 'dashboard', ...page(() => import('./pages/customer/Dashboard')) },
                    { path: 'profile', ...profile },
                    { path: 'bookings', ...page(() => import('./pages/customer/Bookings')) },
                    { path: 'events', ...page(() => import('./pages/customer/Events')) },
                    { path: 'galleries', ...page(() => import('./pages/customer/Galleries')) },
                    { path: 'galleries/:id', ...page(() => import('./pages/gallery/OwnerGallery')) },
                    { path: 'orders', ...page(() => import('./pages/customer/Orders')) },
                    { path: 'payments', ...page(() => import('./pages/customer/Payments')) },
                    { path: 'downloads', ...page(() => import('./pages/customer/Downloads')) },
                    { path: 'notifications', ...notifications },
                ],
            },
            {
                path: 'admin',
                element: (
                    <RequireAuth anyOf={ADMIN_ACCESS}>
                        <PortalLayout area="Studio admin" sections={adminNav} profileLink="/admin/profile" notificationsLink="/admin/notifications" />
                    </RequireAuth>
                ),
                children: [
                    { index: true, element: <Navigate to="dashboard" replace /> },
                    { path: 'dashboard', ...page(() => import('./pages/admin/Dashboard')) },
                    { path: 'customers', ...page(() => import('./pages/admin/Customers')) },
                    { path: 'bookings', ...page(() => import('./pages/admin/Bookings')) },
                    { path: 'events', ...page(() => import('./pages/admin/Events')) },
                    { path: 'events/:id', ...page(() => import('./pages/admin/EventDetail')) },
                    { path: 'galleries', ...page(() => import('./pages/admin/Galleries')) },
                    { path: 'galleries/:id', ...page(() => import('./pages/admin/GalleryDetail')) },
                    { path: 'photos', ...page(() => import('./pages/admin/Photos')) },
                    { path: 'orders', ...page(() => import('./pages/admin/Orders')) },
                    { path: 'payments', ...page(() => import('./pages/admin/Payments')) },
                    { path: 'services', ...page(() => import('./pages/admin/Services')) },
                    { path: 'packages', ...page(() => import('./pages/admin/Packages')) },
                    { path: 'coupons', ...page(() => import('./pages/admin/Coupons')) },
                    { path: 'website', ...page(() => import('./pages/admin/Website')) },
                    { path: 'staff', ...page(() => import('./pages/admin/Staff')) },
                    { path: 'photographers', ...page(() => import('./pages/admin/Photographers')) },
                    { path: 'editors', ...page(() => import('./pages/admin/Editors')) },
                    { path: 'printing', ...page(() => import('./pages/admin/Printing')) },
                    { path: 'delivery', ...page(() => import('./pages/admin/Delivery')) },
                    { path: 'reports', ...page(() => import('./pages/admin/Reports')) },
                    { path: 'settings', ...page(() => import('./pages/admin/Settings')) },
                    { path: 'audit-logs', ...page(() => import('./pages/admin/AuditLogs')) },
                    { path: 'profile', ...profile },
                    { path: 'notifications', ...notifications },
                ],
            },
            {
                path: 'photographer',
                element: (
                    <RequireAuth anyOf={['photos.upload']}>
                        <PortalLayout area="Photographer" sections={photographerNav} profileLink="/photographer/profile" notificationsLink="/photographer/notifications" />
                    </RequireAuth>
                ),
                children: [
                    { index: true, element: <Navigate to="dashboard" replace /> },
                    { path: 'dashboard', ...page(() => import('./pages/photographer/Dashboard')) },
                    { path: 'events', ...page(() => import('./pages/photographer/Events')) },
                    { path: 'event/:id', ...page(() => import('./pages/photographer/EventDetail')) },
                    { path: 'upload', ...page(() => import('./pages/photographer/Upload')) },
                    { path: 'tasks', ...page(() => import('./pages/photographer/Tasks')) },
                    { path: 'profile', ...profile },
                    { path: 'notifications', ...notifications },
                ],
            },
            {
                path: 'editor',
                element: (
                    <RequireAuth anyOf={['photos.edit', 'proofs.manage']}>
                        <PortalLayout area="Editor / Designer" sections={editorNav} profileLink="/editor/profile" notificationsLink="/editor/notifications" />
                    </RequireAuth>
                ),
                children: [
                    { index: true, element: <Navigate to="dashboard" replace /> },
                    { path: 'dashboard', ...page(() => import('./pages/editor/Dashboard')) },
                    { path: 'tasks', ...page(() => import('./pages/editor/Tasks')) },
                    { path: 'photos', ...page(() => import('./pages/editor/Photos')) },
                    { path: 'albums', ...page(() => import('./pages/editor/Albums')) },
                    { path: 'proofs', ...page(() => import('./pages/editor/Proofs')) },
                    { path: 'profile', ...profile },
                    { path: 'notifications', ...notifications },
                ],
            },
            {
                path: 'delivery',
                element: (
                    <RequireAuth anyOf={['printing.manage', 'delivery.manage']}>
                        <PortalLayout area="Printing & delivery" sections={deliveryNav} profileLink="/delivery/profile" notificationsLink="/delivery/notifications" />
                    </RequireAuth>
                ),
                children: [
                    { index: true, element: <Navigate to="dashboard" replace /> },
                    { path: 'dashboard', ...page(() => import('./pages/delivery/Dashboard')) },
                    { path: 'orders', ...page(() => import('./pages/delivery/Orders')) },
                    { path: 'printing', ...page(() => import('./pages/delivery/Printing')) },
                    { path: 'dispatch', ...page(() => import('./pages/delivery/Dispatch')) },
                    { path: 'profile', ...profile },
                    { path: 'notifications', ...notifications },
                ],
            },
            { path: '*', ...page(() => import('./pages/NotFound')) },
        ],
    },
]);
