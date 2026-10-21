import { resourceReducer } from '../_common/listModule';
import type { PhotographerRecord } from './photographer.types';

export const photographerReducer = resourceReducer<PhotographerRecord>('photographer');
