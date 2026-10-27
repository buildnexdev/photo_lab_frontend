import { resourceReducer } from '../_common/listModule';
import type { CustomerRecord } from './customers.types';

export const customerReducer = resourceReducer<CustomerRecord>('customer');
