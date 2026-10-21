import type { RootState } from '../root-reducer';

export const selectAsset = (state: RootState) => state.asset;
export const selectAssetItems = (state: RootState) => state.asset.items;
export const selectAssetStatus = (state: RootState) => state.asset.status;
