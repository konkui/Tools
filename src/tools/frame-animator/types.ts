/** 帧动画生成器数据模型 */

export type LoopMode = 'loop' | 'once' | 'pingpong';

export const LOOP_LABELS: Record<LoopMode, string> = {
  loop: '循环',
  once: '单次',
  pingpong: '来回',
};

/** 运行时帧（内存中的工作对象） */
export interface FrameItem {
  id: string;
  name: string;
  bitmap: ImageBitmap;
  blob: Blob;
  blobUrl: string;
  width: number;
  height: number;
  durationMs: number;
  /** 锚点，0~1 比例坐标（0.5, 0.5 = 中心） */
  anchorX: number;
  anchorY: number;
}

/** 持久化帧（IndexedDB / 素材库中存储的形态） */
export interface StoredFrame {
  name: string;
  blob: Blob;
  durationMs: number;
  anchorX: number;
  anchorY: number;
}

/** 持久化项目 */
export interface StoredProject {
  name: string;
  loop: LoopMode;
  frames: StoredFrame[];
  /** 导入的精灵表源图（用于随时重新切割），可选 */
  sheet?: Blob;
}

/** 新建帧的输入参数 */
export interface NewFrameInput {
  bitmap: ImageBitmap;
  blob: Blob;
  name: string;
}

/** 素材库条目 = 项目 + 元信息 */
export interface LibraryItem extends StoredProject {
  id: string;
  tags: string[];
  updatedAt: number;
}

export const DEFAULT_FRAME_MS = 125;
