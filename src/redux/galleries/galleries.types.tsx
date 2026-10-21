export const GALLERY_FETCH = 'gallery/FETCH';
export const GALLERY_SUCCESS = 'gallery/SUCCESS';
export const GALLERY_FAILURE = 'gallery/FAILURE';
export const GALLERY_RESET = 'gallery/RESET';

export interface GalleryRecord {
    id: number | string;
}

export interface GalleryState {
    items: GalleryRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
