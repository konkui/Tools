import type { ComponentType, LazyExoticComponent } from 'react';
import type { IconName } from './components/icons';

/** 标签色调，对应全局样式中的 chip 样式 */
export type TagTone = 'green' | 'purple' | 'amber' | 'dim';

export interface ToolTag {
  label: string;
  tone: TagTone;
}

/**
 * 工具定义（清单）。
 * 每个工具模块在 src/tools/<tool-id>/manifest.ts 中导出此对象，
 * 注册表会自动发现并挂载，无需修改任何公共代码。
 */
export interface ToolDefinition {
  /** 唯一标识，同时作为路由路径 /tools/<id> */
  id: string;
  /** 显示名称 */
  name: string;
  /** 一句话描述，显示在首页卡片 */
  description: string;
  /** 图标名（见 core/components/icons.tsx） */
  icon: IconName;
  /** 卡片图标的渐变背景，如 'linear-gradient(135deg,#6366f1,#8b5cf6)' */
  accent: string;
  /** 卡片上的标签 */
  tags: ToolTag[];
  /** 在首页和侧边栏中的排序，越小越靠前 */
  order: number;
  /** 设为 false 可临时下架工具而不删除代码 */
  enabled?: boolean;
  /** 工具页面组件（务必使用 React.lazy 动态引入，避免阻塞首页加载） */
  component: LazyExoticComponent<ComponentType>;
}
