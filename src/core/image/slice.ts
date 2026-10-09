/**
 * 图片切割算法（共享层）。
 * - gridSliceBoxes：均匀网格切割（每格可按透明像素自动裁剪）
 * - smartSlice：透明连通域分析，识别不规整排布的素材
 * 帧动画生成器与自动切割工具共用。
 */

export interface SliceBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function drawToContext(bitmap: ImageBitmap): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = bitmap.width;
  c.height = bitmap.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  return ctx;
}

/** 计算指定区域内的 alpha 包围框；全透明返回 null */
export function computeAlphaBBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  region?: SliceBox,
  alphaThreshold = 10,
): SliceBox | null {
  const rx = region?.x ?? 0;
  const ry = region?.y ?? 0;
  const rw = region?.w ?? width;
  const rh = region?.h ?? height;
  const x1 = Math.min(rx + rw, width);
  const y1 = Math.min(ry + rh, height);
  let minX = x1, minY = y1, maxX = rx - 1, maxY = ry - 1;
  for (let y = ry; y < y1; y++) {
    for (let x = rx; x < x1; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** 均匀网格切割；trim 时每格按透明像素裁剪掉空白边缘 */
export function gridSliceBoxes(
  bitmap: ImageBitmap,
  rows: number,
  cols: number,
  trim = true,
): SliceBox[] {
  const w = bitmap.width;
  const h = bitmap.height;
  const cw = Math.floor(w / cols);
  const ch = Math.floor(h / rows);
  const boxes: SliceBox[] = [];
  let imageData: Uint8ClampedArray | null = null;
  if (trim) {
    imageData = drawToContext(bitmap).getImageData(0, 0, w, h).data;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell: SliceBox = { x: c * cw, y: r * ch, w: cw, h: ch };
      if (imageData) {
        const bbox = computeAlphaBBox(imageData, w, h, cell);
        if (bbox) boxes.push(bbox);
      } else {
        boxes.push(cell);
      }
    }
  }
  return boxes;
}

/** 智能切割：alpha 通道连通域分析（4 邻接 BFS），按阅读顺序排序 */
export function smartSlice(bitmap: ImageBitmap, minSize = 8, alphaThreshold = 10): SliceBox[] {
  const ctx = drawToContext(bitmap);
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const { data } = ctx.getImageData(0, 0, w, h);
  const visited = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;
  const pushIf = (i: number) => {
    if (!visited[i] && data[i * 4 + 3] > alphaThreshold) {
      visited[i] = 1;
      stack[sp++] = i;
    }
  };
  const boxes: SliceBox[] = [];
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const seed = sy * w + sx;
      if (visited[seed] || data[seed * 4 + 3] <= alphaThreshold) continue;
      sp = 0;
      stack[sp++] = seed;
      visited[seed] = 1;
      let minX = sx, maxX = sx, minY = sy, maxY = sy;
      while (sp > 0) {
        const i = stack[--sp];
        const x = i % w;
        const y = (i / w) | 0;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (x > 0) pushIf(i - 1);
        if (x < w - 1) pushIf(i + 1);
        if (y > 0) pushIf(i - w);
        if (y < h - 1) pushIf(i + w);
      }
      if (maxX - minX + 1 >= minSize && maxY - minY + 1 >= minSize) {
        boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
      }
    }
  }
  return sortReadingOrder(boxes);
}

/** 按阅读顺序（从上到下、每行从左到右）排序包围框 */
function sortReadingOrder(boxes: SliceBox[]): SliceBox[] {
  if (boxes.length === 0) return boxes;
  const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
  const avgH = boxes.reduce((s, b) => s + b.h, 0) / boxes.length;
  const rows: SliceBox[][] = [];
  for (const b of sorted) {
    const cy = b.y + b.h / 2;
    const row = rows.find((r) => {
      const rc = r[0];
      return Math.abs(cy - (rc.y + rc.h / 2)) <= Math.max(avgH * 0.6, 1);
    });
    if (row) row.push(b);
    else rows.push([b]);
  }
  rows.forEach((r) => r.sort((a, b) => a.x - b.x));
  return rows.flat();
}

/**
 * 合并邻近包围框：一个框按 gap 膨胀后与另一个框相交则合并，迭代至稳定。
 * 用于把角色脚下分离的投影、头部飘饰等合并回主体帧。
 */
export function mergeBoxes(boxes: SliceBox[], gap = 12): SliceBox[] {
  const result = boxes.map((b) => ({ ...b }));
  let merged = true;
  const intersects = (a: SliceBox, b: SliceBox) =>
    a.x - gap < b.x + b.w &&
    a.x + a.w + gap > b.x &&
    a.y - gap < b.y + b.h &&
    a.y + a.h + gap > b.y;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        if (intersects(result[i], result[j])) {
          const a = result[i];
          const b = result[j];
          const x = Math.min(a.x, b.x);
          const y = Math.min(a.y, b.y);
          result[i] = {
            x,
            y,
            w: Math.max(a.x + a.w, b.x + b.w) - x,
            h: Math.max(a.y + a.h, b.y + b.h) - y,
          };
          result.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  return result;
}

/** 按包围框从源图裁出 ImageBitmap 列表 */
export async function extractBoxBitmaps(
  source: ImageBitmap,
  boxes: SliceBox[],
): Promise<ImageBitmap[]> {
  const src = drawToContext(source).canvas;
  return Promise.all(
    boxes.map((b) => createImageBitmap(src, b.x, b.y, b.w, b.h)),
  );
}
