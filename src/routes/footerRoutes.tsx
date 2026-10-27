import { loginPages } from '../menu';

/** Screens that render on their own, without the studio footer. */
const footers = [
    { path: loginPages.login.path, element: null },
    { path: loginPages.register.path, element: null },
    { path: loginPages.forgotPassword.path, element: null },
    { path: '/g', element: null },
    { path: '*', element: 'studio' },
];

export const plainFooterPaths = footers.filter((item) => item.element === null).map((item) => item.path);

export default footers;
