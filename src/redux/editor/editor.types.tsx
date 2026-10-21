export const EDITOR_FETCH = 'editor/FETCH';
export const EDITOR_SUCCESS = 'editor/SUCCESS';
export const EDITOR_FAILURE = 'editor/FAILURE';
export const EDITOR_RESET = 'editor/RESET';

export interface EditorRecord {
    id: number | string;
}

export interface EditorState {
    items: EditorRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
