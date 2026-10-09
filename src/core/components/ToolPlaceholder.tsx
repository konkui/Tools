/**
 * 工具占位页：工具功能尚未实现时展示的统一空状态。
 */
import { ToolShell } from './ToolShell';
import { Icon, type IconName } from './icons';

export function ToolPlaceholder({
  title,
  icon,
  hint,
}: {
  title: string;
  icon: IconName;
  hint?: string;
}) {
  return (
    <ToolShell title={title}>
      <div className="tool-placeholder">
        <div className="icon-ring">
          <Icon name={icon} size={30} />
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-dim)' }}>{title}</div>
        <div style={{ fontSize: 12.5 }}>{hint ?? '功能开发中，敬请期待'}</div>
      </div>
    </ToolShell>
  );
}
