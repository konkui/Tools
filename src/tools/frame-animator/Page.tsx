/**
 * 帧动画生成器页面：组装工具栏、左侧（帧列表/素材库）、预览舞台、属性面板、时间轴。
 * 切割对话框支持三种场景：导入精灵表、重新切割源图、切割选中帧（原位替换）。
 */
import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../../core/components/ToolShell';
import { Button } from '../../core/components/ui';
import { fileToBitmap } from '../../core/image/load';
import { useAnimatorStore, loadPersistedProject, subscribePersistence } from './store';
import type { FrameItem, NewFrameInput } from './types';
import { FramesPanel } from './components/FramesPanel';
import { LibraryPanel } from './components/LibraryPanel';
import { Stage } from './components/Stage';
import { PropsPanel } from './components/PropsPanel';
import { Timeline } from './components/Timeline';
import { ImportSheetDialog } from './components/ImportSheetDialog';
import { SaveLibraryDialog } from './components/SaveLibraryDialog';
import './style.css';

interface SheetDialogState {
  bitmap: ImageBitmap;
  blobUrl: string;
  /** 是否由对话框负责释放 blobUrl（frame 自有的不能释放） */
  ownsUrl: boolean;
  kind: 'import' | 'reslice' | 'subdivide';
  frameId?: string;
  frameName?: string;
}

export default function FrameAnimatorPage() {
  const projectName = useAnimatorStore((s) => s.projectName);
  const framesCount = useAnimatorStore((s) => s.frames.length);
  const leftTab = useAnimatorStore((s) => s.leftTab);
  const setLeftTab = useAnimatorStore((s) => s.setLeftTab);
  const importFiles = useAnimatorStore((s) => s.importFiles);
  const sheetBitmap = useAnimatorStore((s) => s.sheetBitmap);
  const sheetBlob = useAnimatorStore((s) => s.sheetBlob);
  const setSheetSource = useAnimatorStore((s) => s.setSheetSource);
  const addBitmaps = useAnimatorStore((s) => s.addBitmaps);
  const replaceAllFrames = useAnimatorStore((s) => s.replaceAllFrames);
  const replaceFrameAt = useAnimatorStore((s) => s.replaceFrameAt);

  const sequenceInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState<SheetDialogState | null>(null);
  const [showSaveLib, setShowSaveLib] = useState(false);
  /** 点"重新切割"但无源图时，引导选文件后进入 reslice 模式 */
  const reslicePendingRef = useRef(false);

  // 恢复上次项目 + 订阅自动保存
  useEffect(() => {
    void loadPersistedProject();
    return subscribePersistence();
  }, []);

  // 快捷键：空格播放/暂停，左右方向键逐帧
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
      const s = useAnimatorStore.getState();
      if (e.code === 'Space') {
        e.preventDefault();
        if (s.frames.length) s.setPlaying(!s.playing);
      } else if (e.code === 'ArrowLeft') {
        s.stepFrame(-1);
      } else if (e.code === 'ArrowRight') {
        s.stepFrame(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onPickSequence = () => sequenceInputRef.current?.click();
  const onPickSheet = () => sheetInputRef.current?.click();

  const closeDialog = () => {
    setDialog((d) => {
      if (d?.ownsUrl) URL.revokeObjectURL(d.blobUrl);
      return null;
    });
  };

  const onSheetFile = async (file: File) => {
    const bitmap = await fileToBitmap(file);
    await setSheetSource(file);
    const kind = reslicePendingRef.current ? 'reslice' : 'import';
    reslicePendingRef.current = false;
    setDialog({ bitmap, blobUrl: URL.createObjectURL(file), ownsUrl: true, kind });
  };

  const onReslice = () => {
    if (sheetBitmap && sheetBlob) {
      setDialog({
        bitmap: sheetBitmap,
        blobUrl: URL.createObjectURL(sheetBlob),
        ownsUrl: true,
        kind: 'reslice',
      });
    } else {
      // 无源图：引导用户选精灵表，选完直接进入重新切割模式
      reslicePendingRef.current = true;
      sheetInputRef.current?.click();
    }
  };

  const onSliceFrame = (frame: FrameItem) => {
    setDialog({
      bitmap: frame.bitmap,
      blobUrl: frame.blobUrl,
      ownsUrl: false,
      kind: 'subdivide',
      frameId: frame.id,
      frameName: frame.name,
    });
  };

  const handleImport = (items: NewFrameInput[], replace: boolean) => {
    if (!dialog) return;
    if (dialog.kind === 'subdivide' && dialog.frameId) {
      replaceFrameAt(dialog.frameId, items);
    } else if (replace) {
      replaceAllFrames(items);
    } else {
      addBitmaps(items);
    }
    setLeftTab('frames');
  };

  return (
    <ToolShell
      title="帧动画生成器"
      file={`${projectName}.anim.json`}
      actions={
        <>
          <Button icon="upload" onClick={onPickSequence}>导入序列帧</Button>
          <Button icon="sheet" onClick={onPickSheet}>导入精灵表</Button>
          <Button
            icon="scissors"
            onClick={onReslice}
            title={sheetBitmap ? '用当前精灵表源图重新切割' : '选择精灵表图片进行切割'}
          >
            重新切割
          </Button>
          <div className="sep" />
          <Button
            icon="save"
            onClick={() => setShowSaveLib(true)}
            disabled={!framesCount}
            title="保存当前动画到素材库"
          >
            保存到库
          </Button>
          <Button
            icon="library"
            active={leftTab === 'library'}
            onClick={() => setLeftTab(leftTab === 'library' ? 'frames' : 'library')}
          >
            素材库
          </Button>
        </>
      }
    >
      <aside className="sidepanel fa-left">
        <div className="fa-tabs">
          <button className={`fa-tab ${leftTab === 'frames' ? 'on' : ''}`} onClick={() => setLeftTab('frames')}>
            帧列表
          </button>
          <button className={`fa-tab ${leftTab === 'library' ? 'on' : ''}`} onClick={() => setLeftTab('library')}>
            素材库
          </button>
        </div>
        {leftTab === 'frames' ? <FramesPanel /> : <LibraryPanel />}
      </aside>

      <div
        className="fa-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void importFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <Stage />
        <Timeline onAdd={onPickSequence} />
      </div>

      <aside className="sidepanel fa-right">
        <PropsPanel onSliceFrame={onSliceFrame} />
      </aside>

      <input
        ref={sequenceInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void importFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      <input
        ref={sheetInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onSheetFile(f);
          e.target.value = '';
        }}
      />

      {dialog && (
        <ImportSheetDialog
          bitmap={dialog.bitmap}
          blobUrl={dialog.blobUrl}
          onClose={closeDialog}
          onImport={handleImport}
          title={
            dialog.kind === 'subdivide'
              ? `切割帧「${dialog.frameName}」`
              : dialog.kind === 'reslice'
                ? '重新切割精灵表'
                : '导入精灵表'
          }
          namePrefix={dialog.kind === 'subdivide' ? dialog.frameName : 'sprite'}
          confirmLabel={dialog.kind === 'subdivide' ? '确认切割' : '确认导入'}
          showModeChoice={dialog.kind !== 'subdivide' && framesCount > 0}
          defaultReplace={dialog.kind === 'reslice'}
        />
      )}
      {showSaveLib && <SaveLibraryDialog onClose={() => setShowSaveLib(false)} />}
    </ToolShell>
  );
}
