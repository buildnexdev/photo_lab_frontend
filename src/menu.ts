/*
 * Developer by: Buildnexdev.in
 * Devevloper : Nandhakumar@gmail.com
 * Last Edited : 06-10-2026
 */
import type { Role } from './hooks/useAuth';

export interface MenuLeaf {
    id: string;
    text: string;
    path: string;
    icon: string;
    end?: boolean;
    hide?: boolean;
    anyOf?: string[];
    roles?: Role[];
}

export interface MenuGroup {
    id: string;
    text: string;
    path: string;
    icon: string;
    subMenu: Record<string, MenuLeaf>;
}

const item = (leaf: MenuLeaf): MenuLeaf => leaf;

export const loginPages = {
    login: item({ id: 'login', text: 'Login', path: '/login', icon: 'LogIn', hide: true }),
    register: item({ id: 'register', text: 'Register', path: '/register', icon: 'UserPlus', hide: true }),
    forgotPassword: item({ id: 'forgotPassword', text: 'Forgot password', path: '/forgot-password', icon: 'KeyRound', hide: true }),
    dashboard: item({ id: 'dashboard', text: 'Dashboard', path: '/admin/dashboard', icon: 'LayoutDashboard', hide: true }),
    page404: item({ id: 'page404', text: 'Page not found', path: '/404', icon: 'FileQuestion', hide: true }),
};

export const userManagementPageMenu: MenuGroup = {
    id: 'userManagement',
    text: 'User management',
    path: '/admin/staff',
    icon: 'UserCog',
    subMenu: {
        staff: item({ id: 'staff', text: 'Staff', path: '/admin/staff', icon: 'UserCog', anyOf: ['users.manage', 'staff.manage'] }),    },
};

export const customerManagementPageMenu: MenuGroup = {
    id: 'customerManagement',
    text: 'Customer management',
    path: '/admin/customers',
    icon: 'Users',
    subMenu: {
        customers: item({ id: 'customers', text: 'Customers', path: '/admin/customers', icon: 'Users', anyOf: ['customers.view', 'customers.manage'] }),
        bookings: item({ id: 'bookings', text: 'Bookings', path: '/admin/bookings', icon: 'CalendarCheck', anyOf: ['bookings.view', 'bookings.manage'] }),
    },
};

export const eventManagementPageMenu: MenuGroup = {
    id: 'eventManagement',
    text: 'Event management',
    path: '/admin/events',
    icon: 'Calendar',
    subMenu: {
        events: item({ id: 'events', text: 'Events', path: '/admin/events', icon: 'Calendar', anyOf: ['events.view', 'events.manage'] }),
        galleries: item({ id: 'galleries', text: 'Galleries and QR', path: '/admin/galleries', icon: 'Images', anyOf: ['galleries.manage'] }),
        createQr: item({ id: 'createQr', text: 'Create QR', path: '/admin/qr/create', icon: 'QrCode', anyOf: ['galleries.manage'] }),
        manageQr: item({ id: 'manageQr', text: 'Manage QR', path: '/admin/qr', icon: 'ScanLine', end: true, anyOf: ['galleries.manage'] }),
        photos: item({ id: 'photos', text: 'Photos', path: '/admin/photos', icon: 'Image', anyOf: ['photos.manage'] }),
    },
};

export const packageManagementPageMenu: MenuGroup = {
    id: 'packageManagement',
    text: 'Package management',
    path: '/admin/services',
    icon: 'Briefcase',
    subMenu: {
        services: item({ id: 'services', text: 'Services', path: '/admin/services', icon: 'Briefcase', anyOf: ['pricing.manage'] }),
        packages: item({ id: 'packages', text: 'Packages', path: '/admin/packages', icon: 'Package', anyOf: ['pricing.manage'] }),
        coupons: item({ id: 'coupons', text: 'Coupons', path: '/admin/coupons', icon: 'Tag', anyOf: ['pricing.manage'] }),
    },
};

export const productManagementPageMenu: MenuGroup = {
    id: 'productManagement',
    text: 'Master management',
    path: '/admin/products',
    icon: 'Layers',
    subMenu: {
        productTypes: item({ id: 'productTypes', text: 'Product types', path: '/admin/product-types', icon: 'Layers', anyOf: ['pricing.manage', 'orders.view'] }),
        products: item({ id: 'products', text: 'Photo products', path: '/admin/products', icon: 'Package', anyOf: ['pricing.manage', 'orders.view'] }),
    },
};

export const orderManagementPageMenu: MenuGroup = {
    id: 'orderManagement',
    text: 'Operations management',
    path: '/admin/orders',
    icon: 'ShoppingBag',
    subMenu: {
        orders: item({ id: 'orders', text: 'Orders', path: '/admin/orders', icon: 'ShoppingBag', anyOf: ['orders.view', 'orders.manage'] }),
        printing: item({ id: 'printing', text: 'Printing', path: '/admin/printing', icon: 'Printer', anyOf: ['printing.manage'] }),
        delivery: item({ id: 'delivery', text: 'Delivery', path: '/admin/delivery', icon: 'Truck', anyOf: ['delivery.manage'] }),
    },
};

export const assetManagementPageMenu: MenuGroup = {
    id: 'assetManagement',
    text: 'Asset management',
    path: '/admin/assets',
    icon: 'Camera',
    subMenu: {
        equipment: item({ id: 'equipment', text: 'Studio equipment', path: '/admin/assets', icon: 'Camera', anyOf: ['events.view', 'events.manage'] }),
    },
};

export const financePageMenu: MenuGroup = {
    id: 'finance',
    text: 'Finance management',
    path: '/admin/payments',
    icon: 'Banknote',
    subMenu: {
        payments: item({ id: 'payments', text: 'Payments', path: '/admin/payments', icon: 'Banknote', anyOf: ['payments.view'] }),
    },
};

export const reportsPageMenu: MenuGroup = {
    id: 'reports',
    text: 'Reports management',
    path: '/admin/reports',
    icon: 'BarChart3',
    subMenu: {
        reports: item({ id: 'reports', text: 'Reports', path: '/admin/reports', icon: 'BarChart3', anyOf: ['reports.view'] }),
    },
};

export const settingsPageMenu: MenuGroup = {
    id: 'settings',
    text: 'System settings',
    path: '/admin/settings',
    icon: 'Settings',
    subMenu: {
        studios: item({ id: 'studios', text: 'Studios', path: '/admin/companies', icon: 'Building2', roles: ['SUPER_ADMIN'] }),
        website: item({ id: 'website', text: 'Website content', path: '/admin/website', icon: 'Globe', anyOf: ['pricing.manage'] }),
        settings: item({ id: 'settings', text: 'Settings', path: '/admin/settings', icon: 'Settings', anyOf: ['settings.manage', 'pricing.manage', 'roles.manage'] }),
        audit: item({ id: 'audit', text: 'Audit logs', path: '/admin/audit-logs', icon: 'ShieldCheck', anyOf: ['audit.view'] }),
    },
};

export const adminOverviewMenu: MenuGroup = {
    id: 'overview',
    text: '',
    path: '/admin/dashboard',
    icon: 'LayoutDashboard',
    subMenu: {
        dashboard: item({ id: 'adminDashboard', text: 'Dashboard', path: '/admin/dashboard', icon: 'LayoutDashboard', end: true }),
    },
};

export const adminMenus: MenuGroup[] = [
    adminOverviewMenu,
    userManagementPageMenu,
    customerManagementPageMenu,
    eventManagementPageMenu,
    packageManagementPageMenu,
    productManagementPageMenu,
    orderManagementPageMenu,
    assetManagementPageMenu,
    financePageMenu,
    reportsPageMenu,
    settingsPageMenu,
];

export const customerPageMenu: MenuGroup = {
    id: 'customer',
    text: '',
    path: '/customer/dashboard',
    icon: 'LayoutDashboard',
    subMenu: {
        dashboard: item({ id: 'customerDashboard', text: 'Dashboard', path: '/customer/dashboard', icon: 'LayoutDashboard' }),
        bookings: item({ id: 'customerBookings', text: 'Bookings', path: '/customer/bookings', icon: 'CalendarCheck' }),
        services: item({ id: 'customerServices', text: 'Services', path: '/customer/services', icon: 'Briefcase' }),
        events: item({ id: 'customerEvents', text: 'Events and albums', path: '/customer/events', icon: 'Calendar' }),
        galleries: item({ id: 'customerGalleries', text: 'Galleries', path: '/customer/galleries', icon: 'Images' }),
        orders: item({ id: 'customerOrders', text: 'Orders', path: '/customer/orders', icon: 'ShoppingBag' }),
        payments: item({ id: 'customerPayments', text: 'Payments', path: '/customer/payments', icon: 'Receipt' }),
        downloads: item({ id: 'customerDownloads', text: 'Downloads', path: '/customer/downloads', icon: 'Download' }),
        notifications: item({ id: 'customerNotifications', text: 'Notifications', path: '/customer/notifications', icon: 'Bell' }),
        profile: item({ id: 'customerProfile', text: 'Profile', path: '/customer/profile', icon: 'User' }),
    },
};

export const photographerPageMenu: MenuGroup = {
    id: 'photographer',
    text: '',
    path: '/photographer/dashboard',
    icon: 'Camera',
    subMenu: {
        dashboard: item({ id: 'photographerDashboard', text: 'Dashboard', path: '/photographer/dashboard', icon: 'LayoutDashboard' }),
        events: item({ id: 'photographerEvents', text: 'My events', path: '/photographer/events', icon: 'Calendar' }),
        upload: item({ id: 'photographerUpload', text: 'Upload', path: '/photographer/upload', icon: 'Upload' }),
        camera: item({ id: 'photographerCamera', text: 'Camera setup', path: '/photographer/camera-setup', icon: 'Camera' }),
        tasks: item({ id: 'photographerTasks', text: 'Tasks', path: '/photographer/tasks', icon: 'ListChecks' }),
        profile: item({ id: 'photographerProfile', text: 'Profile', path: '/photographer/profile', icon: 'User' }),
    },
};

export const editorPageMenu: MenuGroup = {
    id: 'editor',
    text: '',
    path: '/editor/dashboard',
    icon: 'Wand2',
    subMenu: {
        dashboard: item({ id: 'editorDashboard', text: 'Dashboard', path: '/editor/dashboard', icon: 'LayoutDashboard' }),
        tasks: item({ id: 'editorTasks', text: 'Tasks', path: '/editor/tasks', icon: 'ClipboardList', anyOf: ['photos.edit'] }),
        photos: item({ id: 'editorPhotos', text: 'Photos', path: '/editor/photos', icon: 'Wand2', anyOf: ['photos.edit'] }),
        albums: item({ id: 'editorAlbums', text: 'Albums', path: '/editor/albums', icon: 'BookImage', anyOf: ['proofs.manage'] }),
        proofs: item({ id: 'editorProofs', text: 'Proofs and revisions', path: '/editor/proofs', icon: 'BookOpen', anyOf: ['proofs.manage'] }),
        profile: item({ id: 'editorProfile', text: 'Profile', path: '/editor/profile', icon: 'User' }),
    },
};

export const deliveryPageMenu: MenuGroup = {
    id: 'delivery',
    text: '',
    path: '/delivery/dashboard',
    icon: 'Truck',
    subMenu: {
        dashboard: item({ id: 'deliveryDashboard', text: 'Dashboard', path: '/delivery/dashboard', icon: 'LayoutDashboard' }),
        orders: item({ id: 'deliveryOrders', text: 'Orders', path: '/delivery/orders', icon: 'ShoppingBag', anyOf: ['orders.view'] }),
        printing: item({ id: 'deliveryPrinting', text: 'Printing', path: '/delivery/printing', icon: 'Printer', anyOf: ['printing.manage'] }),
        dispatch: item({ id: 'deliveryDispatch', text: 'Dispatch', path: '/delivery/dispatch', icon: 'Truck', anyOf: ['delivery.manage'] }),
        profile: item({ id: 'deliveryProfile', text: 'Profile', path: '/delivery/profile', icon: 'User' }),
    },
};

export const profilePageMenu = {
    profile: item({ id: 'profile', text: 'Profile', path: '/admin/profile', icon: 'User' }),
};
