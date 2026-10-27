import { takeLatest } from 'redux-saga/effects';
import { SETTINGS_FETCH } from './settings.types';

function* onSettingsFetch() {
    return;
}

export function* settingsSaga() {
    yield takeLatest(SETTINGS_FETCH, onSettingsFetch);
}
