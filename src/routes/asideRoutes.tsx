import {
    Banknote,
    BarChart3,
    Bell,
    BookImage,
    BookOpen,
    Briefcase,
    Building2,
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
    Package,
    Printer,
    QrCode,
    Receipt,
    ScanLine,
    Settings,
    ShieldCheck,
    ShoppingBag,
    Tag,
    Truck,
    Upload,
    User,
    UserCog,
    Users,
    Wand2,
    type LucideIcon,
} from 'lucide-react';
import type { MenuGroup, MenuLeaf } from '../menu';
import { adminMenus, assetManagementPageMenu, customerPageMenu, deliveryPageMenu, editorPageMenu, eventManagementPageMenu, photographerPageMenu } from '../menu';
import type { NavSection } from '../layout/PortalLayout';

const ICONS: Record<string, LucideIcon> = {
    Banknote,
    BarChart3,
    Bell,
    BookImage,
    BookOpen,
    Briefcase,
    Building2,
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
    Package,
    Printer,
    QrCode,
    Receipt,
    ScanLine,
    Settings,
    ShieldCheck,
    ShoppingBag,
    Tag,
    Truck,
    Upload,
    User,
    UserCog,
    Users,
    Wand2,
};

const iconOf = (name: string) => ICONS[name] ?? LayoutDashboard;

export const sectionsFrom = (groups: MenuGroup[]): NavSection[] =>
    groups.map((group) => ({
        title: group.text || undefined,
        items: Object.values(group.subMenu)
            .filter((leaf: MenuLeaf) => !leaf.hide)
            .map((leaf) => ({
                to: leaf.path,
                label: leaf.text,
                icon: iconOf(leaf.icon),
                anyOf: leaf.anyOf,
                roles: leaf.roles,
                end: leaf.end,
            })),
    }));

export const adminAside = sectionsFrom(adminMenus);
export const customerAside = sectionsFrom([customerPageMenu]);
export const photographerAside = sectionsFrom([photographerPageMenu]);
export const editorAside = sectionsFrom([editorPageMenu]);
export const deliveryAside = sectionsFrom([deliveryPageMenu]);

export const eventAside = sectionsFrom([eventManagementPageMenu]);
export const assetAside = sectionsFrom([assetManagementPageMenu]);

const asides = { adminAside, customerAside, photographerAside, editorAside, deliveryAside };
export default asides;
