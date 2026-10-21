import { resourceReducer } from '../_common/listModule';
import type { EditorRecord } from './editor.types';

export const editorReducer = resourceReducer<EditorRecord>('editor');
