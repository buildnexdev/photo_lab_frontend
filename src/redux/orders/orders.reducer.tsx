import { resourceReducer } from '../_common/listModule';
import type { OrderRecord } from './orders.types';

export const orderReducer = resourceReducer<OrderRecord>('order');
