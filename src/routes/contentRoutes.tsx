import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate, useRouteError, type RouteObject } from 'react-router';
import { PortalLayout } from '../layout/PortalLayout';
import { AuthLayout } from '../layout/PublicLayout';
import { loginPages } from '../menu';
import { adminAside, customerAside, deliveryAside, editorAside, photographerAside } from './asideRoutes';
import footers from './footerRoutes';
import { GuestOnly, RequireAuth } from './guards';
import { adminHeader, customerHeader, deliveryHeader, editorHeader, photographerHeader } from './headerRoutes';
import { useAuth } from '../hooks/useAuth';

function AdminIndexRedirect() {
    const { hasRole } = useAuth();
    if (hasRole('SUPER_ADMIN')) {
        return <Navigate to="/admin/companies" replace />;
    }
    return <Navigate to="dashboard" replace />;
}

const page = (load: () => Promise<{ default: ComponentType }>): Pick<RouteObject, 'lazy'> => ({
    lazy: async () => ({ Component: (await load()).default }),
});

if (!footers.some((item) => item.path === loginPages.login.path && item.element === null)) {
    throw new Error('Login is missing from the plain footer routes');
}

const ADMIN_ACCESS = ['dashboard.view', 'customers.view', 'bookings.view', 'events.view', 'galleries.manage', 'photos.manage', 'orders.view', 'payments.view', 'pricing.manage', 'users.manage', 'staff.manage', 'reports.view', 'settings.manage', 'audit.view'];

const profile = page(() => import('../pages/Shared/ProfilePage'));
const notifications = page(() => import('../pages/Shared/NotificationsPage'));

export const router = createBrowserRouter([
    {
        errorElement: <NotFoundRoute />,
        children: [
            {
                element: (
                    <GuestOnly>
                        <AuthLayout />
                    </GuestOnly>
                ),
                children: [
                    { path: loginPages.login.path.slice(1), ...page(() => import('../pages/auth/Login/Login')) },
                    { path: loginPages.register.path.slice(1), ...page(() => import('../pages/auth/Register/Register')) },
                    { path: loginPages.forgotPassword.path.slice(1), ...page(() => import('../pages/auth/ForgetPassword/ForgotPassword')) },
                ],
            },
            { path: 'reset-password', ...page(() => import('../pages/auth/ResetPassword/ResetPassword')) },
            { path: 'verify-otp', ...page(() => import('../pages/auth/VerifyOtp/VerifyOtp')) },
            {
                path: 'admin',
                element: (
                    <RequireAuth anyOf={ADMIN_ACCESS}>
                        <PortalLayout area={adminHeader.area} sections={adminAside} profileLink={adminHeader.profileLink} notificationsLink={adminHeader.notificationsLink} />
                    </RequireAuth>
                ),
                children: [
                    { index: true, element: <AdminIndexRedirect /> },
                    { path: 'dashboard', ...page(() => import('../pages/Dashboard/Dashboard')) },
                    { path: 'customers', ...page(() => import('../pages/Customer/Customers')) },
                    { path: 'bookings', ...page(() => import('../pages/Booking/Bookings')) },
                    { path: 'events', ...page(() => import('../pages/Event/Events')) },
                    { path: 'events/:id/upload', ...page(() => import('../pages/Admin/EventUpload')) },
                    { path: 'events/:id', ...page(() => import('../pages/Admin/EventDetail')) },
                    { path: 'galleries', ...page(() => import('../pages/Admin/Galleries')) },
                    { path: 'galleries/:id', ...page(() => import('../pages/Admin/GalleryDetail')) },
                    { path: 'qr/create', ...page(() => import('../pages/Admin/QrCreate')) },
                    { path: 'qr', ...page(() => import('../pages/Admin/QrManage')) },
                    { path: 'photos', ...page(() => import('../pages/Admin/Photos')) },
                    { path: 'assets', ...page(() => import('../pages/Admin/Assets')) },
                    { path: 'upload', ...page(() => import('../pages/Photographer/Upload')) },
                    { path: 'orders', ...page(() => import('../pages/Admin/Orders')) },
                    { path: 'product-types', ...page(() => import('../pages/Admin/ProductTypes')) },
                    { path: 'products', element: <Navigate to="/admin/settings?tab=products" replace /> },
                    { path: 'payments', ...page(() => import('../pages/Admin/Payments')) },
                    { path: 'payroll', ...page(() => import('../pages/Admin/Payroll')) },
                    { path: 'closing/day', ...page(() => import('../pages/Admin/EndOfDay')) },
                    { path: 'closing/month', ...page(() => import('../pages/Admin/EndOfMonth')) },
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
            {
                path: 'customer',
                element: (
                    <RequireAuth anyOf={['customer.portal']}>
                        <PortalLayout area={customerHeader.area} sections={customerAside} profileLink={customerHeader.profileLink} notificationsLink={customerHeader.notificationsLink} />
                    </RequireAuth>
                ),
                children: [
                    { index: true, element: <Navigate to="dashboard" replace /> },
                    { path: 'dashboard', ...page(() => import('../pages/Customer/Dashboard')) },
                    { path: 'bookings', ...page(() => import('../pages/Customer/Bookings')) },
                    { path: 'services', ...page(() => import('../pages/Customer/Services')) },
                    { path: 'events', ...page(() => import('../pages/Customer/Events')) },
                    { path: 'galleries', ...page(() => import('../pages/Customer/Galleries')) },
                    { path: 'galleries/:id', ...page(() => import('../pages/gallery/OwnerGallery')) },
                    { path: 'orders', ...page(() => import('../pages/Customer/Orders')) },
                    { path: 'payments', ...page(() => import('../pages/Customer/Payments')) },
                    { path: 'downloads', ...page(() => import('../pages/Customer/Downloads')) },
                    { path: 'notifications', ...notifications },
                    { path: 'profile', ...profile },
                ],
            },
            {
                path: 'photographer',
                element: (
                    <RequireAuth anyOf={['photos.upload']}>
                        <PortalLayout area={photographerHeader.area} sections={photographerAside} profileLink={photographerHeader.profileLink} notificationsLink={photographerHeader.notificationsLink} />
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
                        <PortalLayout area={editorHeader.area} sections={editorAside} profileLink={editorHeader.profileLink} notificationsLink={editorHeader.notificationsLink} />
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
                    <RequireAuth anyOf={['printing.manage', 'delivery.manage', 'orders.view']}>
                        <PortalLayout area={deliveryHeader.area} sections={deliveryAside} profileLink={deliveryHeader.profileLink} notificationsLink={deliveryHeader.notificationsLink} />
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
            { path: 'shop', ...page(() => import('../pages/Shop/PhotoShop')) },
            { path: 'gallery', ...page(() => import('../pages/gallery/QrGallery')) },
            { path: 'g/:token', ...page(() => import('../pages/gallery/QrGallery')) },
            { path: loginPages.page404.path.slice(1), ...page(() => import('../pages/Error/NotFoundPage')) },
            { index: true, element: <Navigate to={loginPages.login.path} replace /> },
            { path: '*', ...page(() => import('../pages/Error/NotFoundPage')) },
        ],
    },
]);

function NotFoundRoute() {
    const error = useRouteError();
    if (import.meta.env.DEV && error) console.error('Route error:', error);
    return <Navigate to={loginPages.page404.path} replace />;
}

void footers;

export default router;
