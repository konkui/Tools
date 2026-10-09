/**
 * 导出逻辑：重排图集 PNG + 动画 JSON + 精灵条（给 AI 看的参考图）。
 */
import { downloadBlob } from '../../../core/download';
import { canvasToBlob } from '../../../core/image/load';
import { packShelf } from './packer';
import type { FrameItem, LoopMode } from '../types';

export interface ExportOptions {
  padding: number;
  maxSize: number;
}

export interface AnimJson {
  meta: { app: string; version: 1; image: string; size: { w: number; h: number } };
  animation: { name: string; loop: LoopMode; frameCount: number; totalDurationMs: number };
  frames: {
    name: string;
    rect: { x: number; y: number; w: number; h: number };
    durationMs: number;
    anchor: { x: number; y: number };
  }[];
}

export function buildAnimJson(
  name: string,
  loop: LoopMode,
  frames: FrameItem[],
  rects: { index: number; x: number; y: number; w: number; h: number }[],
  atlasW: number,
  atlasH: number,
): AnimJson {
  const byIndex = new Map(rects.map((r) => [r.index, r]));
  return {
    meta: { app: 'GameDevKit', version: 1, image: `${name}.png`, size: { w: atlasW, h: atlasH } },
    animation: {
      name,
      loop,
      frameCount: frames.length,
      totalDurationMs: frames.reduce((s, f) => s + f.durationMs, 0),
    },
    frames: frames.map((f, i) => {
      const r = byIndex.get(i)!;
      return {
        name: f.name,
        rect: { x: r.x, y: r.y, w: r.w, h: r.h },
        durationMs: f.durationMs,
        anchor: { x: f.anchorX, y: f.anchorY },
      };
    }),
  };
}

/** 导出图集 PNG + 动画 JSON 两个文件 */
export async function exportAnimation(
  name: string,
  loop: LoopMode,
  frames: FrameItem[],
  opts: ExportOptions,
): Promise<void> {
  const pack = packShelf(
    frames.map((f, i) => ({ w: f.width, h: f.height, index: i })),
    opts.maxSize,
    opts.padding,
  );
  const canvas = document.createElement('canvas');
  canvas.width = pack.width;
  canvas.height = pack.height;
  const ctx = canvas.getContext('2d')!;
  for (const r of pack.rects) {
    ctx.drawImage(frames[r.index].bitmap, r.x, r.y);
  }
  const pngBlob = await canvasToBlob(canvas);
  downloadBlob(pngBlob, `${name}.png`);
  const json = buildAnimJson(name, loop, frames, pack.rects, pack.width, pack.height);
  downloadBlob(
    new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }),
    `${name}.anim.json`,
  );
}

/** 生成横向精灵条（所有帧按序拼接的单张图），用于复制给 AI 作参考 */
export async function makeStripBlob(frames: { bitmap: ImageBitmap }[]): Promise<Blob> {
  const maxH = Math.max(...frames.map((f) => f.bitmap.height));
  const gap = 4;
  const totalW = frames.reduce((s, f) => s + f.bitmap.width, 0) + gap * (frames.length - 1);
  // 防止超宽，必要时整体缩放
  const scale = totalW > 4096 ? 4096 / totalW : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(totalW * scale);
  canvas.height = Math.round(maxH * scale);
  const ctx = canvas.getContext('2d')!;
  let x = 0;
  for (const f of frames) {
    const w = Math.round(f.bitmap.width * scale);
    const h = Math.round(f.bitmap.height * scale);
    ctx.drawImage(f.bitmap, x, canvas.height - h, w, h);
    x += w + Math.round(gap * scale);
  }
  return canvasToBlob(canvas);
}

/** 生成给 AI 看的文字描述 */
export function buildDescription(
  name: string,
  loop: LoopMode,
  frames: FrameItem[] | { width: number; height: number; durationMs: number }[],
  tags: string[],
): string {
  const first = frames[0];
  const total = frames.reduce((s, f) => s + f.durationMs, 0);
  const size = first ? `${first.width}×${first.height}` : '-';
  const fps = frames.length ? Math.round(1000 / (total / frames.length)) : 0;
  const loopText = { loop: '循环播放', once: '单次播放', pingpong: '来回播放' }[loop];
  const tagText = tags.length ? `，风格/用途标签：${tags.join('、')}` : '';
  return `动画参考「${name}」：${frames.length} 帧，单帧尺寸约 ${size}，${loopText}，平均 FPS ${fps}${tagText}。附图为横向精灵条（所有帧按播放顺序从左到右拼接）。`;
}
