/**
 * 动画素材库：IndexedDB 持久化，跨会话保留。
 * 条目为完整项目快照（帧 blob + 参数），可载回编辑器继续修改。
 */
import { create } from 'zustand';
import { idbDelete, idbGetAll, idbPut, STORE_ANIM_LIB } from '../../core/db';
import type { LibraryItem, StoredProject } from './types';
import { decodeStoredFrames } from './store';

interface LibraryState {
  items: LibraryItem[];
  loaded: boolean;
  refresh: () => Promise<void>;
  save: (project: StoredProject, tags: string[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  items: [],
  loaded: false,

  refresh: async () => {
    const items = await idbGetAll<LibraryItem>(STORE_ANIM_LIB);
    items.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ items, loaded: true });
  },

  save: async (project, tags) => {
    const item: LibraryItem = {
      ...project,
      id: `anim_${Date.now().toString(36)}`,
      tags,
      updatedAt: Date.now(),
    };
    await idbPut(STORE_ANIM_LIB, item.id, item);
    await get().refresh();
  },

  remove: async (id) => {
    await idbDelete(STORE_ANIM_LIB, id);
    await get().refresh();
  },
}));

/** 便捷方法：库条目解码为运行时帧 */
export { decodeStoredFrames };
