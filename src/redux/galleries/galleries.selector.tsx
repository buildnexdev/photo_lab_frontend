import type { RootState } from '../root-reducer';

export const selectGallery = (state: RootState) => state.gallery;
export const selectGalleryItems = (state: RootState) => state.gallery.items;
export const selectGalleryStatus = (state: RootState) => state.gallery.status;
