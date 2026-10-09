/**
 * 帧动画生成器状态：帧列表、播放状态、项目设置。
 * 结构性修改会置 dirty，由 subscribePersistence 防抖自动保存到 IndexedDB。
 */
import { create } from 'zustand';
import { idbGet, idbPut, STORE_PROJECT } from '../../core/db';
import { fileToBitmap, stripExt } from '../../core/image/load';
import {
  DEFAULT_FRAME_MS,
  type FrameItem,
  type LoopMode,
  type NewFrameInput,
  type StoredFrame,
  type StoredProject,
} from './types';

let frameSeq = 0;
const newFrameId = () => `f_${Date.now().toString(36)}_${frameSeq++}`;

export function frameFromStored(sf: StoredFrame, bitmap: ImageBitmap): FrameItem {
  return {
    id: newFrameId(),
    name: sf.name,
    bitmap,
    blob: sf.blob,
    blobUrl: URL.createObjectURL(sf.blob),
    width: bitmap.width,
    height: bitmap.height,
    durationMs: sf.durationMs,
    anchorX: sf.anchorX,
    anchorY: sf.anchorY,
  };
}

export async function decodeStoredFrames(frames: StoredFrame[]): Promise<FrameItem[]> {
  return Promise.all(
    frames.map(async (sf) => frameFromStored(sf, await fileToBitmap(sf.blob))),
  );
}

/** 从导入产物创建运行时帧（默认 125ms / 中心锚点） */
function makeFrame(it: NewFrameInput): FrameItem {
  return {
    id: newFrameId(),
    name: it.name,
    bitmap: it.bitmap,
    blob: it.blob,
    blobUrl: URL.createObjectURL(it.blob),
    width: it.bitmap.width,
    height: it.bitmap.height,
    durationMs: DEFAULT_FRAME_MS,
    anchorX: 0.5,
    anchorY: 0.5,
  };
}

const PROJECT_KEY = 'frame-animator:current';

interface AnimatorState {
  frames: FrameItem[];
  selectedId: string | null;
  projectName: string;
  loop: LoopMode;
  playing: boolean;
  /** 当前播放/选中的帧下标 */
  playingIndex: number;
  /** 播放速度倍率 */
  speed: number;
  /** 画布缩放倍率 */
  zoom: number;
  onionSkin: boolean;
  /** 舞台坐标轴显示 */
  showAxes: boolean;
  leftTab: 'frames' | 'library';
  dirty: boolean;
  /** 导入的精灵表源图（用于随时重新切割） */
  sheetBitmap: ImageBitmap | null;
  sheetBlob: Blob | null;

  addBitmaps: (items: NewFrameInput[]) => void;
  replaceAllFrames: (items: NewFrameInput[]) => void;
  replaceFrameAt: (id: string, items: NewFrameInput[]) => void;
  setSheetSource: (blob: Blob | null) => Promise<void>;
  importFiles: (files: File[]) => Promise<void>;
  removeFrame: (id: string) => void;
  moveFrame: (from: number, to: number) => void;
  selectFrame: (id: string | null) => void;
  updateFrame: (
    id: string,
    patch: Partial<Pick<FrameItem, 'durationMs' | 'anchorX' | 'anchorY' | 'name'>>,
  ) => void;
  applyDurationToAll: (ms: number) => void;
  applyAnchorToAll: (x: number, y: number) => void;
  setLoop: (loop: LoopMode) => void;
  setPlaying: (playing: boolean) => void;
  setPlayingIndex: (index: number) => void;
  stepFrame: (delta: number) => void;
  setSpeed: (speed: number) => void;
  setZoom: (zoom: number) => void;
  toggleOnion: () => void;
  toggleAxes: () => void;
  setLeftTab: (tab: 'frames' | 'library') => void;
  setProjectName: (name: string) => void;
  clearAll: () => void;
  restore: (project: StoredProject) => Promise<void>;
  serialize: () => StoredProject;
}

export const useAnimatorStore = create<AnimatorState>()((set, get) => ({
  frames: [],
  selectedId: null,
  projectName: '未命名动画',
  loop: 'loop',
  playing: false,
  playingIndex: 0,
  speed: 1,
  zoom: 3,
  onionSkin: false,
  showAxes: true,
  leftTab: 'frames',
  dirty: false,
  sheetBitmap: null,
  sheetBlob: null,

  addBitmaps: (items) =>
    set((s) => {
      const added = items.map(makeFrame);
      const frames = [...s.frames, ...added];
      return {
        frames,
        dirty: true,
        selectedId: s.selectedId ?? added[0]?.id ?? null,
      };
    }),

  replaceAllFrames: (items) =>
    set((s) => {
      s.frames.forEach((f) => URL.revokeObjectURL(f.blobUrl));
      const frames = items.map(makeFrame);
      return {
        frames,
        dirty: true,
        selectedId: frames[0]?.id ?? null,
        playingIndex: 0,
      };
    }),

  replaceFrameAt: (id, items) =>
    set((s) => {
      const idx = s.frames.findIndex((f) => f.id === id);
      if (idx < 0 || items.length === 0) return s;
      URL.revokeObjectURL(s.frames[idx].blobUrl);
      const pieces = items.map(makeFrame);
      const frames = [...s.frames.slice(0, idx), ...pieces, ...s.frames.slice(idx + 1)];
      return {
        frames,
        dirty: true,
        selectedId: pieces[0].id,
        playingIndex: idx,
      };
    }),

  setSheetSource: async (blob) => {
    if (!blob) {
      set({ sheetBitmap: null, sheetBlob: null, dirty: true });
      return;
    }
    const bitmap = await fileToBitmap(blob);
    set({ sheetBitmap: bitmap, sheetBlob: blob, dirty: true });
  },

  importFiles: async (files) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    const items = await Promise.all(
      images.map(async (f) => ({
        bitmap: await fileToBitmap(f),
        blob: f as Blob,
        name: stripExt(f.name),
      })),
    );
    if (items.length) get().addBitmaps(items);
  },

  removeFrame: (id) =>
    set((s) => {
      const idx = s.frames.findIndex((f) => f.id === id);
      if (idx < 0) return s;
      const target = s.frames[idx];
      URL.revokeObjectURL(target.blobUrl);
      const frames = s.frames.filter((f) => f.id !== id);
      return {
        frames,
        dirty: true,
        selectedId: s.selectedId === id ? (frames[Math.min(idx, frames.length - 1)]?.id ?? null) : s.selectedId,
        playingIndex: Math.min(s.playingIndex, Math.max(0, frames.length - 1)),
      };
    }),

  moveFrame: (from, to) =>
    set((s) => {
      if (from === to || from < 0 || to < 0 || from >= s.frames.length || to >= s.frames.length)
        return s;
      const frames = [...s.frames];
      const [moved] = frames.splice(from, 1);
      frames.splice(to, 0, moved);
      return { frames, dirty: true, playingIndex: to };
    }),

  selectFrame: (id) =>
    set((s) => {
      const idx = s.frames.findIndex((f) => f.id === id);
      return { selectedId: id, playingIndex: idx >= 0 ? idx : s.playingIndex };
    }),

  updateFrame: (id, patch) =>
    set((s) => ({
      frames: s.frames.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      dirty: true,
    })),

  applyDurationToAll: (ms) =>
    set((s) => ({ frames: s.frames.map((f) => ({ ...f, durationMs: ms })), dirty: true })),

  applyAnchorToAll: (x, y) =>
    set((s) => ({
      frames: s.frames.map((f) => ({ ...f, anchorX: x, anchorY: y })),
      dirty: true,
    })),

  setLoop: (loop) => set({ loop, dirty: true }),
  setPlaying: (playing) => set({ playing }),
  setPlayingIndex: (index) => set({ playingIndex: index }),

  stepFrame: (delta) =>
    set((s) => {
      const n = s.frames.length;
      if (!n) return s;
      return { playing: false, playingIndex: (s.playingIndex + delta + n) % n };
    }),

  setSpeed: (speed) => set({ speed }),
  setZoom: (zoom) => set({ zoom }),
  toggleOnion: () => set((s) => ({ onionSkin: !s.onionSkin })),
  toggleAxes: () => set((s) => ({ showAxes: !s.showAxes })),
  setLeftTab: (leftTab) => set({ leftTab }),
  setProjectName: (projectName) => set({ projectName, dirty: true }),

  clearAll: () =>
    set((s) => {
      s.frames.forEach((f) => URL.revokeObjectURL(f.blobUrl));
      return {
        frames: [],
        selectedId: null,
        playing: false,
        playingIndex: 0,
        projectName: '未命名动画',
        loop: 'loop',
        dirty: true,
      };
    }),

  restore: async (project) => {
    const frames = await decodeStoredFrames(project.frames);
    const sheetBitmap = project.sheet ? await fileToBitmap(project.sheet) : null;
    set({
      frames,
      projectName: project.name,
      loop: project.loop,
      selectedId: frames[0]?.id ?? null,
      playing: false,
      playingIndex: 0,
      dirty: false,
      sheetBitmap,
      sheetBlob: project.sheet ?? null,
    });
  },

  serialize: () => {
    const s = get();
    return {
      name: s.projectName,
      loop: s.loop,
      frames: s.frames.map((f) => ({
        name: f.name,
        blob: f.blob,
        durationMs: f.durationMs,
        anchorX: f.anchorX,
        anchorY: f.anchorY,
      })),
      sheet: s.sheetBlob ?? undefined,
    };
  },
}));

/** 启动时恢复上次的工作项目 */
export async function loadPersistedProject(): Promise<void> {
  try {
    const p = await idbGet<StoredProject>(STORE_PROJECT, PROJECT_KEY);
    if (p && p.frames?.length) await useAnimatorStore.getState().restore(p);
  } catch (e) {
    console.warn('[frame-animator] 恢复项目失败', e);
  }
}

/** 订阅 store，dirty 时防抖自动保存。返回取消函数。 */
export function subscribePersistence(): () => void {
  let timer = 0;
  const unsub = useAnimatorStore.subscribe((s) => {
    if (!s.dirty) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      try {
        await idbPut(STORE_PROJECT, PROJECT_KEY, useAnimatorStore.getState().serialize());
        useAnimatorStore.setState({ dirty: false });
      } catch (e) {
        console.warn('[frame-animator] 自动保存失败', e);
      }
    }, 1200);
  });
  return () => {
    window.clearTimeout(timer);
    unsub();
  };
}
