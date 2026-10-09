/**
 * 工具工作区外壳：统一的顶部工具栏（返回、标题、当前文件、动作区）+ 内容区。
 * 每个工具页面都应使用它，保证工具间交互一致。
 */
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './icons';

export function ToolShell({
  title,
  file,
  actions,
  children,
}: {
  title: string;
  /** 当前打开的文件名，可选 */
  file?: string;
  /** 工具栏右侧的动作按钮区 */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="tool-shell">
      <div className="toolbar">
        <button
          className="btn ghost"
          style={{ padding: '6px 8px' }}
          onClick={() => navigate('/')}
          title="返回首页"
        >
          <Icon name="back" />
        </button>
        <span className="title">{title}</span>
        {file && <span className="file">{file}</span>}
        <div className="spacer" />
        {actions}
      </div>
      <div className="tool-body">{children}</div>
    </div>
  );
}
