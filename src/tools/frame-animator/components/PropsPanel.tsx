/** 属性面板：当前帧、动画设置、项目与导出 */
import { useState } from 'react';
import { useAnimatorStore } from '../store';
import { Button, PanelHead } from '../../../core/components/ui';
import { LOOP_LABELS, type FrameItem, type LoopMode } from '../types';
import { exportAnimation } from '../logic/exporter';
import { useRecentStore } from '../../../core/recent';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function PropsPanel({ onSliceFrame }: { onSliceFrame: (frame: FrameItem) => void }) {
  const frames = useAnimatorStore((s) => s.frames);
  const selectedId = useAnimatorStore((s) => s.selectedId);
  const loop = useAnimatorStore((s) => s.loop);
  const projectName = useAnimatorStore((s) => s.projectName);
  const updateFrame = useAnimatorStore((s) => s.updateFrame);
  const applyDurationToAll = useAnimatorStore((s) => s.applyDurationToAll);
  const applyAnchorToAll = useAnimatorStore((s) => s.applyAnchorToAll);
  const setLoop = useAnimatorStore((s) => s.setLoop);
  const setProjectName = useAnimatorStore((s) => s.setProjectName);
  const clearAll = useAnimatorStore((s) => s.clearAll);

  const [padding, setPadding] = useState(2);
  const [maxSize, setMaxSize] = useState(1024);
  const [exporting, setExporting] = useState(false);

  const frame = frames.find((f) => f.id === selectedId) ?? null;
  const totalMs = frames.reduce((s, f) => s + f.durationMs, 0);

  const onExport = async () => {
    if (!frames.length || exporting) return;
    setExporting(true);
    try {
      await exportAnimation(projectName || 'animation', loop, frames, { padding, maxSize });
      useRecentStore.getState().addRecent({
        id: `export:${projectName}`,
        name: `${projectName}.anim.json`,
        toolId: 'frame-animator',
        detail: `${frames.length} 帧`,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PanelHead title="属性" />
      <div className="fa-props">
        {frame && (
          <div className="prop-group">
            <h4>当前帧</h4>
            <div className="field-row">
              <span className="k">帧时长 (ms)</span>
              <input
                className="input"
                type="number"
                min={16}
                max={5000}
                value={frame.durationMs}
                onChange={(e) => updateFrame(frame.id, { durationMs: clamp(Number(e.target.value) || 16, 16, 5000) })}
              />
            </div>
            <div className="field-row">
              <span className="k">锚点 X (%)</span>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={Math.round(frame.anchorX * 100)}
                onChange={(e) => updateFrame(frame.id, { anchorX: clamp(Number(e.target.value) || 0, 0, 100) / 100 })}
              />
            </div>
            <div className="field-row">
              <span className="k">锚点 Y (%)</span>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={Math.round(frame.anchorY * 100)}
                onChange={(e) => updateFrame(frame.id, { anchorY: clamp(Number(e.target.value) || 0, 0, 100) / 100 })}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Button onClick={() => applyDurationToAll(frame.durationMs)}>时长应用到全部</Button>
              <Button onClick={() => applyAnchorToAll(frame.anchorX, frame.anchorY)}>锚点应用到全部</Button>
              <Button
                icon="scissors"
                onClick={() => onSliceFrame(frame)}
                title="将此帧按网格细分为多个子帧（原位替换）"
              >
                切割此帧
              </Button>
            </div>
          </div>
        )}

        <div className="prop-group">
          <h4>动画</h4>
          <div className="field-row">
            <span className="k">循环模式</span>
            <select className="input" value={loop} onChange={(e) => setLoop(e.target.value as LoopMode)}>
              {(Object.keys(LOOP_LABELS) as LoopMode[]).map((m) => (
                <option key={m} value={m}>{LOOP_LABELS[m]}</option>
              ))}
            </select>
          </div>
          <div className="field-row"><span className="k">帧数</span><span>{frames.length}</span></div>
          <div className="field-row"><span className="k">总时长</span><span>{(totalMs / 1000).toFixed(2)} s</span></div>
          <div className="field-row">
            <span className="k">平均 FPS</span>
            <span>{frames.length ? Math.round(1000 / (totalMs / frames.length)) : '-'}</span>
          </div>
        </div>

        <div className="prop-group">
          <h4>项目</h4>
          <div className="field-row">
            <span className="k">名称</span>
            <input
              className="input"
              style={{ width: 130, textAlign: 'left' }}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button
              onClick={() => {
                if (frames.length === 0 || window.confirm('清空当前所有帧？')) clearAll();
              }}
            >
              清空项目
            </Button>
          </div>
        </div>

        <div className="prop-group">
          <h4>导出图集</h4>
          <div className="field-row">
            <span className="k">边距 (px)</span>
            <input
              className="input"
              type="number"
              min={0}
              max={16}
              value={padding}
              onChange={(e) => setPadding(clamp(Number(e.target.value) || 0, 0, 16))}
            />
          </div>
          <div className="field-row">
            <span className="k">最大尺寸</span>
            <select className="input" value={maxSize} onChange={(e) => setMaxSize(Number(e.target.value))}>
              <option value={512}>512</option>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
            </select>
          </div>
          <Button variant="primary" icon="download" onClick={onExport} disabled={!frames.length || exporting}>
            {exporting ? '导出中…' : '导出 PNG + JSON'}
          </Button>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>
            图集自动重排（shelf 打包），JSON 含帧坐标/时长/锚点
          </div>
        </div>
      </div>
    </>
  );
}
