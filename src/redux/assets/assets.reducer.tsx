import { resourceReducer } from '../_common/listModule';
import type { AssetRecord } from './assets.types';

export const assetReducer = resourceReducer<AssetRecord>('asset');
