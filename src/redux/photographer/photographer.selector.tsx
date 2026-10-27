import type { RootState } from '../root-reducer';

export const selectPhotographer = (state: RootState) => state.photographer;
export const selectPhotographerItems = (state: RootState) => state.photographer.items;
export const selectPhotographerStatus = (state: RootState) => state.photographer.status;
