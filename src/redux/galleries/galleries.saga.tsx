import { takeLatest } from 'redux-saga/effects';
import { GALLERY_FETCH } from './galleries.types';

function* onGalleryFetch() {
    return;
}

export function* gallerySaga() {
    yield takeLatest(GALLERY_FETCH, onGalleryFetch);
}
