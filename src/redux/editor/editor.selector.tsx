import type { RootState } from '../root-reducer';

export const selectEditor = (state: RootState) => state.editor;
export const selectEditorItems = (state: RootState) => state.editor.items;
export const selectEditorStatus = (state: RootState) => state.editor.status;
