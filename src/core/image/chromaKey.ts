/**
 * 纯色背景去除（chroma key，共享层）。
 * 自动取样四角颜色作为背景色，从边缘洪泛填充相似色区域并置透明，
 * 前景边缘做去溢色处理。适用于绿幕/纯色底的 AI 生成图、扫描素材。
 * 与 AI 分割模型互补：纯色背景用它（快、零依赖），复杂背景才需要模型。
 */

export interface ChromaKeyResult {
  canvas: HTMLCanvasElement;
  bgColor: [number, number, number];
  /** 被去除像素占比 0~1 */
  removedRatio: number;
}

function sourceToContext(source: ImageBitmap | HTMLCanvasElement): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  return ctx;
}

/** 取样四角 8×8 区域的中位色 */
export function sampleCornerColor(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): [number, number, number] {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const corners = [
    [0, 0],
    [Math.max(0, w - 8), 0],
    [0, Math.max(0, h - 8)],
    [Math.max(0, w - 8), Math.max(0, h - 8)],
  ];
  for (const [cx, cy] of corners) {
    for (let y = cy; y < Math.min(h, cy + 8); y++) {
      for (let x = cx; x < Math.min(w, cx + 8); x++) {
        const i = (y * w + x) * 4;
        rs.push(data[i]);
        gs.push(data[i + 1]);
        bs.push(data[i + 2]);
      }
    }
  }
  const median = (arr: number[]) => arr.sort((a, b) => a - b)[arr.length >> 1];
  return [median(rs), median(gs), median(bs)];
}

/** 检测图片是否含透明像素（抽样扫描） */
export function hasTransparency(source: ImageBitmap | HTMLCanvasElement): boolean {
  const ctx = sourceToContext(source);
  const { data } = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (let i = 3; i < data.length; i += 16) {
    if (data[i] < 250) return true;
  }
  return false;
}

/**
 * 去除纯色背景。
 * @param tolerance RGB 欧氏距离阈值（0~441），越大去除越激进，默认 90
 */
export function removeSolidBackground(
  source: ImageBitmap | HTMLCanvasElement,
  tolerance = 90,
): ChromaKeyResult {
  const ctx = sourceToContext(source);
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const n = w * h;
  const bg = sampleCornerColor(data, w, h);
  const tol2 = tolerance * tolerance;

  const dist2 = (i: number): number => {
    const o = i * 4;
    const dr = data[o] - bg[0];
    const dg = data[o + 1] - bg[1];
    const db = data[o + 2] - bg[2];
    return dr * dr + dg * dg + db * db;
  };

  // BFS 洪泛：只去除与图像边缘相连的背景色区域，保护前景内部的相近颜色
  const isBg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  const tryPush = (i: number) => {
    if (!isBg[i] && data[i * 4 + 3] > 0 && dist2(i) <= tol2) {
      isBg[i] = 1;
      queue[qt++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    tryPush(x);
    tryPush((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    tryPush(y * w);
    tryPush(y * w + w - 1);
  }
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) tryPush(i - 1);
    if (x < w - 1) tryPush(i + 1);
    if (y > 0) tryPush(i - w);
    if (y < h - 1) tryPush(i + w);
  }

  let removed = 0;
  for (let i = 0; i < n; i++) {
    if (isBg[i]) {
      data[i * 4 + 3] = 0;
      removed++;
    }
  }

  // 去溢色：与背景相邻的前景像素，若绿色通道异常占主导则压制（绿幕边缘残留）
  const spillMargin = 24;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (isBg[i]) continue;
      if (isBg[i - 1] || isBg[i + 1] || isBg[i - w] || isBg[i + w]) {
        const o = i * 4;
        const m = Math.max(data[o], data[o + 2]);
        if (data[o + 1] > m) data[o + 1] = Math.min(255, m + spillMargin);
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  return { canvas: ctx.canvas, bgColor: bg, removedRatio: removed / n };
}
