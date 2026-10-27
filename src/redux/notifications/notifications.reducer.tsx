import { resourceReducer } from '../_common/listModule';
import type { NotificationRecord } from './notifications.types';

export const notificationReducer = resourceReducer<NotificationRecord>('notification');
