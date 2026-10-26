// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
// AUTHOR : NANDHAKUMAR
// DEVELOPER BY: buildnexdev.in
// Last Edit : 
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
    Layers,
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
    Building2,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { GuestOnly, RequireAuth } from './guards';
import { PortalLayout, type NavSection } from '../layout/PortalLayout';
import { AuthLayout } from '../layout/PublicLayout';
import { RouteError } from '../pages/Error/RouteError';

type Loader = () => Promise<{ default: ComponentType }>;
const page = (load: Loader): Pick<RouteObject, 'lazy'> => ({ lazy: async () => ({ Component: (await load()).default }) });

const ADMIN_ACCESS = ['dashboard.view', 'customers.view', 'bookings.view', 'events.view', 'galleries.manage', 'photos.manage', 'orders.view', 'payments.view', 'pricing.manage', 'users.manage', 'staff.manage', 'reports.view', 'settings.manage', 'audit.view'];

const adminNav: NavSection[] = [
    {
        title: 'Master',
        items: [
            { to: '/admin/staff', label: 'Staff', icon: UserCog, anyOf: ['users.manage', 'staff.manage'] },            { to: '/admin/customers', label: 'Customers', icon: Users, anyOf: ['customers.view', 'customers.manage'] },
            { to: '/admin/services', label: 'Services', icon: Briefcase, anyOf: ['pricing.manage'] },
            { to: '/admin/packages', label: 'Packages', icon: PackageIcon, anyOf: ['pricing.manage'] },
            { to: '/admin/coupons', label: 'Coupons', icon: Tag, anyOf: ['pricing.manage'] },
            { to: '/admin/product-types', label: 'Product types', icon: Layers, anyOf: ['pricing.manage', 'orders.view'] },
            { to: '/admin/products', label: 'Photo products', icon: PackageIcon, anyOf: ['pricing.manage', 'orders.view'] },
          
        ],
    },
    {
        title: 'Operations',
        items: [
            { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck, anyOf: ['bookings.view', 'bookings.manage'] },
            { to: '/admin/photos', label: 'Photos', icon: Image, anyOf: ['photos.manage'] },
            { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, anyOf: ['orders.view', 'orders.manage'] },
            { to: '/admin/printing', label: 'Printing', icon: Printer, anyOf: ['printing.manage'] },
            { to: '/admin/delivery', label: 'Delivery', icon: Truck, anyOf: ['delivery.manage'] },
        ],
    },
    {
        title: 'Event management',
        items: [
            { to: '/admin/events', label: 'Events', icon: Calendar, anyOf: ['events.view', 'events.manage'] },
            { to: '/admin/galleries', label: 'Galleries and QR', icon: Images, anyOf: ['galleries.manage'] },
        ],
    },
    {
        title: 'Asset management',
        items: [
            { to: '/admin/assets', label: 'Studio equipment', icon: Camera, anyOf: ['events.view', 'events.manage'] },
        ],
    },
    {
        title: 'Finance',
        items: [
            { to: '/admin/payments', label: 'Payments', icon: Banknote, anyOf: ['payments.view'] },
        ],
    },
    {
        title: 'Reports',
        items: [
            { to: '/admin/reports', label: 'Reports', icon: BarChart3, anyOf: ['reports.view'] },
        ],
    },
    {
        title: 'Settings',
        items: [
            { to: '/admin/companies', label: 'Studios', icon: Building2, roles: ['SUPER_ADMIN'] },
            { to: '/admin/website', label: 'Website content', icon: Globe, anyOf: ['pricing.manage'] },
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
            { to: '/customer/services', label: 'Services', icon: Briefcase },
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
            { to: '/photographer/camera-setup', label: 'Camera setup', icon: Camera },
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

const profile = page(() => import('../pages/Shared/ProfilePage'));
const notifications = page(() => import('../pages/Shared/NotificationsPage'));

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
                    { path: 'login', ...page(() => import('../pages/Auth/Login/Login')) },
                    { path: 'register', ...page(() => import('../pages/Auth/Register/Register')) },
                    { path: 'forgot-password', ...page(() => import('../pages/Auth/ForgetPassword/ForgotPassword')) },
                    { path: 'reset-password', ...page(() => import('../pages/Auth/ResetPassword/ResetPassword')) },
                ],
            },
            {
                element: <AuthLayout />,
                children: [{ path: 'verify-otp', ...page(() => import('../pages/Auth/VerifyOtp/VerifyOtp')) }],
            },
            { path: 'g/:token', ...page(() => import('../pages/Gallery/QrGallery')) },
            {
                path: 'customer',
                element: (
                    <RequireAuth anyOf={['customer.portal']}>
                        <PortalLayout area="My account" sections={customerNav} profileLink="/customer/profile" notificationsLink="/customer/notifications" />
                    </RequireAuth>
                ),
                children: [
                    { index: true, element: <Navigate to="dashboard" replace /> },
                    { path: 'dashboard', ...page(() => import('../pages/Customer/Dashboard')) },
                    { path: 'profile', ...profile },
                    { path: 'bookings', ...page(() => import('../pages/Customer/Bookings')) },
                    { path: 'services', ...page(() => import('../pages/Customer/Services')) },
                    { path: 'events', ...page(() => import('../pages/Customer/Events')) },
                    { path: 'galleries', ...page(() => import('../pages/Customer/Galleries')) },
                    { path: 'galleries/:id', ...page(() => import('../pages/Gallery/OwnerGallery')) },
                    { path: 'orders', ...page(() => import('../pages/Customer/Orders')) },
                    { path: 'payments', ...page(() => import('../pages/Customer/Payments')) },
                    { path: 'downloads', ...page(() => import('../pages/Customer/Downloads')) },
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
                    { path: 'dashboard', ...page(() => import('../pages/Dashboard/Dashboard')) },
                    { path: 'customers', ...page(() => import('../pages/Customer/Customers')) },
                    { path: 'bookings', ...page(() => import('../pages/Booking/Bookings')) },
                    { path: 'assets', ...page(() => import('../pages/Admin/Assets')) },
                    { path: 'events', ...page(() => import('../pages/Event/Events')) },
                    { path: 'events/:id', ...page(() => import('../pages/Admin/EventDetail')) },
                    { path: 'galleries', ...page(() => import('../pages/Admin/Galleries')) },
                    { path: 'galleries/:id', ...page(() => import('../pages/Admin/GalleryDetail')) },
                    { path: 'photos', ...page(() => import('../pages/Admin/Photos')) },
                    { path: 'upload', ...page(() => import('../pages/Photographer/Upload')) },
                    { path: 'orders', ...page(() => import('../pages/Admin/Orders')) },
                    { path: 'product-types', ...page(() => import('../pages/Admin/ProductTypes')) },
                    { path: 'products', ...page(() => import('../pages/Admin/PhotoProducts')) },
                    { path: 'payments', ...page(() => import('../pages/Admin/Payments')) },
                    { path: 'services', ...page(() => import('../pages/Admin/Services')) },
                    { path: 'packages', ...page(() => import('../pages/Admin/Packages')) },
                    { path: 'coupons', ...page(() => import('../pages/Coupon/Coupons')) },
                    { path: 'companies', ...page(() => import('../pages/Company/Companies')) },
                    { path: 'website', ...page(() => import('../pages/Admin/Website')) },
                    { path: 'staff', ...page(() => import('../pages/Admin/Staff')) },
                    { path: 'access/*', element: <Navigate to="/admin/staff" replace /> },
                    { path: 'photographers', ...page(() => import('../pages/Admin/Photographers')) },
                    { path: 'editors', ...page(() => import('../pages/Admin/Editors')) },
                    { path: 'printing', ...page(() => import('../pages/Admin/Printing')) },
                    { path: 'delivery', ...page(() => import('../pages/Admin/Delivery')) },
                    { path: 'reports', ...page(() => import('../pages/Admin/Reports')) },
                    { path: 'settings', ...page(() => import('../pages/Admin/Settings')) },
                    { path: 'audit-logs', ...page(() => import('../pages/Audit/AuditLogs')) },
                    { path: 'profile', ...profile },
                    { path: 'notifications', ...notifications },
                ],
            },
            { index: true, element: <Navigate to="/login" replace /> },
            { path: 'shop', ...page(() => import('../pages/Shop/PhotoShop')) },
            {
                path: 'photographer',
                element: (
                    <RequireAuth anyOf={['photos.upload']}>
                        <PortalLayout area="Photographer" sections={photographerNav} profileLink="/photographer/profile" notificationsLink="/photographer/notifications" />
                    </RequireAuth>
                ),
                children: [
                    { index: true, element: <Navigate to="dashboard" replace /> },
                    { path: 'dashboard', ...page(() => import('../pages/Photographer/Dashboard')) },
                    { path: 'events', ...page(() => import('../pages/Photographer/Events')) },
                    { path: 'event/:id', ...page(() => import('../pages/Photographer/EventDetail')) },
                    { path: 'upload', ...page(() => import('../pages/Photographer/Upload')) },
                    { path: 'camera-setup', ...page(() => import('../pages/Photographer/CameraSetup')) },
                    { path: 'tasks', ...page(() => import('../pages/Photographer/Tasks')) },
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
                    { path: 'dashboard', ...page(() => import('../pages/Editor/Dashboard')) },
                    { path: 'tasks', ...page(() => import('../pages/Editor/Tasks')) },
                    { path: 'photos', ...page(() => import('../pages/Editor/Photos')) },
                    { path: 'albums', ...page(() => import('../pages/Editor/Albums')) },
                    { path: 'proofs', ...page(() => import('../pages/Editor/Proofs')) },
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
                    { path: 'dashboard', ...page(() => import('../pages/Delivery/Dashboard')) },
                    { path: 'orders', ...page(() => import('../pages/Delivery/Orders')) },
                    { path: 'printing', ...page(() => import('../pages/Delivery/Printing')) },
                    { path: 'dispatch', ...page(() => import('../pages/Delivery/Dispatch')) },
                    { path: 'profile', ...profile },
                    { path: 'notifications', ...notifications },
                ],
            },
            { path: '*', ...page(() => import('../pages/Error/NotFoundPage')) },
        ],
    },
]);
