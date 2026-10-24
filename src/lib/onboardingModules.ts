import { Globe, Image, Package, QrCode, Users, Warehouse, type LucideIcon } from 'lucide-react';

export type OnboardingModuleId = 'qr' | 'events' | 'assets' | 'staff' | 'ecommerce' | 'website';

export type ModuleCard = {
    id: OnboardingModuleId;
    label: string;
    description: string;
    pricePaise: number;
    icon: LucideIcon;
};

/** Mirrors backend catalog; used when /api/onboarding/modules is unavailable. */
export const FALLBACK_MODULES: ModuleCard[] = [
    { id: 'qr', label: 'QR galleries', description: 'Live event QR & guest access', pricePaise: 99_900, icon: QrCode },
    { id: 'events', label: 'Event management', description: 'Timelines, albums, delivery', pricePaise: 149_900, icon: Image },
    { id: 'assets', label: 'Assets management', description: 'Gear, props, inventory', pricePaise: 99_900, icon: Warehouse },
    { id: 'staff', label: 'Staff management', description: 'Roles & team scheduling', pricePaise: 99_900, icon: Users },
    { id: 'ecommerce', label: 'E-commerce', description: 'Print shop & product orders', pricePaise: 199_900, icon: Package },
    { id: 'website', label: 'Website management', description: 'Portfolio & public site', pricePaise: 149_900, icon: Globe },
];

export const ONBOARDING_BASE_PAISE = 199_900;

export function formatInr(paise: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
}

export function quoteModules(ids: OnboardingModuleId[]) {
    const picked = FALLBACK_MODULES.filter((m) => ids.includes(m.id));
    const modulesTotal = picked.reduce((s, m) => s + m.pricePaise, 0);
    return { amountPaise: ONBOARDING_BASE_PAISE + modulesTotal, lines: picked, basePaise: ONBOARDING_BASE_PAISE };
}

export type OnboardingForm = {
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
    companyEmail: string;
    companyName: string;
    ownerName: string;
    about: string;
    modules: OnboardingModuleId[];
    logoPreview: string | null;
    logoBase64: string | null;
};

export type CheckoutIntent = {
    token: string;
    amount: number;
    currency: string;
    provider: 'razorpay' | 'devpay';
    keyId: string | null;
    providerOrderId: string;
    quote: { amountPaise: number; basePaise: number; lines: { id: string; label: string; amountPaise: number }[] };
};

export type CompanyCreated = {
    companyName: string;
    slug: string;
    adminEmail: string;
    adminPhone: string;
    modules: OnboardingModuleId[];
    message: string;
};
