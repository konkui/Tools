# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## 项目简介

GameDevKit：面向 2D 游戏的网页版开发工具集合（React 18 + TypeScript + Vite + React Router 6 + Zustand）。当前包含 4 个工具：帧动画生成器、地图编辑器、图片去背景（浏览器端 AI 模型）、自动切割。工具功能尚未实现，目前是可插拔架构 + 首页工作台 + 占位页。

## 常用命令

```bash
npm run dev       # 启动开发服务器，固定 http://127.0.0.1:5173
npm run build     # 先 tsc 全量类型检查再 vite 构建；提交前必须能跑通
npm run preview   # 预览构建产物
```

无测试框架与 lint 配置；`npm run build` 中的 `tsc`（strict + noUnusedLocals）即当前的代码门禁。

## 核心架构：工具注册表（可插拔设计）

**最重要的约定：新增/删除工具只操作 `src/tools/<tool-id>/` 一个文件夹，不改任何公共代码。**

- `src/core/types.ts` 定义 `ToolDefinition`（工具清单契约：id、名称、描述、图标、渐变、标签、排序、懒加载组件）。
- `src/core/registry.ts` 通过 `import.meta.glob('../tools/*/manifest.ts', { eager: true })` 自动发现所有工具，校验重复 id / 缺失导出，`enabled: false` 可临时下架。
- `src/App.tsx` 用统一的 `/tools/:toolId` 动态路由解析到注册表组件（React.lazy + Suspense），新工具**不需要**加路由。
- 每个工具模块结构：`manifest.ts`（default 导出 ToolDefinition，`component: lazy(() => import('./Page'))`）+ `Page.tsx`（default 导出页面）+ 私有的组件/状态/样式文件。参考已实现范例 `src/tools/frame-animator/`：`store.ts`（zustand + IndexedDB 防抖自动保存）、`library.ts`（素材库）、`logic/`（packer/exporter/videoExtract 纯逻辑）、`components/`（UI）、`style.css`（私有样式，fa- 前缀）。
- 工具的 `id` 即路由路径，全局唯一。

新增一个工具的完整流程：复制任一现有工具文件夹 → 改 manifest 的 id/name/描述/图标/order → 在 Page.tsx 实现界面。完成。

## 分层结构

- `src/core/` —— 跨工具共享层：`types.ts`（契约）、`registry.ts`（发现）、`recent.ts`（最近项目，zustand persist 到 localStorage，key `gdk-recent`）、`components/`（UI 套件）。
- `src/core/db.ts` —— IndexedDB 最小封装（Promise 风格）。store：`animLib`（动画素材库）、`project`（各工具工作项目自动保存）。新增 store 需提升 DB_VERSION。
- `src/core/image/` —— 共享图像算法：`slice.ts`（gridSliceBoxes 均匀网格 / smartSlice 透明连通域切割 / extractBoxBitmaps）、`load.ts`（File↔ImageBitmap↔Blob 转换）。自动切割工具与帧动画共用。
- `src/core/download.ts` —— downloadBlob / copyImageToClipboard / copyTextToClipboard。
- `src/core/components/` —— `ui.tsx`（Button/Chip/PanelHead）、`icons.tsx`（集中式 SVG 图标库，新图标在 `ICONS` 表追加一条即可获得类型安全）、`ToolShell.tsx`（工具工作区外壳：返回+标题+文件名+动作区，**所有工具页面必须用它**保证交互一致）、`ToolPlaceholder.tsx`（未实现工具的统一空状态）、`Sidebar.tsx`（首页侧边栏，工具列表读注册表）。
- `src/pages/HubPage.tsx` —— 首页工作台，卡片和侧边栏完全由注册表驱动，无硬编码工具列表。
- `src/styles/global.css` —— 设计令牌（CSS 变量）与通用组件样式的**单一出处**。深色专业工具风：背景 `#16171b`，面板 `#1f2126`，主色 `#6366f1`。通用样式（.btn/.chip/.toolbar/.sidepanel 等）都定义在这里，组件只负责语义。

## 编码约定

- 样式：优先复用 global.css 中的类与设计令牌；工具私有样式放 `src/tools/<id>/` 下，不要污染全局。
- 状态：跨工具共享的用 zustand 放 `src/core/`；工具内部状态放工具自己的文件夹。
- 图标：不许散落内联 SVG，统一加进 `icons.tsx`。
- 高保真界面原型在 `mockup/index.html`（含 4 个界面的目标效果截图 `mockup/shot-*.png`），实现工具功能时以此为准。
- `mockup/e2e-*.js` 是 playwright-cli 的 E2E 冒烟脚本（注入测试精灵图、验证导入/播放/持久化），改动帧动画工具后可复用；PowerShell 里用 `playwright-cli run-code (Get-Content -Raw -Encoding UTF8 <file>)` 运行（必须 UTF8，否则中文字符串损坏）。
- 渲染选型：帧动画用 Canvas 2D（够用、零依赖）；PixiJS 留给地图编辑器。
- 帧动画导出格式与 Unity Sprite Editor 同构（逐帧 rect + 归一化锚点），帧尺寸允许不统一；已确认不实现"保留格子尺寸"和"统一画布导出"两个开关，除非未来目标引擎要求均匀帧。播放防抖动靠锚点设脚底（Y=100%）。
- 规划中的方向：文件读写将抽象为独立层（浏览器 File System Access API，远期可换 Tauri）；去背景用浏览器端模型（RMBG-1.4 / transformers.js）。
