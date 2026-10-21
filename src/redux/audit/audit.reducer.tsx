import { resourceReducer } from '../_common/listModule';
import type { AuditRecord } from './audit.types';

export const auditReducer = resourceReducer<AuditRecord>('audit');
