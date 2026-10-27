import type { RootState } from '../root-reducer';

export const selectSite = (state: RootState) => state.site;
export const selectSiteItems = (state: RootState) => state.site.items;
export const selectSiteStatus = (state: RootState) => state.site.status;
