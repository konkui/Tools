import { Suspense } from 'react';
import { createHashRouter, RouterProvider, useParams, Navigate } from 'react-router-dom';
import { HubPage } from './pages/HubPage';
import { getTool } from './core/registry';
import { Icon } from './core/components/icons';

/**
 * 工具路由：/tools/:toolId 统一解析到注册表中的工具组件。
 * 新增工具无需在此添加路由。
 */
function ToolRoute() {
  const { toolId = '' } = useParams();
  const tool = getTool(toolId);
  if (!tool) return <Navigate to="/" replace />;
  const Page = tool.component;
  return (
    <Suspense
      fallback={
        <div className="tool-shell">
          <div className="tool-placeholder">
            <div className="icon-ring">
              <Icon name={tool.icon} size={28} />
            </div>
            <div>正在加载 {tool.name}…</div>
          </div>
        </div>
      }
    >
      <Page />
    </Suspense>
  );
}

const router = createHashRouter([
  { path: '/', element: <HubPage /> },
  { path: '/tools/:toolId', element: <ToolRoute /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
