import { resourceReducer } from '../_common/listModule';
import type { DeliveryRecord } from './delivery.types';

export const deliveryReducer = resourceReducer<DeliveryRecord>('delivery');
