/**
 * 首页侧边栏：Logo、导航（工具列表来自注册表，自动同步）。
 */
import { Link } from 'react-router-dom';
import { tools } from '../registry';
import { Icon } from './icons';

export function Sidebar() {
  return (
    <aside className="sidepanel hub-side">
      <div className="logo">
        <div className="logo-badge">
          <Icon name="cube" size={18} />
        </div>
        <div>
          <div className="logo-name">GameDevKit</div>
          <div className="logo-sub">2D 游戏开发工具集</div>
        </div>
      </div>
      <nav className="nav">
        <div className="nav-item on">
          <Icon name="home" />
          首页
        </div>
        <div className="nav-label">工具</div>
        {tools.map((t) => (
          <Link key={t.id} to={`/tools/${t.id}`} className="nav-item">
            <Icon name={t.icon} />
            {t.name}
          </Link>
        ))}
      </nav>
      <div className="nav" style={{ flex: 'none', borderTop: '1px solid var(--border)' }}>
        <div className="nav-item">
          <Icon name="settings" />
          设置
        </div>
      </div>
    </aside>
  );
}
