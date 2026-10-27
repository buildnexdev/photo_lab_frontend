import type { RootState } from '../root-reducer';

export const selectShop = (state: RootState) => state.shop;
export const selectShopItems = (state: RootState) => state.shop.items;
export const selectShopStatus = (state: RootState) => state.shop.status;
