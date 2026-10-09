/** 底部时间轴：帧缩略条，拖拽排序，"+" 追加帧 */
import { useRef, useState } from 'react';
import { useAnimatorStore } from '../store';
import { Icon } from '../../../core/components/icons';

const ITEM_STEP = 62; // 56 宽 + 6 间距

export function Timeline({ onAdd }: { onAdd: () => void }) {
  const frames = useAnimatorStore((s) => s.frames);
  const playingIndex = useAnimatorStore((s) => s.playingIndex);
  const selectFrame = useAnimatorStore((s) => s.selectFrame);
  const moveFrame = useAnimatorStore((s) => s.moveFrame);
  const stripRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);

  const startDrag = (e: React.PointerEvent, index: number) => {
    if (frames.length < 2) return;
    e.preventDefault();
    const strip = stripRef.current;
    if (!strip) return;
    const rect = strip.getBoundingClientRect();
    const from = index;
    const move = (ev: PointerEvent) => {
      const over = Math.min(
        frames.length - 1,
        Math.max(0, Math.floor((ev.clientX - rect.left + strip.scrollLeft - 12) / ITEM_STEP + 0.5)),
      );
      setDrag((d) => (d && d.over === over ? d : { from, over }));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const over = Math.min(
        frames.length - 1,
        Math.max(0, Math.floor((ev.clientX - rect.left + strip.scrollLeft - 12) / ITEM_STEP + 0.5)),
      );
      setDrag(null);
      if (over !== from) moveFrame(from, over);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    setDrag({ from, over: from });
  };

  const totalMs = frames.reduce((s, f) => s + f.durationMs, 0);

  return (
    <div className="fa-timeline">
      <div className="tl-ruler">
        {frames.map((_, i) => {
          const t = frames.slice(0, i).reduce((s, f) => s + f.durationMs, 0);
          return (
            <span key={i} style={{ left: 12 + i * ITEM_STEP + 2 }}>
              {t}
            </span>
          );
        })}
        {frames.length > 0 && (
          <span style={{ left: 12 + frames.length * ITEM_STEP + 2 }}>{totalMs}</span>
        )}
      </div>
      <div className="tl-frames" ref={stripRef}>
        {frames.map((f, i) => (
          <div
            key={f.id}
            className={[
              'tl-frame',
              'checkerboard',
              i === playingIndex ? 'on' : '',
              drag?.from === i ? 'dragging' : '',
              drag && drag.over === i && drag.from !== i ? 'drop-target' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onPointerDown={(e) => startDrag(e, i)}
            onClick={() => selectFrame(f.id)}
            title={`帧 ${i + 1} · ${f.name}`}
          >
            <span className="idx">{i + 1}</span>
            <img src={f.blobUrl} alt="" draggable={false} />
          </div>
        ))}
        <button className="tl-add" onClick={onAdd} title="追加帧（导入序列帧）">
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );
}
