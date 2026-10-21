import { takeLatest } from 'redux-saga/effects';
import { SHOP_FETCH } from './shop.types';

function* onShopFetch() {
    return;
}

export function* shopSaga() {
    yield takeLatest(SHOP_FETCH, onShopFetch);
}
