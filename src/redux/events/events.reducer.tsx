import { resourceReducer } from '../_common/listModule';
import type { EventRecord } from './events.types';

export const eventReducer = resourceReducer<EventRecord>('event');
