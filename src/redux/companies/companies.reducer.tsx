import { resourceReducer } from '../_common/listModule';
import type { CompanyRecord } from './companies.types';

export const companyReducer = resourceReducer<CompanyRecord>('company');
