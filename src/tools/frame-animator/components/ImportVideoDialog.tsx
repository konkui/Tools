/**
 * 视频导入对话框：预览视频，按"每秒 N 帧 / 固定帧数"采样抽帧，
 * 可选色度键去背景与输出缩放，进度可视。
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Modal } from '../../../core/components/ui';
import {
  computeSampleTimes,
  extractFrames,
  loadVideo,
  releaseVideo,
  type LoadedVideo,
  type SampleMode,
} from '../logic/videoExtract';
import type { NewFrameInput } from '../types';

const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function ImportVideoDialog({
  file,
  onClose,
  onImport,
  showModeChoice = false,
  defaultReplace = false,
}: {
  file: File;
  onClose: () => void;
  onImport: (items: NewFrameInput[], replace: boolean) => void;
  showModeChoice?: boolean;
  defaultReplace?: boolean;
}) {
  const [loaded, setLoaded] = useState<LoadedVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);
  const [mode, setMode] = useState<SampleMode>('fps');
  const [fpsValue, setFpsValue] = useState(8);
  const [countValue, setCountValue] = useState(12);
  const [targetHeight, setTargetHeight] = useState(160);
  const [chromaOn, setChromaOn] = useState(true);
  const [tolerance, setTolerance] = useState(90);
  const [replace, setReplace] = useState(defaultReplace);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    let alive = true;
    loadVideo(file)
      .then((l) => {
        if (!alive) return;
        setLoaded(l);
        setTo(Number(l.info.duration.toFixed(2)));
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [file]);

  // 卸载时释放视频资源
  useEffect(() => {
    return () => {
      if (loaded) releaseVideo(loaded);
    };
  }, [loaded]);

  const times = useMemo(() => {
    if (!loaded) return [];
    return computeSampleTimes(
      loaded.info.duration,
      from,
      to,
      mode,
      mode === 'fps' ? fpsValue : countValue,
    );
  }, [loaded, from, to, mode, fpsValue, countValue]);

  const extracting = progress !== null;

  const onConfirm = async () => {
    if (!loaded || !times.length || extracting) return;
    setProgress({ done: 0, total: times.length });
    try {
      const items = await extractFrames(loaded.video, times, {
        chromaKey: chromaOn,
        tolerance,
        targetHeight,
        namePrefix: 'video',
        onProgress: (done, total) => setProgress({ done, total }),
      });
      onImport(items, replace);
      onClose();
    } finally {
      setProgress(null);
    }
  };

  const info = loaded?.info;

  return (
    <Modal
      title="导入视频抽帧"
      onClose={onClose}
      width={560}
      footer={
        <>
          <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: 12.5, color: 'var(--text-dim)' }}>
            预计抽出 <b style={{ color: 'var(--text)' }}>{times.length}</b> 帧
          </span>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={onConfirm} disabled={!loaded || !times.length || extracting}>
            {extracting ? `抽取中 ${progress.done}/${progress.total}` : '抽取并导入'}
          </Button>
        </>
      }
    >
      {error && <div style={{ color: 'var(--red)', fontSize: 13, padding: '8px 0' }}>{error}</div>}
      {!loaded && !error && (
        <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          正在加载视频…
        </div>
      )}

      {loaded && (
        <>
          <div className="video-preview checkerboard">
            <video src={loaded.url} autoPlay muted loop playsInline />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '8px 0 12px' }}>
            {file.name} · {info!.width}×{info!.height} · 时长 {info!.duration.toFixed(2)} s
          </div>

          <div className="field-row">
            <span className="k">起始 (秒)</span>
            <input className="input" type="number" min={0} max={info!.duration} step={0.1} value={from}
              onChange={(e) => setFrom(clampNum(Number(e.target.value) || 0, 0, info!.duration))} />
          </div>
          <div className="field-row">
            <span className="k">结束 (秒)</span>
            <input className="input" type="number" min={0} max={info!.duration} step={0.1} value={to}
              onChange={(e) => setTo(clampNum(Number(e.target.value) || 0, 0, info!.duration))} />
          </div>
          <div className="field-row">
            <span className="k">采样方式</span>
            <div className="radio-row">
              <button className={`radio-pill ${mode === 'fps' ? 'on' : ''}`} onClick={() => setMode('fps')}>
                每秒 N 帧
              </button>
              <button className={`radio-pill ${mode === 'count' ? 'on' : ''}`} onClick={() => setMode('count')}>
                固定帧数
              </button>
            </div>
          </div>
          <div className="field-row">
            <span className="k">{mode === 'fps' ? '每秒抽帧数' : '总帧数'}</span>
            {mode === 'fps' ? (
              <input className="input" type="number" min={1} max={30} value={fpsValue}
                onChange={(e) => setFpsValue(clampNum(Number(e.target.value) || 1, 1, 30))} />
            ) : (
              <input className="input" type="number" min={1} max={120} value={countValue}
                onChange={(e) => setCountValue(clampNum(Math.round(Number(e.target.value) || 1), 1, 120))} />
            )}
          </div>
          <div className="field-row">
            <span className="k">输出高度 (px)</span>
            <input className="input" type="number" min={0} max={1080} step={8} value={targetHeight}
              onChange={(e) => setTargetHeight(clampNum(Math.round(Number(e.target.value) || 0), 0, 1080))} />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 10 }}>
            AI 视频通常是 720p/1080p，缩到精灵尺寸（如 128~192）再像素化效果更好；填 0 保持原始尺寸
          </div>

          <div className="field-row">
            <label className="k" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={chromaOn} onChange={(e) => setChromaOn(e.target.checked)} />
              纯色背景去除
            </label>
            {chromaOn && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                容差
                <input type="range" className="slider" style={{ width: 100 }} min={20} max={200} step={5}
                  value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} />
                {tolerance}
              </span>
            )}
          </div>
          {chromaOn && (
            <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 10 }}>
              视频帧无透明通道，生成视频时提示词加"纯白/纯绿背景、无阴影"效果最好
            </div>
          )}

          {showModeChoice && (
            <div className="field-row" style={{ marginTop: 4 }}>
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

          {extracting && (
            <div className="fa-progress">
              <i style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
