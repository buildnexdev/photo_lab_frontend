import { resourceReducer } from '../_common/listModule';
import type { SettingsRecord } from './settings.types';

export const settingsReducer = resourceReducer<SettingsRecord>('settings');
