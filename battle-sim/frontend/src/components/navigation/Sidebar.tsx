import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

interface SidebarProps {
  backendOnline: boolean;
  onOpenShortcuts: () => void;
  onOpenPalette: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ backendOnline, onOpenShortcuts, onOpenPalette }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const navItems = [
    { to: '/', label: 'Overview', icon: '🏠', end: true },
    { to: '/heroes', label: 'Heroes Directory', icon: '🛡️' },
    { to: '/scenarios', label: 'Scenarios & Draft', icon: '⚔️' },
    { to: '/plan', label: 'Battle Plan', icon: '🎯' },
    { to: '/analytics', label: 'Analytics', icon: '📊' },
    { to: '/author', label: 'Scenario Author', icon: '🛠️' },
    { to: '/data', label: 'Data & Uploads', icon: '📁' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'is-collapsed' : ''}`} aria-label="Main navigation">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand" title="Puffcap Battle Simulator">
          <div className="sidebar-logo">PB</div>
          {!isCollapsed && <span>Puffcap Sim</span>}
        </Link>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="ui-btn ui-btn-ghost ui-btn-sm"
          onClick={onOpenPalette}
          title="Search / Command Palette (Ctrl+K)"
          style={{ width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <span>🔍</span>
          {!isCollapsed && <span>Search (Ctrl+K)</span>}
        </button>

        <button
          type="button"
          className="ui-btn ui-btn-ghost ui-btn-sm"
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (?)"
          style={{ width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <span>⌨️</span>
          {!isCollapsed && <span>Shortcuts (?)</span>}
        </button>

        {!isCollapsed && (
          <div className="backend-badge" title={backendOnline ? "Connected to deterministic engine" : "Backend unreachable"}>
            <div className={`status-dot ${backendOnline ? '' : 'offline'}`} />
            <span>{backendOnline ? 'ENGINE READY' : 'OFFLINE'}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
