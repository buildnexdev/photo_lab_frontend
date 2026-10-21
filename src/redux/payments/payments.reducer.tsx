import { resourceReducer } from '../_common/listModule';
import type { PaymentRecord } from './payments.types';

export const paymentReducer = resourceReducer<PaymentRecord>('payment');
