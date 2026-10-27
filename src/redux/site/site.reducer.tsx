import { resourceReducer } from '../_common/listModule';
import type { SiteRecord } from './site.types';

export const siteReducer = resourceReducer<SiteRecord>('site');
