import { lazy } from 'react';
import type { ToolDefinition } from '../../core/types';

const manifest: ToolDefinition = {
  id: 'map-editor',
  name: '地图编辑器',
  description: '瓦片笔刷、多图层绘制、碰撞标记，网格吸附，导出 JSON 地图数据供游戏加载',
  icon: 'map',
  accent: 'linear-gradient(135deg,#059669,#34d399)',
  tags: [{ label: '核心功能', tone: 'green' }],
  order: 20,
  component: lazy(() => import('./Page')),
};

export default manifest;
