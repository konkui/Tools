/** 帧列表面板：缩略图 + 时长，点击选中，可删除 */
import { useAnimatorStore } from '../store';
import { Icon } from '../../../core/components/icons';
import { PanelHead } from '../../../core/components/ui';

export function FramesPanel() {
  const frames = useAnimatorStore((s) => s.frames);
  const selectedId = useAnimatorStore((s) => s.selectedId);
  const selectFrame = useAnimatorStore((s) => s.selectFrame);
  const removeFrame = useAnimatorStore((s) => s.removeFrame);
  const moveFrame = useAnimatorStore((s) => s.moveFrame);
  const playingIndex = useAnimatorStore((s) => s.playingIndex);

  return (
    <>
      <PanelHead title="帧列表" extra={`${frames.length} 帧`} />
      <div className="fa-frame-list">
        {frames.map((f, i) => (
          <div
            key={f.id}
            className={`frame-row ${selectedId === f.id ? 'on' : ''}`}
            onClick={() => selectFrame(f.id)}
          >
            <div className="frame-thumb checkerboard">
              <img src={f.blobUrl} alt={f.name} draggable={false} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="fname">
                {i === playingIndex && <span className="playing-dot" />}帧 {i + 1}
              </div>
              <div className="fdur" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name} · {f.durationMs} ms
              </div>
            </div>
            <div className="frame-ops">
              <button
                className="icon-btn"
                title="上移"
                disabled={i === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  moveFrame(i, i - 1);
                }}
              >
                <Icon name="up" size={13} />
              </button>
              <button
                className="icon-btn"
                title="下移"
                disabled={i === frames.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  moveFrame(i, i + 1);
                }}
              >
                <Icon name="down" size={13} />
              </button>
              <button
                className="icon-btn danger"
                title="删除此帧"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFrame(f.id);
                }}
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          </div>
        ))}
        {frames.length === 0 && (
          <div style={{ padding: 20, color: 'var(--text-faint)', fontSize: 12.5, textAlign: 'center' }}>
            暂无帧
          </div>
        )}
      </div>
    </>
  );
}
