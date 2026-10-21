import { resourceReducer } from '../_common/listModule';
import type { ReportRecord } from './reports.types';

export const reportReducer = resourceReducer<ReportRecord>('report');
