/** 图集打包：shelf（货架）算法，按高度排序逐行排布 */

export interface PackItemInput {
  w: number;
  h: number;
  index: number;
}

export interface PackedRect {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PackResult {
  rects: PackedRect[];
  width: number;
  height: number;
}

export function packShelf(items: PackItemInput[], maxSize = 1024, padding = 2): PackResult {
  if (items.length === 0) return { rects: [], width: 0, height: 0 };
  const sorted = [...items].sort((a, b) => b.h - a.h);
  const totalArea = items.reduce((s, i) => s + (i.w + padding) * (i.h + padding), 0);
  // 目标宽度取总面积平方根的 2 的幂，限制在 maxSize 内，让图集接近方形
  const targetW = Math.max(
    64,
    Math.min(maxSize, Math.pow(2, Math.ceil(Math.log2(Math.sqrt(totalArea))))),
  );
  const rects: PackedRect[] = [];
  let x = padding;
  let y = padding;
  let rowH = 0;
  let usedW = 0;
  for (const it of sorted) {
    if (x + it.w + padding > targetW && x > padding) {
      y += rowH + padding;
      x = padding;
      rowH = 0;
    }
    rects.push({ index: it.index, x, y, w: it.w, h: it.h });
    x += it.w + padding;
    rowH = Math.max(rowH, it.h);
    usedW = Math.max(usedW, x);
  }
  return { rects, width: Math.max(usedW, padding + 1), height: y + rowH + padding };
}
