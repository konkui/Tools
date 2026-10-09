/** 保存到素材库对话框：名称 + 标签 */
import { useState } from 'react';
import { Button, Modal } from '../../../core/components/ui';
import { useLibraryStore } from '../library';
import { useAnimatorStore } from '../store';
import { useRecentStore } from '../../../core/recent';

export function SaveLibraryDialog({ onClose }: { onClose: () => void }) {
  const projectName = useAnimatorStore((s) => s.projectName);
  const serialize = useAnimatorStore((s) => s.serialize);
  const setLeftTab = useAnimatorStore((s) => s.setLeftTab);
  const save = useLibraryStore((s) => s.save);
  const [name, setName] = useState(projectName);
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const project = serialize();
      if (name.trim()) project.name = name.trim();
      const tagList = tags.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean);
      await save(project, tagList);
      useRecentStore.getState().addRecent({
        id: `animlib:${project.name}`,
        name: project.name,
        toolId: 'frame-animator',
        detail: `${project.frames.length} 帧`,
      });
      setLeftTab('library');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="保存到素材库"
      onClose={onClose}
      width={400}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={onSave} disabled={busy}>
            {busy ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      <div className="field-row">
        <span className="k">名称</span>
        <input
          className="input"
          style={{ width: 220, textAlign: 'left' }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field-row">
        <span className="k">标签</span>
        <input
          className="input"
          style={{ width: 220, textAlign: 'left' }}
          placeholder="如：像素, 史莱姆, 待机"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
        标签便于以后检索，也会写进给 AI 的文字描述里
      </div>
    </Modal>
  );
}
