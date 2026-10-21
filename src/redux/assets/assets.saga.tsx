import { takeLatest } from 'redux-saga/effects';
import { ASSET_FETCH } from './assets.types';

function* onAssetFetch() {
    return;
}

export function* assetSaga() {
    yield takeLatest(ASSET_FETCH, onAssetFetch);
}
