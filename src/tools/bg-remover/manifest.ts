import { lazy } from 'react';
import type { ToolDefinition } from '../../core/types';

const manifest: ToolDefinition = {
  id: 'bg-remover',
  name: '图片去背景',
  description: 'AI 分割模型在浏览器本地运行，一键将素材图透明化，无需上传服务器',
  icon: 'wand',
  accent: 'linear-gradient(135deg,#d946ef,#a855f7)',
  tags: [{ label: 'AI 驱动', tone: 'purple' }],
  order: 30,
  component: lazy(() => import('./Page')),
};

export default manifest;
