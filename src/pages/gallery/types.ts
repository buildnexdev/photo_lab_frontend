// Developer by: Buildnexdev.in
// Last Edited : 22-10-2026

export type GalleryView = 'all' | 'favourites' | 'selected' | 'purchased';

export interface GalleryAlbum {
    id: number;
    name: string;
    description: string | null;
    photo_count: number;
}

export interface GalleryCategory {
    category: string;
    n: number;
}

export interface GalleryInfo {
    id: number;
    title: string;
    description: string | null;
    status: string;
    eventId: number;
    eventTitle: string;
    eventDate: string;
    eventVenue?: string | null;
    coverUrl?: string | null;
    eventStatus: string;
    isLive: boolean;
    watermark: boolean;
    allowDownload: boolean;
    expiresAt: string | null;
    scope: string;
    isOwner: boolean;
    isStaff: boolean;
    signedIn: boolean;
    photoCount: number;
    latestPhotoId: number | null;
    albums: GalleryAlbum[];
    categories: GalleryCategory[];
    faceSearch: boolean;
    phoneVerification?: boolean;
    phoneVerified?: boolean;
    selection: {
        canSelect: boolean;
        count: number;
        status: string | null;
        note?: string | null;
        submittedAt?: string | null;
    };
    pricing: {
        photoDownload: number;
        prints: Record<string, number>;
        frames: Record<string, number>;
        canvas: Record<string, number>;
        courierFee: number;
        currency: string;
    };
    studio: { name: string; phone: string; whatsapp: string };
}

export interface GalleryPhoto {
    id: number;
    album_id: number | null;
    width: number | null;
    height: number | null;
    status: string;
    created_at: string;
    category: string | null;
    tags: unknown;
    thumb_url: string;
    price: number;
    favourite: boolean;
    selected: boolean;
    purchased: boolean;
    comments: number;
}

export interface PhotoComment {
    id: number;
    body: string;
    is_staff: number | boolean;
    created_at: string;
    user_name: string;
    mine: number | boolean;
}

export interface PhotoDetail {
    id: number;
    width: number | null;
    height: number | null;
    album_id: number | null;
    preview_url: string;
    price: number;
    purchased: boolean;
    favourite: boolean;
    selected: boolean;
    comments: PhotoComment[];
    can_download: boolean;
}
