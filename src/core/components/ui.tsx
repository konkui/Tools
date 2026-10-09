/**
 * 全局基础 UI 组件。样式类定义在 styles/global.css，
 * 组件只负责语义与行为，保持样式单一出处。
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import type { TagTone } from '../types';

type ButtonVariant = 'default' | 'primary' | 'ghost';

export function Button({
  variant = 'default',
  icon,
  active,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: IconName;
  active?: boolean;
}) {
  const cls = [
    'btn',
    variant !== 'default' ? variant : '',
    active ? 'on' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export function Chip({ tone = 'dim', children }: { tone?: TagTone; children: ReactNode }) {
  return <span className={`chip ${tone}`}>{children}</span>;
}

/** 面板分区的标题栏（如"帧列表""属性"） */
export function PanelHead({ title, extra }: { title: string; extra?: ReactNode }) {
  return (
    <div className="panel-head">
      {title}
      {extra != null && <span style={{ fontWeight: 400 }}>{extra}</span>}
    </div>
  );
}

/** 模态对话框：遮罩 + 居中卡片 */
export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 480,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div
        className="modal"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span>{title}</span>
          <button className="btn ghost" style={{ padding: '4px 6px' }} onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
