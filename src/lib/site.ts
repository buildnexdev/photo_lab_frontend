// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface Studio {
    name: string;
    tagline: string;
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
    city: string;
    mapUrl: string;
    hours: string;
    about: string;
    gstin: string;
    instagram: string;
    facebook: string;
    youtube: string;
}

export interface Service {
    id: number;
    name: string;
    slug: string;
    summary: string | null;
    description: string | null;
    icon: string | null;
    base_price: number;
    is_active: number;
    sort_order: number;
}

export interface Package {
    id: number;
    service_id: number | null;
    service_name: string | null;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    advance_percent: number;
    features: string[] | string | null;
    photo_count: number | null;
    includes_digital: number;
    includes_album: number;
    duration_hours: number | null;
    is_featured: number;
    is_active: number;
    sort_order: number;
}

export interface PortfolioItem {
    id: number;
    title: string;
    category: string;
    description: string | null;
    is_featured: number;
    sort_order: number;
    image_url: string;
}

export interface Testimonial {
    id: number;
    name: string;
    event_label: string | null;
    quote: string;
    rating: number;
    is_published: number;
    sort_order: number;
}

export interface SiteData {
    studio: Studio;
    services: Service[];
    packages: Package[];
    portfolio: PortfolioItem[];
    testimonials: Testimonial[];
    stats: { events: number; customers: number; photos: number };
}

export const useSite = () => useQuery({ queryKey: ['site'], queryFn: () => api.get<SiteData>('/api/public/site'), staleTime: 5 * 60_000 });

export const packageFeatures = (p: Pick<Package, 'features'>): string[] => {
    if (!p.features) return [];
    if (Array.isArray(p.features)) return p.features;
    try {
        const v = JSON.parse(p.features);
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
};

/** Portfolio images are served via the API (redirect to a signed URL). */
export const apiAsset = (path: string) => `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}${path}`;
