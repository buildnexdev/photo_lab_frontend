import { resourceReducer } from '../_common/listModule';
import type { GalleryRecord } from './galleries.types';

export const galleryReducer = resourceReducer<GalleryRecord>('gallery');
