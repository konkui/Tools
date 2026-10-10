/**
 * 切割对话框：均匀网格切割 / 智能切割（透明连通域 + 邻近合并），
 * 纯色背景自动色度键去除，实时预览切割框。
 * 通过 onImport 回调解耦，可复用于三种场景：
 * 导入精灵表（追加/替换）、重新切割源图、切割选中帧（原位替换）。
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Modal } from '../../../core/components/ui';
import {
  extractBoxBitmaps,
  gridSliceBoxes,
  mergeBoxes,
  smartSlice,
  type SliceBox,
} from '../../../core/image/slice';
import { hasTransparency, removeSolidBackground } from '../../../core/image/chromaKey';
import { bitmapToBlob } from '../../../core/image/load';
import type { NewFrameInput } from '../types';

type Mode = 'grid' | 'smart';

interface Processed {
  bitmap: ImageBitmap;
  url: string;
  source: ImageBitmap;
  settingsKey: string;
}

export interface SheetDialogProps {
  bitmap: ImageBitmap;
  blobUrl: string;
  onClose: () => void;
  /** replace 仅在 showModeChoice 开启时有意义 */
  onImport: (items: NewFrameInput[], replace: boolean) => void;
  title?: string;
  /** 切出帧的命名前缀 */
  namePrefix?: string;
  confirmLabel?: string;
  /** 是否显示"追加/替换现有帧"选择 */
  showModeChoice?: boolean;
  defaultReplace?: boolean;
}

export function ImportSheetDialog({
  bitmap,
  blobUrl,
  onClose,
  onImport,
  title = '导入精灵表',
  namePrefix = 'sprite',
  confirmLabel = '确认导入',
  showModeChoice = false,
  defaultReplace = false,
}: SheetDialogProps) {
  const [mode, setMode] = useState<Mode>('grid');
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(4);
  const [minSize, setMinSize] = useState(8);
  const [mergeGap, setMergeGap] = useState(12);
  const [replace, setReplace] = useState(defaultReplace);
  const [busy, setBusy] = useState(false);
  // 纯色背景去除
  const [chromaOn, setChromaOn] = useState(false);
  const [autoKeyed, setAutoKeyed] = useState(false);
  const [tolerance, setTolerance] = useState(90);
  const [edgeOnly, setEdgeOnly] = useState(true);
  const [erodePx, setErodePx] = useState(0);
  const [decontaminate, setDecontaminate] = useState(100);
  const [processed, setProcessed] = useState<Processed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<'fit' | '1' | '4'>('fit');
  const [previewBg, setPreviewBg] = useState('checkerboard');
  const [showOriginal, setShowOriginal] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  const settingsKey = `${tolerance}:${edgeOnly}:${erodePx}:${decontaminate}`;
  const current = chromaOn && processed?.source === bitmap && processed.settingsKey === settingsKey
    ? processed : null;
  const processing = chromaOn && !current;

  // 无透明通道的图片（如绿幕 JPG）自动开启色度键，否则智能识别无法工作
  useEffect(() => {
    if (!hasTransparency(bitmap)) {
      setChromaOn(true);
      setAutoKeyed(true);
    }
  }, [bitmap]);

  // 色度键处理（防抖），只接受当前参数的结果。
  useEffect(() => {
    setError(null);
    setProcessed(null);
    if (!chromaOn) return;
    let cancelled = false;
    let result: Processed | null = null;
    let bm: ImageBitmap | null = null;
    const timer = window.setTimeout(async () => {
      try {
        const { canvas } = removeSolidBackground(bitmap, tolerance, edgeOnly, erodePx, decontaminate / 100);
        bm = await createImageBitmap(canvas);
        const blob = await bitmapToBlob(bm);
        if (cancelled) {
          bm.close();
          return;
        }
        result = { bitmap: bm, url: URL.createObjectURL(blob), source: bitmap, settingsKey };
        setProcessed(result);
      } catch (e) {
        bm?.close();
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (result) {
        result.bitmap.close();
        URL.revokeObjectURL(result.url);
      }
    };
  }, [chromaOn, tolerance, edgeOnly, erodePx, decontaminate, bitmap, settingsKey]);

  const sliceSource = current?.bitmap ?? bitmap;

  const boxes: SliceBox[] = useMemo(() => {
    if (mode === 'grid') {
      return gridSliceBoxes(sliceSource, Math.max(1, rows), Math.max(1, cols), true);
    }
    return mergeBoxes(smartSlice(sliceSource, Math.max(2, minSize)), Math.max(0, mergeGap));
  }, [sliceSource, mode, rows, cols, minSize, mergeGap]);

  // 预览缩放比例
  const previewW = 380;
  const scale = previewZoom === 'fit' ? Math.min(1, previewW / bitmap.width, 300 / bitmap.height) : Number(previewZoom);

  const onConfirm = async () => {
    if (!boxes.length || busy || processing) return;
    setBusy(true);
    try {
      const bitmaps = await extractBoxBitmaps(sliceSource, boxes);
      const items: NewFrameInput[] = await Promise.all(
        bitmaps.map(async (b, i) => ({
          bitmap: b,
          blob: await bitmapToBlob(b),
          name: `${namePrefix}_${i}`,
        })),
      );
      onImport(items, replace);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      width={560}
      footer={
        <>
          <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: 12.5, color: 'var(--text-dim)' }}>
            将切出 <b style={{ color: 'var(--text)' }}>{boxes.length}</b> 帧
          </span>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={onConfirm} disabled={!boxes.length || busy || processing}>
            {busy ? '切割中…' : error ? '处理失败' : processing ? '去背处理中…' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="fa-key-preview-controls">
        <label>缩放
          <select className="input" aria-label="预览缩放" value={previewZoom}
            onChange={(e) => setPreviewZoom(e.target.value as typeof previewZoom)}>
            <option value="fit">适应窗口</option>
            <option value="1">100% 原尺寸</option>
            <option value="4">400% 像素检查</option>
          </select>
        </label>
        <label>底色
          <select className="input" aria-label="预览底色" value={previewBg} onChange={(e) => setPreviewBg(e.target.value)}>
            <option value="checkerboard">透明棋盘</option>
            <option value="dark">深色</option>
            <option value="light">浅色</option>
          </select>
        </label>
        <label><input type="checkbox" checked={showOriginal} onChange={(e) => setShowOriginal(e.target.checked)} />原图</label>
        <label><input type="checkbox" checked={showBoxes} onChange={(e) => setShowBoxes(e.target.checked)} />切割框</label>
      </div>
      <div className={`fa-key-preview-scroll ${previewBg === 'checkerboard' ? 'checkerboard' : `fa-key-bg-${previewBg}`}`}>
        <div className="sheet-preview" style={{ width: bitmap.width * scale, height: bitmap.height * scale }}>
          <img
            src={showOriginal ? blobUrl : current?.url ?? blobUrl}
            alt={showOriginal ? '原图预览' : '去背效果预览'}
            style={{ width: bitmap.width * scale, display: 'block', imageRendering: scale >= 1 ? 'pixelated' : 'auto' }}
            draggable={false}
          />
          {showBoxes && boxes.map((b, i) => (
            <div
              key={i}
              className="sheet-box"
              style={{
                left: b.x * scale,
                top: b.y * scale,
                width: b.w * scale,
                height: b.h * scale,
              }}
            >
              <i>{i}</i>
            </div>
          ))}
        </div>
      </div>
      <div className="fa-key-hint" role="status">
        {error ? `去背失败：${error}` : processing ? '正在处理最新参数，请稍候…' : `${bitmap.width}×${bitmap.height} · 按原始分辨率处理，预览缩放不影响导出`}
      </div>

      <div className="field-row" style={{ marginTop: 14 }}>
        <label className="k" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={chromaOn}
            onChange={(e) => setChromaOn(e.target.checked)}
          />
          纯色背景去除
        </label>
        {chromaOn && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-dim)' }}>
            容差
            <input
              type="range"
              className="slider"
              style={{ width: 100 }}
              min={20}
              max={200}
              step={5}
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
            />
            {tolerance}
          </span>
        )}
      </div>
      {chromaOn && (
        <div className="field-row" style={{ marginTop: -4 }}>
          <label className="k" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={edgeOnly} onChange={(e) => setEdgeOnly(e.target.checked)} />
            仅去除与边缘相连的区域
          </label>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-dim)' }}>
            边缘侵蚀
            <input type="range" className="slider" style={{ width: 70 }} min={0} max={4} step={1}
              value={erodePx} onChange={(e) => setErodePx(Number(e.target.value))} />
            {erodePx}px
          </span>
        </div>
      )}
      {chromaOn && (
        <div className="field-row">
          <label className="k" htmlFor="sheet-decontaminate">边缘去色污染</label>
          <span className="fa-key-range">
            <input id="sheet-decontaminate" type="range" className="slider" min={0} max={100} step={5}
              value={decontaminate} onChange={(e) => setDecontaminate(Number(e.target.value))} />
            {decontaminate}%
          </span>
        </div>
      )}
      {autoKeyed && chromaOn && (
        <div style={{ fontSize: 11.5, color: 'var(--amber)', marginBottom: 10 }}>
          检测到图片无透明通道，已自动开启纯色去背；适用于白底、绿幕等纯色背景。
        </div>
      )}
      {chromaOn && (
        <div className="fa-key-hint">
          去色污染用于减少白边/绿边，不模糊图像。默认侵蚀 0px 以保留细线；实体描边残留时再少量增加侵蚀。
          {edgeOnly && '内部封闭的浅色区域会保留；若背景残留在空洞里，可关闭「仅去除与边缘相连的区域」。'}
        </div>
      )}

      <div className="field-row">
        <span className="k">切割方式</span>
        <div className="radio-row">
          <button className={`radio-pill ${mode === 'grid' ? 'on' : ''}`} onClick={() => setMode('grid')}>
            均匀网格
          </button>
          <button className={`radio-pill ${mode === 'smart' ? 'on' : ''}`} onClick={() => setMode('smart')}>
            智能识别（透明连通域）
          </button>
        </div>
      </div>

      {mode === 'grid' ? (
        <>
          <div className="field-row">
            <span className="k">列数（横向帧数）</span>
            <input className="input" type="number" min={1} max={64} value={cols}
              onChange={(e) => setCols(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div className="field-row">
            <span className="k">行数</span>
            <input className="input" type="number" min={1} max={64} value={rows}
              onChange={(e) => setRows(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
            每格自动裁剪透明边缘；源图 {sliceSource.width}×{sliceSource.height}，单格约 {Math.floor(sliceSource.width / cols)}×{Math.floor(sliceSource.height / rows)}
          </div>
        </>
      ) : (
        <>
          <div className="field-row">
            <span className="k">最小素材尺寸 (px)</span>
            <input className="input" type="number" min={2} max={256} value={minSize}
              onChange={(e) => setMinSize(Math.max(2, Number(e.target.value) || 2))} />
          </div>
          <div className="field-row">
            <span className="k">合并间距 (px)</span>
            <input className="input" type="number" min={0} max={128} value={mergeGap}
              onChange={(e) => setMergeGap(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
            识别所有不透明连通区域；间距内的相邻区域自动合并（如脚下投影），小于最小尺寸的杂点会被忽略
          </div>
        </>
      )}

      {showModeChoice && (
        <div className="field-row" style={{ marginTop: 12 }}>
          <span className="k">导入方式</span>
          <div className="radio-row">
            <button className={`radio-pill ${!replace ? 'on' : ''}`} onClick={() => setReplace(false)}>
              追加到末尾
            </button>
            <button className={`radio-pill ${replace ? 'on' : ''}`} onClick={() => setReplace(true)}>
              替换全部帧
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
