import { resourceReducer } from '../_common/listModule';
import type { ShopRecord } from './shop.types';

export const shopReducer = resourceReducer<ShopRecord>('shop');
