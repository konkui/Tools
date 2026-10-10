/**
 * 纯色背景去除（chroma key，共享层）。
 * 四角取样 → 连通背景遮罩 → 局部前景估计与边缘去色污染。
 * 边缘混合色 C = αF + (1-α)B；使用邻近前景估计 α，再反解 F。
 * 不缩放或模糊图像，不修改轮廓内部的像素。
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
        if (data[i + 3] < 250) continue;
        rs.push(data[i]);
        gs.push(data[i + 1]);
        bs.push(data[i + 2]);
      }
    }
  }
  // 透明留白包围的图片：取各行最外侧的可见像素，避免把透明黑当背景。
  if (!rs.length) {
    const add = (i: number) => {
      rs.push(data[i * 4]);
      gs.push(data[i * 4 + 1]);
      bs.push(data[i * 4 + 2]);
    };
    for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 64))) {
      let left = 0;
      let right = w - 1;
      while (left < w && data[(y * w + left) * 4 + 3] < 250) left++;
      while (right > left && data[(y * w + right) * 4 + 3] < 250) right--;
      if (left < w) {
        add(y * w + left);
        if (right > left) add(y * w + right);
      }
    }
  }
  if (!rs.length) return [255, 255, 255];
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
 * @param tolerance 背景判定阈值（RGB 欧氏距离 0~441），默认 90
 * @param edgeOnly  true = 只去除与图像边缘相连的背景区（保护前景内部相近色）；
 *                  false = 全局去除（适合前景中存在孤岛背景洞的情况）
 * @param erodePx   边缘侵蚀：前景轮廓向内剥除的像素数（0~4），
 *                  用于额外去除实体描边，默认关闭以保留细线
 * @param decontaminate 边缘去色污染强度（0~1），不对图像做模糊
 */
export function removeSolidBackground(
  source: ImageBitmap | HTMLCanvasElement,
  tolerance = 90,
  edgeOnly = true,
  erodePx = 0,
  decontaminate = 1,
): ChromaKeyResult {
  const ctx = sourceToContext(source);
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const n = w * h;
  const bg = sampleCornerColor(data, w, h);

  const dist = (i: number): number => {
    const o = i * 4;
    const dr = data[o] - bg[0];
    const dg = data[o + 1] - bg[1];
    const db = data[o + 2] - bg[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  // 1) 圈定背景区
  const isBg = new Uint8Array(n);
  if (edgeOnly) {
    // BFS 洪泛：只去除与边缘相连的背景色区域
    const queue = new Int32Array(n);
    let qh = 0;
    let qt = 0;
    const tryPush = (i: number) => {
      if (!isBg[i] && (data[i * 4 + 3] === 0 || dist(i) <= tolerance)) {
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
  } else {
    for (let i = 0; i < n; i++) {
      if (data[i * 4 + 3] === 0 || dist(i) <= tolerance) isBg[i] = 1;
    }
  }

  // 2) 可选的轮廓收缩；默认关闭。
  for (let k = 0; k < Math.min(4, Math.max(0, Math.round(erodePx))); k++) {
    const toMark: number[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (isBg[i] || data[i * 4 + 3] === 0) continue;
        if (isBg[i - 1] || isBg[i + 1] || isBg[i - w] || isBg[i + w]) toMark.push(i);
      }
    }
    for (const i of toMark) isBg[i] = 1;
  }

  // 3) 只修复靠近已确认背景的窄带，保护封闭的浅色细节。
  const radius = 3;
  const strength = Math.min(1, Math.max(0, decontaminate));
  const depth = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  if (strength > 0) {
    for (let i = 0; i < n; i++) {
      if (isBg[i] || data[i * 4 + 3] === 0) continue;
      const x = i % w;
      if ((x > 0 && isBg[i - 1]) || (x + 1 < w && isBg[i + 1]) ||
          (i >= w && isBg[i - w]) || (i + w < n && isBg[i + w])) {
        depth[i] = 1;
        queue[tail++] = i;
      }
    }
    const push = (i: number, d: number) => {
      if (!isBg[i] && !depth[i] && data[i * 4 + 3] > 0) {
        depth[i] = d;
        queue[tail++] = i;
      }
    };
    while (head < tail) {
      const i = queue[head++];
      if (depth[i] >= radius) continue;
      const x = i % w;
      const d = depth[i] + 1;
      if (x > 0) push(i - 1, d);
      if (x + 1 < w) push(i + 1, d);
      if (i >= w) push(i - w, d);
      if (i + w < n) push(i + w, d);
    }
  }

  // 所有估计读取原像素，避免扫描顺序影响结果或重复反解已有透明边缘。
  const original = new Uint8ClampedArray(data);
  let removed = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (isBg[i]) {
      if (data[o + 3] > 0) removed++;
      data[o] = data[o + 1] = data[o + 2] = data[o + 3] = 0;
      continue;
    }
    if (!depth[i] || original[o + 3] < 255) continue;
    const x = i % w;
    const y = Math.floor(i / w);
    const cr = original[o] - bg[0];
    const cg = original[o + 1] - bg[1];
    const cb = original[o + 2] - bg[2];
    let alpha = 1;
    let bestScore = Infinity;
    for (let dy = -radius; dy <= radius; dy++) {
      const sy = y + dy;
      if (sy < 0 || sy >= h) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const sx = x + dx;
        const distance = dx * dx + dy * dy;
        if (!distance || distance > radius * radius || sx < 0 || sx >= w) continue;
        const j = sy * w + sx;
        if (isBg[j] || original[j * 4 + 3] < 255 || (depth[j] && depth[j] <= depth[i])) continue;
        const fr = original[j * 4] - bg[0];
        const fg = original[j * 4 + 1] - bg[1];
        const fb = original[j * 4 + 2] - bg[2];
        const norm = fr * fr + fg * fg + fb * fb;
        if (!norm) continue;
        const a = (cr * fr + cg * fg + cb * fb) / norm;
        if (a < 0.05 || a >= 0.98) continue;
        const error = (cr - a * fr) ** 2 + (cg - a * fg) ** 2 + (cb - a * fb) ** 2;
        // 优先使用过渡带外的前景，避免把另一层混合色当成真实颜色。
        const score = error + distance * 4 + (depth[j] ? 12 * 12 + radius * radius * 4 : 0);
        // 颜色必须符合背景与局部前景的混合，不能直接把邻近异色涂到轮廓上。
        if (error <= 12 * 12 && score < bestScore) {
          bestScore = score;
          alpha = a;
        }
      }
    }
    if (alpha === 1) continue;
    // 约束反解后的颜色范围，避免硬截断带来的黑边或过饱和。
    for (let c = 0; c < 3; c++) {
      const value = original[o + c];
      const background = bg[c];
      const minAlpha = value < background
        ? (background - value) / background
        : background < 255 ? (value - background) / (255 - background) : 0;
      alpha = Math.max(alpha, minAlpha);
    }
    alpha = 1 - strength * (1 - alpha);
    for (let c = 0; c < 3; c++) {
      data[o + c] = Math.round((original[o + c] - (1 - alpha) * bg[c]) / alpha);
    }
    data[o + 3] = Math.round(original[o + 3] * alpha);
  }

  ctx.putImageData(img, 0, 0);
  return { canvas: ctx.canvas, bgColor: bg, removedRatio: removed / n };
}
