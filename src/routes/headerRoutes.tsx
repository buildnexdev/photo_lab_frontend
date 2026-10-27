import { loginPages } from '../menu';

export interface HeaderRoute {
    area: string;
    profileLink: string;
    notificationsLink: string;
}

export const adminHeader: HeaderRoute = {
    area: 'Studio admin',
    profileLink: '/admin/profile',
    notificationsLink: '/admin/notifications',
};

export const customerHeader: HeaderRoute = {
    area: 'My account',
    profileLink: '/customer/profile',
    notificationsLink: '/customer/notifications',
};

export const photographerHeader: HeaderRoute = {
    area: 'Photographer',
    profileLink: '/photographer/profile',
    notificationsLink: '/photographer/notifications',
};

export const editorHeader: HeaderRoute = {
    area: 'Editor',
    profileLink: '/editor/profile',
    notificationsLink: '/editor/notifications',
};

export const deliveryHeader: HeaderRoute = {
    area: 'Printing and delivery',
    profileLink: '/delivery/profile',
    notificationsLink: '/delivery/notifications',
};

const headers = [
    { path: loginPages.login.path, header: null },
    { path: loginPages.register.path, header: null },
    { path: loginPages.forgotPassword.path, header: null },
    { path: '/admin', header: adminHeader },
    { path: '/customer', header: customerHeader },
    { path: '/photographer', header: photographerHeader },
    { path: '/editor', header: editorHeader },
    { path: '/delivery', header: deliveryHeader },
];

export default headers;
