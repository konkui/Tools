/**
 * 首页工作台：工具卡片 + 最近项目，数据全部来自注册表与最近记录存储。
 */
import { useNavigate } from 'react-router-dom';
import { tools, getTool } from '../core/registry';
import { Icon } from '../core/components/icons';
import { Chip } from '../core/components/ui';
import { Sidebar } from '../core/components/Sidebar';
import { useRecentStore, formatRelativeTime } from '../core/recent';

export function HubPage() {
  const navigate = useNavigate();
  const recents = useRecentStore((s) => s.entries);

  return (
    <div className="hub">
      <Sidebar />
      <main className="hub-main">
        <h1>工作台</h1>
        <div className="hub-sub">选择工具开始创作 · 所有数据保存在本地，无需联网</div>

        <div className="cards">
          {tools.map((t) => (
            <button key={t.id} className="card" onClick={() => navigate(`/tools/${t.id}`)}>
              <div className="card-top">
                <div className="card-icon" style={{ background: t.accent }}>
                  <Icon name={t.icon} size={20} />
                </div>
                <h3>{t.name}</h3>
              </div>
              <p>{t.description}</p>
              <div className="card-foot">
                <span style={{ display: 'flex', gap: 6 }}>
                  {t.tags.map((tag) => (
                    <Chip key={tag.label} tone={tag.tone}>
                      {tag.label}
                    </Chip>
                  ))}
                </span>
                <span className="card-open">打开工具 →</span>
              </div>
            </button>
          ))}
        </div>

        <div className="section-title">最近项目</div>
        {recents.length === 0 ? (
          <div className="recent-empty">暂无最近项目，打开任意工具开始创作</div>
        ) : (
          <div className="recent">
            {recents.map((r) => {
              const tool = getTool(r.toolId);
              return (
                <div
                  key={r.id}
                  className="recent-row"
                  onClick={() => tool && navigate(`/tools/${tool.id}`)}
                >
                  <div
                    className="recent-thumb"
                    style={{ background: tool?.accent ?? 'var(--panel-3)' }}
                  >
                    <Icon name={tool?.icon ?? 'cube'} size={18} />
                  </div>
                  <div className="recent-name">{r.name}</div>
                  <div className="recent-meta">
                    {tool && <Chip tone="dim">{tool.name}</Chip>}
                    {r.detail && <span>{r.detail}</span>}
                    <span>{formatRelativeTime(r.openedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
