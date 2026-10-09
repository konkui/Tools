/** 图片解码/编码基础工具（共享层） */

export function fileToBitmap(file: File | Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

export function bitmapToCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = bitmap.width;
  c.height = bitmap.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  return c;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob 失败'))), type),
  );
}

export function bitmapToBlob(bitmap: ImageBitmap, type = 'image/png'): Promise<Blob> {
  return canvasToBlob(bitmapToCanvas(bitmap), type);
}

/** 去掉文件名的扩展名，作为默认帧名 */
export function stripExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}
