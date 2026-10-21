import { takeLatest } from 'redux-saga/effects';
import { EDITOR_FETCH } from './editor.types';

function* onEditorFetch() {
    return;
}

export function* editorSaga() {
    yield takeLatest(EDITOR_FETCH, onEditorFetch);
}
