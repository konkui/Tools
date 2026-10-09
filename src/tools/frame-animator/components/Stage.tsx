/**
 * 预览舞台：Canvas 2D 渲染当前帧（锚点对齐画布中心），
 * rAF 驱动播放，支持洋葱皮、缩放、逐帧步进。
 */
import { useEffect, useRef } from 'react';
import { useAnimatorStore } from '../store';
import { Icon } from '../../../core/components/icons';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 刻度密度自适应：保证屏幕上相邻刻度间距 ≥22px */
function pickWorldStep(zoom: number): number {
  for (const s of [2, 4, 8, 16, 32, 64, 128, 256]) {
    if (s * zoom >= 22) return s;
  }
  return 512;
}

/** 绘制坐标轴：穿过锚点（画布中心）的十字线 + 精灵像素单位的刻度尺 */
function drawAxes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  cy: number,
  zoom: number,
) {
  ctx.save();
  const axisColor = 'rgba(99,102,241,0.55)';
  const tickColor = 'rgba(99,102,241,0.35)';
  const textColor = 'rgba(165,180,252,0.85)';
  const lineX = Math.round(cx) + 0.5;
  const lineY = Math.round(cy) + 0.5;

  ctx.lineWidth = 1;
  ctx.strokeStyle = axisColor;
  ctx.beginPath();
  ctx.moveTo(0, lineY);
  ctx.lineTo(w, lineY);
  ctx.moveTo(lineX, 0);
  ctx.lineTo(lineX, h);
  ctx.stroke();

  const step = pickWorldStep(zoom);
  const px = step * zoom;
  ctx.strokeStyle = tickColor;
  ctx.fillStyle = textColor;
  ctx.font = '10px "Segoe UI", monospace';

  // X 轴刻度（向下小竖线，数值标在线上方）
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const dir of [1, -1]) {
    let x = cx;
    let v = 0;
    for (;;) {
      x += px * dir;
      v += step * dir;
      if (x < 8 || x > w - 8) break;
      const sx = Math.round(x) + 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, cy);
      ctx.lineTo(sx, cy + 5);
      ctx.stroke();
      ctx.fillText(String(v), x, cy - 4);
    }
  }

  // Y 轴刻度（向左小横线，数值标在线右方；屏幕坐标系向下为正）
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const dir of [1, -1]) {
    let y = cy;
    let v = 0;
    for (;;) {
      y += px * dir;
      v += step * dir;
      if (y < 12 || y > h - 8) break;
      const sy = Math.round(y) + 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, sy);
      ctx.lineTo(cx - 5, sy);
      ctx.stroke();
      ctx.fillText(String(v), cx + 7, y);
    }
  }

  // 原点标记
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('0', cx + 4, cy - 3);
  ctx.restore();
}

export function Stage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playing = useAnimatorStore((s) => s.playing);
  const speed = useAnimatorStore((s) => s.speed);
  const zoom = useAnimatorStore((s) => s.zoom);
  const onionSkin = useAnimatorStore((s) => s.onionSkin);
  const showAxes = useAnimatorStore((s) => s.showAxes);
  const frames = useAnimatorStore((s) => s.frames);
  const playingIndex = useAnimatorStore((s) => s.playingIndex);
  const setPlaying = useAnimatorStore((s) => s.setPlaying);
  const stepFrame = useAnimatorStore((s) => s.stepFrame);
  const setSpeed = useAnimatorStore((s) => s.setSpeed);
  const setZoom = useAnimatorStore((s) => s.setZoom);
  const toggleOnion = useAnimatorStore((s) => s.toggleOnion);
  const toggleAxes = useAnimatorStore((s) => s.toggleAxes);
  const autoZoomedRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let dir = 1;

    const draw = () => {
      const s = useAnimatorStore.getState();
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const cssW = wrap.clientWidth;
      const cssH = wrap.clientHeight;
      if (cssW === 0 || cssH === 0) return;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      const cx = cssW / 2;
      const cy = cssH / 2;
      const n = s.frames.length;

      if (n > 0) {
        // 首次有帧时自动缩放到合适大小
        if (!autoZoomedRef.current) {
          autoZoomedRef.current = true;
          const maxDim = Math.max(...s.frames.map((f) => Math.max(f.width, f.height)));
          const fit = clamp(Math.floor((Math.min(cssW, cssH) * 0.55) / maxDim), 1, 8);
          s.setZoom(fit);
        }

        const idx = clamp(s.playingIndex, 0, n - 1);
        const z = s.zoom;
        ctx.imageSmoothingEnabled = false;

        const drawFrame = (i: number, alpha: number) => {
          if (i < 0 || i >= n) return;
          const f = s.frames[i];
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            f.bitmap,
            cx - f.anchorX * f.width * z,
            cy - f.anchorY * f.height * z,
            f.width * z,
            f.height * z,
          );
          ctx.globalAlpha = 1;
        };

        if (s.onionSkin && !s.playing) {
          drawFrame(idx - 1, 0.18);
          drawFrame(idx + 1, 0.12);
        }
        drawFrame(idx, 1);
      }

      // 坐标轴绘制在最上层（半透明，不遮挡判断）
      if (s.showAxes) drawAxes(ctx, cssW, cssH, cx, cy, s.zoom);
    };

    const tick = (t: number) => {
      const s = useAnimatorStore.getState();
      const dt = t - last;
      last = t;
      const n = s.frames.length;
      if (s.playing && n > 0) {
        acc += dt * s.speed;
        let idx = clamp(s.playingIndex, 0, n - 1);
        let guard = 0;
        while (acc >= s.frames[idx].durationMs && guard++ < 200) {
          acc -= s.frames[idx].durationMs;
          if (s.loop === 'loop') {
            idx = (idx + 1) % n;
          } else if (s.loop === 'once') {
            if (idx + 1 >= n) {
              s.setPlaying(false);
              acc = 0;
            } else {
              idx++;
            }
          } else {
            let ni = idx + dir;
            if (ni >= n || ni < 0) {
              dir *= -1;
              ni = n > 1 ? idx + dir : idx;
            }
            idx = clamp(ni, 0, n - 1);
          }
        }
        if (idx !== s.playingIndex) s.setPlayingIndex(idx);
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const current = frames[clamp(playingIndex, 0, Math.max(0, frames.length - 1))];

  return (
    <div className="fa-stage">
      <div className="fa-stage-canvas checkerboard" ref={wrapRef}>
        <canvas ref={canvasRef} />
        {frames.length > 0 && !showAxes && <div className="fa-anchor-cross" />}
        {frames.length === 0 && (
          <div className="fa-empty">
            <Icon name="film" size={36} />
            <div>导入序列帧或精灵表开始制作</div>
            <div style={{ fontSize: 12 }}>也可以直接把图片文件拖进来</div>
          </div>
        )}
      </div>
      <div className="fa-controls">
        <button className="icon-btn" onClick={() => stepFrame(-1)} title="上一帧">
          <Icon name="prev" />
        </button>
        <button
          className="icon-btn primary"
          onClick={() => setPlaying(!playing)}
          title={playing ? '暂停 (空格)' : '播放 (空格)'}
        >
          <Icon name={playing ? 'pause' : 'play'} />
        </button>
        <button className="icon-btn" onClick={() => stepFrame(1)} title="下一帧">
          <Icon name="next" />
        </button>
        <div className="sep" />
        <span className="ctl-label">速度</span>
        <input
          type="range"
          className="slider"
          min={0.25}
          max={2}
          step={0.25}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
        <span className="ctl-label" style={{ minWidth: 32 }}>{speed}×</span>
        <div className="sep" />
        <button className={`btn ${onionSkin ? 'on' : ''}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={toggleOnion}>
          洋葱皮
        </button>
        <button className={`btn ${showAxes ? 'on' : ''}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={toggleAxes} title="显示/隐藏坐标轴（穿过锚点，刻度为精灵像素）">
          坐标轴
        </button>
        <span className="ctl-label">缩放</span>
        <input
          type="range"
          className="slider"
          min={0.5}
          max={8}
          step={0.5}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <span className="ctl-label" style={{ minWidth: 40 }}>{Math.round(zoom * 100)}%</span>
        <div className="spacer" />
        <span className="frame-indicator">
          {frames.length ? `帧 ${playingIndex + 1} / ${frames.length} · ${current?.durationMs ?? 0} ms` : '无帧'}
        </span>
      </div>
    </div>
  );
}
