import type { RootState } from '../root-reducer';

export const selectSettings = (state: RootState) => state.settings;
export const selectSettingsItems = (state: RootState) => state.settings.items;
export const selectSettingsStatus = (state: RootState) => state.settings.status;
