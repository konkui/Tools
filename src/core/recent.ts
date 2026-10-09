/**
 * 最近打开的项目记录，持久化到 localStorage。
 * 工具打开/保存文件时调用 addRecent，首页展示。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentEntry {
  /** 唯一标识（一般用文件路径或项目 id） */
  id: string;
  name: string;
  /** 来源工具 id，用于点击后跳回对应工具 */
  toolId: string;
  /** 附加信息，如 "8 帧"、"24×14" */
  detail?: string;
  openedAt: number;
}

const MAX_ENTRIES = 10;

interface RecentState {
  entries: RecentEntry[];
  addRecent: (entry: Omit<RecentEntry, 'openedAt'>) => void;
  removeRecent: (id: string) => void;
}

export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      entries: [],
      addRecent: (entry) =>
        set((state) => ({
          entries: [
            { ...entry, openedAt: Date.now() },
            ...state.entries.filter((e) => e.id !== entry.id),
          ].slice(0, MAX_ENTRIES),
        })),
      removeRecent: (id) =>
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'gdk-recent' },
  ),
);

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}
