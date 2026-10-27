import { resourceReducer } from '../_common/listModule';
import type { StaffRecord } from './staff.types';

export const staffReducer = resourceReducer<StaffRecord>('staff');
