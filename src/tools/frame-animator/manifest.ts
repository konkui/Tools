import { lazy } from 'react';
import type { ToolDefinition } from '../../core/types';

const manifest: ToolDefinition = {
  id: 'frame-animator',
  name: '帧动画生成器',
  description: '导入序列帧或精灵表，逐帧调整时长与锚点，实时预览播放，导出图集与动画数据',
  icon: 'film',
  accent: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  tags: [{ label: '核心功能', tone: 'green' }],
  order: 10,
  component: lazy(() => import('./Page')),
};

export default manifest;
