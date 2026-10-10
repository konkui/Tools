/**
 * 视频抽帧：video 元素加载 + seek 抓帧。
 * 可选色度键去背景（视频帧必然不透明）与高度缩放（AI 视频通常是高清，精灵动画需要小尺寸）。
 */
import { canvasToBlob } from '../../../core/image/load';
import { removeSolidBackground } from '../../../core/image/chromaKey';
import type { NewFrameInput } from '../types';

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
}

export interface LoadedVideo {
  video: HTMLVideoElement;
  info: VideoInfo;
  url: string;
}

export function loadVideo(file: Blob): Promise<LoadedVideo> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;
  return new Promise((resolve, reject) => {
    video.onloadedmetadata = async () => {
      // 部分视频（如 MediaRecorder 录制的 webm）缺时长元数据：
      // seek 到极大时间点让浏览器解析出真实时长
      if (!isFinite(video.duration)) {
        await new Promise<void>((res) => {
          const onDur = () => {
            if (isFinite(video.duration)) {
              video.removeEventListener('durationchange', onDur);
              res();
            }
          };
          video.addEventListener('durationchange', onDur);
          video.currentTime = Number.MAX_SAFE_INTEGER;
          setTimeout(res, 1500);
        });
        video.currentTime = 0;
      }
      resolve({
        video,
        info: { duration: video.duration, width: video.videoWidth, height: video.videoHeight },
        url,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('视频解码失败，仅支持浏览器可播放的格式（如 mp4/H.264、webm）'));
    };
  });
}

export function releaseVideo(loaded: LoadedVideo): void {
  loaded.video.pause();
  loaded.video.removeAttribute('src');
  loaded.video.load();
  URL.revokeObjectURL(loaded.url);
}

export type SampleMode = 'fps' | 'count';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 计算采样时间点（秒）。
 * fps 模式：每秒抽 value 帧；count 模式：区间内均匀抽 value 帧。
 */
export function computeSampleTimes(
  duration: number,
  from: number,
  to: number,
  mode: SampleMode,
  value: number,
): number[] {
  const start = clamp(from, 0, duration);
  const end = clamp(to, start, duration);
  const span = end - start;
  if (span <= 0) return [];
  const times: number[] = [];
  if (mode === 'fps') {
    const fps = clamp(value, 0.5, 60);
    for (let t = start; t < end - 1e-6; t += 1 / fps) times.push(t);
  } else {
    const k = Math.max(1, Math.round(value));
    if (k === 1) times.push(start);
    else for (let i = 0; i < k; i++) times.push(start + (span * i) / (k - 1));
  }
  // 末帧向内收一点，避免 seek 到精确结尾抓不到帧
  return times.map((t) => Math.min(t, Math.max(0, duration - 0.05)));
}

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  const target = Math.min(t, video.duration);
  const atTarget = Math.abs(video.currentTime - target) < 1e-6;
  if (atTarget && !video.seeking && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('视频帧解码超时'));
    }, 5000);
    const onReady = () => {
      if (video.seeking || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('视频帧解码失败'));
    };
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('seeked', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onError);
    if (!atTarget) video.currentTime = target;
    onReady();
  });
}

export interface ExtractOptions {
  chromaKey: boolean;
  tolerance: number;
  /** 只去除与边缘相连的背景区 */
  edgeOnly: boolean;
  /** 边缘侵蚀像素数（去贴纸描边） */
  erodePx: number;
  /** 边缘去色污染强度，0~1 */
  decontaminate?: number;
  /** 输出高度 px，0 = 原始尺寸 */
  targetHeight: number;
  /** 缩放时保留硬像素边缘 */
  pixelated?: boolean;
  namePrefix: string;
  onProgress?: (done: number, total: number) => void;
}

export async function extractFrames(
  video: HTMLVideoElement,
  times: number[],
  opts: ExtractOptions,
): Promise<NewFrameInput[]> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = opts.targetHeight > 0 ? opts.targetHeight / vh : 1;
  const w = Math.max(1, Math.round(vw * scale));
  const h = Math.max(1, Math.round(vh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const resized = document.createElement('canvas');
  resized.width = w;
  resized.height = h;
  const resizeCtx = resized.getContext('2d')!;
  resizeCtx.imageSmoothingEnabled = !opts.pixelated;
  resizeCtx.imageSmoothingQuality = 'high';

  const items: NewFrameInput[] = [];
  for (let i = 0; i < times.length; i++) {
    await seekTo(video, times[i]);
    ctx.clearRect(0, 0, vw, vh);
    ctx.drawImage(video, 0, 0);
    let out = opts.chromaKey
      ? removeSolidBackground(canvas, opts.tolerance, opts.edgeOnly, opts.erodePx, opts.decontaminate).canvas
      : canvas;
    if (w !== vw || h !== vh) {
      resizeCtx.clearRect(0, 0, w, h);
      resizeCtx.drawImage(out, 0, 0, w, h);
      out = resized;
    }
    items.push({
      bitmap: await createImageBitmap(out),
      blob: await canvasToBlob(out),
      name: `${opts.namePrefix}_${i}`,
    });
    opts.onProgress?.(i + 1, times.length);
  }
  return items;
}
