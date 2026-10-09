import { lazy } from 'react';
import type { ToolDefinition } from '../../core/types';

const manifest: ToolDefinition = {
  id: 'auto-slicer',
  name: '自动切割',
  description: '识别图中的透明连通区域，一键把整张素材图拆成独立小图并批量导出',
  icon: 'scissors',
  accent: 'linear-gradient(135deg,#f59e0b,#f97316)',
  tags: [{ label: '效率工具', tone: 'amber' }],
  order: 40,
  component: lazy(() => import('./Page')),
};

export default manifest;
