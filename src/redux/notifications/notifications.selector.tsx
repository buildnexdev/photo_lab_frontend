import type { RootState } from '../root-reducer';

export const selectNotification = (state: RootState) => state.notification;
export const selectNotificationItems = (state: RootState) => state.notification.items;
export const selectNotificationStatus = (state: RootState) => state.notification.status;
