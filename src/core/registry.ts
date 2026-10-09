import type { ToolDefinition } from './types';

/**
 * 工具注册表。
 * 通过 Vite 的 import.meta.glob 自动发现 src/tools/<id>/manifest.ts，
 * 新增工具 = 新建一个包含 manifest.ts 的文件夹；删除工具 = 删除该文件夹。
 * 无需在此处或路由中手动登记。
 */
const modules = import.meta.glob<{ default: ToolDefinition }>(
  '../tools/*/manifest.ts',
  { eager: true },
);

function collectTools(): ToolDefinition[] {
  const seen = new Set<string>();
  const result: ToolDefinition[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    const tool = mod?.default;
    if (!tool) {
      console.warn(`[registry] ${path} 缺少 default 导出的 ToolDefinition，已跳过`);
      continue;
    }
    if (tool.enabled === false) continue;
    if (seen.has(tool.id)) {
      console.warn(`[registry] 重复的工具 id "${tool.id}"（${path}），已跳过`);
      continue;
    }
    seen.add(tool.id);
    result.push(tool);
  }
  return result.sort((a, b) => a.order - b.order);
}

/** 所有已启用工具，按 order 排序 */
export const tools: ToolDefinition[] = collectTools();

export function getTool(id: string): ToolDefinition | undefined {
  return tools.find((t) => t.id === id);
}
