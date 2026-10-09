/**
 * 素材库面板：库卡片实时播放动画预览，
 * 一键复制精灵条参考图 / 文字描述（用于给 AI 看想要的效果）。
 */
import { useEffect, useRef, useState } from 'react';
import { PanelHead } from '../../../core/components/ui';
import { Icon } from '../../../core/components/icons';
import { copyImageToClipboard, copyTextToClipboard, downloadBlob } from '../../../core/download';
import { useLibraryStore } from '../library';
import { decodeStoredFrames, useAnimatorStore } from '../store';
import { buildDescription, makeStripBlob } from '../logic/exporter';
import { LOOP_LABELS, type FrameItem, type LibraryItem } from '../types';

/** 库卡片：解码帧并用小画布循环播放 */
function LibraryCard({ item }: { item: LibraryItem }) {
  const dirty = useAnimatorStore((s) => s.dirty);
  const framesCount = useAnimatorStore((s) => s.frames.length);
  const remove = useLibraryStore((s) => s.remove);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<FrameItem[]>([]);
  const [copied, setCopied] = useState<'img' | 'text' | null>(null);

  useEffect(() => {
    let cancelled = false;
    decodeStoredFrames(item.frames).then((frames) => {
      if (!cancelled) framesRef.current = frames;
    });
    return () => {
      cancelled = true;
    };
  }, [item]);

  // 播放循环
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let idx = 0;
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      const frames = framesRef.current;
      const canvas = canvasRef.current;
      if (frames.length && canvas) {
        acc += dt;
        let guard = 0;
        while (acc >= frames[idx].durationMs && guard++ < 100) {
          acc -= frames[idx].durationMs;
          idx = (idx + 1) % frames.length;
        }
        const ctx = canvas.getContext('2d')!;
        const cw = canvas.width;
        const ch = canvas.height;
        ctx.clearRect(0, 0, cw, ch);
        const f = frames[idx];
        const scale = Math.min(cw / f.width, ch / f.height, 4);
        const w = Math.max(1, Math.round(f.width * scale));
        const h = Math.max(1, Math.round(f.height * scale));
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(f.bitmap, (cw - w) / 2, (ch - h) / 2, w, h);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const flash = (kind: 'img' | 'text') => {
    setCopied(kind);
    setTimeout(() => setCopied(null), 1200);
  };

  const onCopyImage = async () => {
    const frames = framesRef.current.length ? framesRef.current : await decodeStoredFrames(item.frames);
    const blob = await makeStripBlob(frames);
    const ok = await copyImageToClipboard(blob);
    if (!ok) downloadBlob(blob, `${item.name}-strip.png`);
    flash('img');
  };

  const onCopyText = async () => {
    const frames = framesRef.current;
    await copyTextToClipboard(
      buildDescription(
        item.name,
        item.loop,
        frames.map((f) => ({ width: f.width, height: f.height, durationMs: f.durationMs })),
        item.tags,
      ),
    );
    flash('text');
  };

  const onLoad = async () => {
    if (dirty && framesCount > 0 && !window.confirm('载入库动画将替换当前未保存的修改，继续？')) return;
    await useAnimatorStore.getState().restore(item);
    useAnimatorStore.getState().setLeftTab('frames');
  };

  return (
    <div className="lib-card">
      <div className="lib-thumb checkerboard">
        <canvas ref={canvasRef} width={76} height={76} />
      </div>
      <div className="lib-info">
        <div className="lib-name" title={item.name}>{item.name}</div>
        <div className="lib-meta">
          {item.frames.length} 帧 · {LOOP_LABELS[item.loop]}
        </div>
        {item.tags.length > 0 && <div className="lib-tags">{item.tags.join(' · ')}</div>}
      </div>
      <div className="lib-actions">
        <button className="icon-btn" title="载入编辑器" onClick={onLoad}>
          <Icon name="upload" size={13} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <button className="icon-btn" title="复制精灵条参考图（粘贴给 AI）" onClick={onCopyImage}>
          <Icon name={copied === 'img' ? 'check' : 'copy'} size={13} />
        </button>
        <button className="icon-btn" title="复制文字描述（粘贴给 AI）" onClick={onCopyText}>
          <Icon name={copied === 'text' ? 'check' : 'library'} size={13} />
        </button>
        <button
          className="icon-btn danger"
          title="从库中删除"
          onClick={() => window.confirm(`删除「${item.name}」？`) && remove(item.id)}
        >
          <Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  );
}

export function LibraryPanel() {
  const items = useLibraryStore((s) => s.items);
  const loaded = useLibraryStore((s) => s.loaded);
  const refresh = useLibraryStore((s) => s.refresh);

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);

  return (
    <>
      <PanelHead title="素材库" extra={`${items.length} 个`} />
      <div className="fa-frame-list">
        {items.map((item) => (
          <LibraryCard key={item.id} item={item} />
        ))}
        {loaded && items.length === 0 && (
          <div style={{ padding: 20, color: 'var(--text-faint)', fontSize: 12.5, textAlign: 'center', lineHeight: 1.8 }}>
            库还是空的<br />做好动画后点工具栏「保存到库」
          </div>
        )}
      </div>
    </>
  );
}
